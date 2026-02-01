import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getAdminCanUpdate } from '@/lib/adminAuth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

// GET single case with details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id: matchId } = await params;

    // Fetch match (which now contains all case data)
    const { data: matchData, error: matchError } = await supabase
      .from('surrogate_matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (matchError || !matchData) {
      return NextResponse.json(
        { error: 'Match/Case not found' },
        { status: 404 }
      );
    }

    // Fetch related profiles (including progress_stage and transfer_date for surrogate)
    const profileIds = [
      matchData.surrogate_id,
      matchData.first_parent_id,
      matchData.second_parent_id,
      matchData.parent_id,
    ].filter(Boolean);

    const profiles: Record<string, any> = {};
    if (profileIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name, phone, email, date_of_birth, location, progress_stage, transfer_date')
        .in('id', profileIds);

      if (profilesData) {
        profilesData.forEach(p => {
          profiles[p.id] = p;
        });
      }
    }

    // Get surrogate's progress_stage as current_step and transfer_date
    const surrogateProfile = matchData.surrogate_id ? profiles[matchData.surrogate_id] : null;
    const currentStep = matchData.current_step || surrogateProfile?.progress_stage || null;
    const transferDate = matchData.transfer_date || surrogateProfile?.transfer_date || null;

    // Fetch all managers assigned to this match (from match_managers table)
    const { data: matchManagersData } = await supabase
      .from('match_managers')
      .select(`
        manager_id,
        admin_users!match_managers_manager_id_fkey(id, name)
      `)
      .eq('match_id', matchId);

    // Extract managers from the result
    const managers: Array<{ id: string; name: string }> = [];
    if (matchManagersData) {
      matchManagersData.forEach((mm: any) => {
        if (mm.admin_users) {
          managers.push({
            id: mm.admin_users.id,
            name: mm.admin_users.name,
          });
        }
      });
    }

    // For backward compatibility, also check legacy manager_id
    let manager = null;
    if (managers.length > 0) {
      // Use the first manager for backward compatibility
      manager = managers[0];
    } else if (matchData.manager_id) {
      const { data: managerData } = await supabase
        .from('admin_users')
        .select('id, name')
        .eq('id', matchData.manager_id)
        .single();

      if (managerData) {
        manager = managerData;
      }
    }

    // Fetch match steps
    const { data: steps } = await supabase
      .from('match_steps')
      .select('*')
      .eq('match_id', matchId)
      .order('stage_number', { ascending: true })
      .order('step_number', { ascending: true });

    // Fetch match updates
    const { data: updates } = await supabase
      .from('match_updates')
      .select(`
        *,
        updated_by_user:admin_users!match_updates_updated_by_fkey(id, name)
      `)
      .eq('match_id', matchId)
      .order('created_at', { ascending: false });

    // Use manually entered name if available, otherwise use linked profile
    const firstParent = matchData.first_parent_id ? profiles[matchData.first_parent_id] : null;
    const secondParent = matchData.second_parent_id ? profiles[matchData.second_parent_id] : null;
    
    return NextResponse.json({
      case: {
        ...matchData,
        current_step: currentStep, // Use surrogate's progress_stage if current_step not set
        transfer_date: transferDate, // Use surrogate's transfer_date if not set in match
        surrogate: matchData.surrogate_id ? profiles[matchData.surrogate_id] : null,
        first_parent: firstParent ? {
          ...firstParent,
          display_name: matchData.first_parent_name || firstParent.name
        } : (matchData.first_parent_name ? { name: matchData.first_parent_name, display_name: matchData.first_parent_name } : null),
        second_parent: secondParent ? {
          ...secondParent,
          display_name: matchData.second_parent_name || secondParent.name
        } : (matchData.second_parent_name ? { name: matchData.second_parent_name, display_name: matchData.second_parent_name } : null),
        manager,
        managers, // Include all managers array
      },
      steps: steps || [],
      updates: updates || [],
    });
  } catch (error: any) {
    console.error('[cases/[id]] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load case' },
      { status: 500 }
    );
  }
}

// PATCH update case
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase env vars' },
      { status: 500 }
    );
  }

  const cookieStore = await cookies();
  const adminUserId = cookieStore.get('admin_user_id')?.value;
  const perm = await getAdminCanUpdate(adminUserId);
  if (!perm.canUpdate && 'error' in perm) {
    return NextResponse.json({ error: perm.error }, { status: 401 });
  }
  if (!perm.canUpdate) {
    return NextResponse.json(
      { error: 'View-only branch managers cannot update cases.' },
      { status: 403 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { id: matchId } = await params;
    const body = await req.json();

    const updateData = {
      ...body,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from('surrogate_matches')
      .update(updateData)
      .eq('id', matchId);

    if (updateError) {
      console.error('[cases/[id]] PATCH error:', updateError);
      return NextResponse.json(
        { error: updateError.message || 'Failed to update case' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[cases/[id]] PATCH error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update case' },
      { status: 500 }
    );
  }
}

// DELETE case
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase env vars' },
      { status: 500 }
    );
  }

  const cookieStore = await cookies();
  const adminUserId = cookieStore.get('admin_user_id')?.value;
  const perm = await getAdminCanUpdate(adminUserId);
  if (!perm.canUpdate && 'error' in perm) {
    return NextResponse.json({ error: perm.error }, { status: 401 });
  }
  if (!perm.canUpdate) {
    return NextResponse.json(
      { error: 'View-only branch managers cannot delete cases.' },
      { status: 403 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { id: matchId } = await params;

    const { error: deleteError } = await supabase
      .from('surrogate_matches')
      .delete()
      .eq('id', matchId);

    if (deleteError) {
      console.error('[cases/[id]] DELETE error:', deleteError);
      return NextResponse.json(
        { error: deleteError.message || 'Failed to delete case' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[cases/[id]] DELETE error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete case' },
      { status: 500 }
    );
  }
}
