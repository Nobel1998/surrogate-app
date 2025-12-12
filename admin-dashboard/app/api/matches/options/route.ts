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
    const [{ data: profiles, error: profilesError }, { data: matches, error: matchesError }] =
      await Promise.all([
        supabase
          .from('profiles')
          .select('id, name, phone, role, email')
          .in('role', ['surrogate', 'parent'])
          .order('created_at', { ascending: false }),
        supabase
          .from('surrogate_matches')
          .select('id, surrogate_id, parent_id, status, created_at, updated_at, notes')
          .order('created_at', { ascending: false })
      ]);

    if (profilesError) throw profilesError;
    if (matchesError) throw matchesError;

    // === Debug + load surrogate posts/likes/comments from Supabase tables ===
    const surrogateIds = Array.from(
      new Set((matches || []).map((m: any) => m.surrogate_id).filter(Boolean))
    );

    console.log('[matches/options] loaded matches', {
      profiles: profiles?.length || 0,
      matches: matches?.length || 0,
      surrogateIds: surrogateIds.length,
      sampleSurrogateId: surrogateIds?.[0],
    });

    let posts: any[] = [];
    let postLikes: any[] = [];
    let comments: any[] = [];

    if (surrogateIds.length > 0) {
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        // posts 表字段：id, user_id, user_name, content, media_uri, media_type, likes, comments_count, created_at, updated_at, stage
        .select('id, user_id, user_name, content, media_uri, media_type, likes, comments_count, created_at, updated_at, stage')
        .in('user_id', surrogateIds)
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error('[matches/options] posts query error', postsError);
      } else {
        posts = postsData || [];
      }

      const postIds = posts.map((p: any) => p.id).filter(Boolean);
      console.log('[matches/options] posts loaded', { count: posts.length, postIds: postIds.length });

      if (postIds.length > 0) {
        const [
          { data: likesData, error: likesError },
          { data: commentsData, error: commentsError },
        ] = await Promise.all([
          supabase.from('post_likes').select('id, post_id, user_id').in('post_id', postIds),
          supabase.from('comments').select('id, post_id').in('post_id', postIds),
        ]);

        if (likesError) console.error('[matches/options] post_likes query error', likesError);
        else postLikes = likesData || [];

        if (commentsError) console.error('[matches/options] comments query error', commentsError);
        else comments = commentsData || [];

        console.log('[matches/options] likes/comments loaded', {
          likes: postLikes.length,
          comments: comments.length,
        });
      }
    }

    console.log('[matches/options] returning', {
      profiles: profiles?.length || 0,
      matches: matches?.length || 0,
      posts: posts.length,
      postLikes: postLikes.length,
      comments: comments.length,
    });

    return NextResponse.json({ profiles, matches, posts, postLikes, comments });
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

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating match status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update match status' },
      { status: 500 }
    );
  }
}

