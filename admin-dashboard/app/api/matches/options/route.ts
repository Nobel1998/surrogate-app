import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Disable caching to always reflect latest matches/profiles
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase env vars' },
      { status: 500 }
    );
  }

  // Runtime env quick check (does not log secret value)
  console.log('[matches/options] env check', {
    supabaseUrl,
    hasServiceKey: !!serviceKey,
  });

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    console.log('[matches/options] fetching profiles and matches...');
    const [{ data: profiles, error: profilesError }, { data: matches, error: matchesError }] =
      await Promise.all([
        supabase
          .from('profiles')
          .select('id, name, phone, role, email, progress_stage, stage_updated_by')
          .in('role', ['surrogate', 'parent'])
          .order('created_at', { ascending: false }),
        supabase
          .from('surrogate_matches')
          .select('id, surrogate_id, parent_id, status, created_at, updated_at, notes')
          .order('created_at', { ascending: false })
      ]);

    if (profilesError) throw profilesError;
    if (matchesError) throw matchesError;

    // 拉取所有代母的帖子，供后台展示（不仅仅是匹配的代母）
    const allSurrogateIds = Array.from(
      new Set(
        (profiles || [])
          .filter((p: any) => (p.role || '').toLowerCase() === 'surrogate')
          .map((p: any) => p.id)
          .filter(Boolean)
      )
    );
    console.log('[matches/options] allSurrogateIds for posts', allSurrogateIds);

    let posts: any[] = [];
    let comments: any[] = [];
    let postLikes: any[] = [];
    let medicalReports: any[] = [];

    if (allSurrogateIds.length > 0) {
      console.log('[matches/options] fetching posts for all surrogates...');
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('id, user_id, content, media_uri, media_type, stage, created_at')
        .in('user_id', allSurrogateIds)
        .order('created_at', { ascending: false })
        .limit(1000); // Add limit to prevent timeout
      if (postsError) {
        console.error('[matches/options] load posts error', postsError);
      } else {
        posts = postsData || [];
        console.log('[matches/options] loaded posts', posts.length);
      }

      const postIds = posts.map((p) => p.id).filter(Boolean);
      console.log('[matches/options] loaded posts count', posts.length, 'postIds', postIds.length);
      if (postIds.length > 0) {
        const [{ data: commentsData, error: commentsError }, { data: likesData, error: likesError }] =
          await Promise.all([
            supabase
              .from('comments')
              .select('id, post_id')
              .in('post_id', postIds),
            supabase
              .from('post_likes')
              .select('id, post_id')
              .in('post_id', postIds),
          ]);
        if (commentsError) {
          console.error('[matches/options] load comments error', commentsError);
        } else {
          comments = commentsData || [];
        }
        if (likesError) {
          console.error('[matches/options] load post likes error', likesError);
        } else {
          postLikes = likesData || [];
        }
        console.log('[matches/options] comments count', comments.length, 'likes count', postLikes.length);
      }

      // Fetch medical reports for all surrogates
      console.log('[matches/options] fetching medical reports for all surrogates...');
      const { data: reportsData, error: reportsError } = await supabase
        .from('medical_reports')
        .select('id, user_id, visit_date, provider_name, stage, report_data, proof_image_url, created_at')
        .in('user_id', allSurrogateIds)
        .order('visit_date', { ascending: false })
        .limit(1000);
      if (reportsError) {
        console.error('[matches/options] load medical reports error', reportsError);
      } else {
        medicalReports = reportsData || [];
        console.log('[matches/options] loaded medical reports', medicalReports.length);
      }
    }

    // Fetch all contracts and documents (parent_contract, surrogate_contract, legal_contract, insurance_policy, health_insurance_bill, parental_rights, online_claims)
    console.log('[matches/options] fetching contracts and documents...');
    let contractsData: any[] = [];
    const { data: contractsDataResult, error: contractsError } = await supabase
      .from('documents')
      .select('id, user_id, document_type, file_url, file_name, created_at')
      .in('document_type', ['parent_contract', 'surrogate_contract', 'legal_contract', 'insurance_policy', 'health_insurance_bill', 'parental_rights', 'online_claims', 'agency_retainer', 'hipaa_release', 'photo_release'])
      .order('created_at', { ascending: false })
      .limit(1000);
    if (contractsError) {
      console.error('[matches/options] load contracts error', contractsError);
    } else {
      contractsData = contractsDataResult || [];
      console.log('[matches/options] loaded contracts', contractsData.length);
    }

    console.log('[matches/options] returning payload', {
      profiles: profiles?.length || 0,
      matches: matches?.length || 0,
      posts: posts.length,
      comments: comments.length,
      postLikes: postLikes.length,
      medicalReports: medicalReports.length,
      contracts: contractsData?.length || 0,
    });

    return NextResponse.json({ profiles, matches, posts, comments, postLikes, medicalReports, contracts: contractsData || [] });
  } catch (error: any) {
    console.error('Error loading match options:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load options' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase env vars' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const body = await req.json();
    const surrogateId = body.surrogate_id;
    const parentId = body.parent_id;
    if (!surrogateId || !parentId) {
      return NextResponse.json(
        { error: 'surrogate_id and parent_id are required' },
        { status: 400 }
      );
    }

    const status = body.status || 'active';
    const notes = body.notes || null;

    // Manual upsert: check existing pair first
    const { data: existing, error: findError } = await supabase
      .from('surrogate_matches')
      .select('id')
      .eq('surrogate_id', surrogateId)
      .eq('parent_id', parentId)
      .limit(1)
      .maybeSingle();

    if (findError) throw findError;

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from('surrogate_matches')
        .update({ status, notes, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('surrogate_matches')
        .insert({
          surrogate_id: surrogateId,
          parent_id: parentId,
          status,
          notes,
        });
      if (insertError) throw insertError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error creating match:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create match' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase env vars' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const body = await req.json();
    // Support two patch modes:
    // 1) Update match status (body.id + status)
    // 2) Update surrogate progress stage (body.surrogate_id + progress_stage)
    if (body.surrogate_id && body.progress_stage) {
      const updater = body.stage_updated_by || 'admin';
      const { error } = await supabase
        .from('profiles')
        .update({ progress_stage: body.progress_stage, stage_updated_by: updater })
        .eq('id', body.surrogate_id);
      if (error) throw error;
    } else {
      if (!body.id) {
        return NextResponse.json(
          { error: 'Missing match id' },
          { status: 400 }
        );
      }

      const { error } = await supabase
        .from('surrogate_matches')
        .update({ status: body.status || 'active', updated_at: new Date().toISOString() })
        .eq('id', body.id);

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating match status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update match status' },
      { status: 500 }
    );
  }
}

