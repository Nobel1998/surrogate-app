import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Disable caching to always reflect latest matches/profiles
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
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
    // Get admin user info from cookie (preferred) or query params (fallback)
    const cookieStore = await cookies();
    const url = new URL(req.url);
    const adminUserId = cookieStore.get('admin_user_id')?.value || url.searchParams.get('admin_user_id');
    let branchFilter: string | null = null;
    let canViewAllBranches = true;

    if (adminUserId) {
      // Fetch admin user to check permissions
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('id, role, branch_id')
        .eq('id', adminUserId)
        .single();

      if (!adminError && adminUser) {
        const role = (adminUser.role || '').toLowerCase();
        if (role === 'branch_manager') {
          // Branch manager can only see their branch
          branchFilter = adminUser.branch_id;
          canViewAllBranches = false;
        } else if (role === 'admin') {
          // Admin can see all branches
          canViewAllBranches = true;
        }
      }
    }

    console.log('[matches/options] fetching profiles and matches...', {
      adminUserId,
      branchFilter,
      canViewAllBranches,
    });

    // Get optional branch filter from query params (for admin filtering)
    const branchFilterParam = url.searchParams.get('branch_id');
    const effectiveBranchFilter = branchFilterParam || branchFilter;

    // Build queries - branch filtering is done on matches, not profiles
    let profilesQuery = supabase
      .from('profiles')
      .select('id, name, phone, role, email, progress_stage, stage_updated_by, transfer_date, transfer_embryo_day')
      .in('role', ['surrogate', 'parent']);

    let matchesQuery = supabase
      .from('surrogate_matches')
      .select(`
        id, 
        surrogate_id, 
        parent_id, 
        status, 
        created_at, 
        updated_at, 
        notes, 
        branch_id,
        claim_id,
        case_type,
        first_parent_id,
        first_parent_name,
        second_parent_id,
        second_parent_name,
        manager_id,
        current_step,
        weeks_pregnant,
        estimated_due_date,
        number_of_fetuses,
        fetal_beat_confirm,
        sign_date,
        transfer_date,
        beta_confirm_date,
        due_date,
        clinic,
        embryos,
        lawyer,
        company,
        files
      `);

    // Apply branch filter on matches only (profiles table doesn't have branch_id anymore)
    if (effectiveBranchFilter && effectiveBranchFilter !== 'all') {
      matchesQuery = matchesQuery.eq('branch_id', effectiveBranchFilter);
    }

    const [{ data: profiles, error: profilesError }, { data: matches, error: matchesError }] =
      await Promise.all([
        profilesQuery.order('created_at', { ascending: false }),
        matchesQuery.order('created_at', { ascending: false })
      ]);

    if (profilesError) throw profilesError;
    if (matchesError) throw matchesError;

    // Fetch managers for matches
    const matchIds = matches?.map((m: any) => m.id).filter(Boolean) || [];
    const matchManagers: Record<string, any[]> = {};
    
    if (matchIds.length > 0) {
      const { data: matchManagersData } = await supabase
        .from('match_managers')
        .select(`
          match_id,
          manager_id,
          manager:admin_users!match_managers_manager_id_fkey(id, name, role)
        `)
        .in('match_id', matchIds);

      if (matchManagersData) {
        matchManagersData.forEach((mm: any) => {
          if (!matchManagers[mm.match_id]) {
            matchManagers[mm.match_id] = [];
          }
          if (mm.manager) {
            matchManagers[mm.match_id].push(mm.manager);
          }
        });
      }
    }

    // Also fetch legacy manager_id for backward compatibility
    const managerIds = [...new Set(matches?.map((m: any) => m.manager_id).filter(Boolean) || [])];
    const managers: Record<string, any> = {};

    if (managerIds.length > 0) {
      const { data: managersData } = await supabase
        .from('admin_users')
        .select('id, name')
        .in('id', managerIds);

      if (managersData) {
        managersData.forEach((m: any) => {
          managers[m.id] = m;
        });
      }
    }

    // Enrich matches with managers
    const enrichedMatches = matches?.map((m: any) => {
      const managersList = matchManagers[m.id] || [];
      // If no managers from match_managers table, fall back to legacy manager_id
      if (managersList.length === 0 && m.manager_id && managers[m.manager_id]) {
        managersList.push(managers[m.manager_id]);
      }
      
      return {
        ...m,
        managers: managersList,
        manager_ids: managersList.map((mg: any) => mg.id),
        manager_name: managersList.length > 0 ? managersList.map((mg: any) => mg.name).join(', ') : null,
      };
    }) || [];

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
      matches: enrichedMatches?.length || 0,
      posts: posts.length,
      comments: comments.length,
      postLikes: postLikes.length,
      medicalReports: medicalReports.length,
      contracts: contractsData?.length || 0,
    });

    // Fetch branches for filter dropdown
    const { data: branches, error: branchesError } = await supabase
      .from('branches')
      .select('id, name, code')
      .order('name', { ascending: true });

    if (branchesError) {
      console.error('[matches/options] Error fetching branches:', branchesError);
    }

    return NextResponse.json({
      profiles,
      matches: enrichedMatches,
      posts,
      comments,
      postLikes,
      medicalReports,
      contracts: contractsData || [],
      branches: branches || [],
      currentBranchFilter: branchFilter,
      canViewAllBranches,
    });
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
    const cookieStore = await cookies();
    const adminUserId = cookieStore.get('admin_user_id')?.value;

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

    // Get branch_id from existing match if it exists, or set to null
    // Note: branch_id should be set when creating matches, but we don't have it in profiles anymore
    // For now, we'll set it to null and it can be updated later if needed
    const branchId = null;

    let matchId: string | null = null;

    if (existing?.id) {
      matchId = existing.id;
      const { error: updateError } = await supabase
        .from('surrogate_matches')
        .update({ status, notes, updated_at: new Date().toISOString(), branch_id: branchId })
        .eq('id', existing.id);
      if (updateError) throw updateError;
    } else {
      const { data: newMatch, error: insertError } = await supabase
        .from('surrogate_matches')
        .insert({
          surrogate_id: surrogateId,
          parent_id: parentId,
          status,
          notes,
          branch_id: branchId,
        })
        .select('id')
        .single();
      if (insertError) throw insertError;
      matchId = newMatch?.id || null;
    }

    // Auto-populate case fields if match was created and doesn't have claim_id yet
    if (matchId && !existing) {
      // Generate claim_id: MATCH-{matchId的前8位}
      const claimId = `MATCH-${matchId.substring(0, 8).toUpperCase()}`;
      
      // Get branch_id from admin user if available
      let effectiveBranchId = branchId;
      if (!effectiveBranchId && adminUserId) {
        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('branch_id')
          .eq('id', adminUserId)
          .single();
        if (adminUser?.branch_id) {
          effectiveBranchId = adminUser.branch_id;
        }
      }

      // Update match with case fields
      const { error: updateError } = await supabase
        .from('surrogate_matches')
        .update({
          claim_id: claimId,
          first_parent_id: parentId,
          case_type: 'Surrogacy',
          branch_id: effectiveBranchId,
          status: status || 'active',
          created_by: adminUserId || null,
        })
        .eq('id', matchId);

      if (updateError) {
        console.error('Error updating match with case fields:', updateError);
        // Don't throw - match creation succeeded, case field update is optional
      } else {
        console.log('✅ Updated match with case fields:', matchId, 'claim_id:', claimId);
      }
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

