import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

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

    // Fetch related profiles
    const profileIds = [
      caseData.surrogate_id,
      caseData.first_parent_id,
      caseData.second_parent_id,
    ].filter(Boolean);

    const profiles: Record<string, any> = {};
    if (profileIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name, phone, email, date_of_birth, location')
        .in('id', profileIds);

      if (profilesData) {
        profilesData.forEach(p => {
          profiles[p.id] = p;
        });
      }
    }

    // Fetch manager
    let manager = null;
    if (caseData.manager_id) {
      const { data: managerData } = await supabase
        .from('admin_users')
        .select('id, name')
        .eq('id', caseData.manager_id)
        .single();

      if (managerData) {
        manager = managerData;
      }
    }

    // Fetch case steps
    const { data: steps } = await supabase
      .from('case_steps')
      .select('*')
      .eq('case_id', caseId)
      .order('stage_number', { ascending: true })
      .order('step_number', { ascending: true });

    // Fetch case updates
    const { data: updates } = await supabase
      .from('case_updates')
      .select(`
        *,
        updated_by_user:admin_users!case_updates_updated_by_fkey(id, name)
      `)
      .eq('case_id', caseId)
      .order('created_at', { ascending: false });

    // Use manually entered name if available, otherwise use linked profile
    const firstParent = caseData.first_parent_id ? profiles[caseData.first_parent_id] : null;
    const secondParent = caseData.second_parent_id ? profiles[caseData.second_parent_id] : null;
    
    return NextResponse.json({
      case: {
        ...caseData,
        surrogate: caseData.surrogate_id ? profiles[caseData.surrogate_id] : null,
        first_parent: firstParent ? {
          ...firstParent,
          display_name: caseData.first_parent_name || firstParent.name
        } : (caseData.first_parent_name ? { name: caseData.first_parent_name, display_name: caseData.first_parent_name } : null),
        second_parent: secondParent ? {
          ...secondParent,
          display_name: caseData.second_parent_name || secondParent.name
        } : (caseData.second_parent_name ? { name: caseData.second_parent_name, display_name: caseData.second_parent_name } : null),
        manager,
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

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const cookieStore = await cookies();
    const adminUserId = cookieStore.get('admin_user_id')?.value;
    const { id: matchId } = await params;
    const body = await req.json();

    const { error: updateError } = await supabase
      .from('surrogate_matches')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
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
