import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getAccessibleMatchIds, getPartyUserIdsForMatches } from '@/lib/managerMatchScope';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// GET all reward requests with user profiles
export async function GET() {
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const cookieStore = await cookies();
    const adminUserId = cookieStore.get('admin_user_id')?.value;
    if (!adminUserId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const { data: adminUser, error: adminErr } = await supabase
      .from('admin_users')
      .select('id, role')
      .eq('id', adminUserId)
      .single();
    if (adminErr || !adminUser) {
      return NextResponse.json({ error: 'Invalid admin session' }, { status: 401 });
    }

    const role = (adminUser.role || '').toLowerCase();
    if (role === 'finance_manager') {
      return NextResponse.json(
        { error: 'Finance manager cannot access this section.' },
        { status: 403 }
      );
    }
    const accessible = await getAccessibleMatchIds(supabase, adminUser.id, role);

    let reqQuery = supabase.from('reward_requests').select('*').order('created_at', { ascending: false });

    if (accessible !== null) {
      if (accessible.length === 0) {
        return NextResponse.json({ requests: [] });
      }
      const party = await getPartyUserIdsForMatches(supabase, accessible);
      const partyIds = [...party];
      if (partyIds.length === 0) {
        return NextResponse.json({ requests: [] });
      }
      reqQuery = reqQuery.in('user_id', partyIds);
    }

    const { data: requests, error: requestsError } = await reqQuery;

    if (requestsError) {
      console.error('Error fetching reward requests:', requestsError);
      return NextResponse.json(
        { error: 'Failed to fetch reward requests', details: requestsError.message },
        { status: 500 }
      );
    }

    const userIds = [...new Set(requests?.map((r) => r.user_id) || [])];
    let profileMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      } else {
        profileMap = new Map((profiles || []).map((p) => [p.id, p.name || 'Unknown']));
      }
    }

    const requestsWithNames = (requests || []).map((request) => ({
      ...request,
      user_name: profileMap.get(request.user_id) || 'Unknown',
    }));

    return NextResponse.json({ requests: requestsWithNames });
  } catch (error: any) {
    console.error('Error in GET reward requests:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH update reward request status
export async function PATCH(request: NextRequest) {
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const cookieStore = await cookies();
    const adminUserId = cookieStore.get('admin_user_id')?.value;
    if (!adminUserId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const { data: adminUser, error: adminErr } = await supabase
      .from('admin_users')
      .select('id, role')
      .eq('id', adminUserId)
      .single();
    if (adminErr || !adminUser) {
      return NextResponse.json({ error: 'Invalid admin session' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, notes } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Request ID and status are required' },
        { status: 400 }
      );
    }

    if (!['pending', 'approved', 'rejected', 'paid'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "pending", "approved", "rejected", or "paid"' },
        { status: 400 }
      );
    }

    const role = (adminUser.role || '').toLowerCase();
    if (role === 'finance_manager') {
      return NextResponse.json(
        { error: 'Finance manager cannot access this section.' },
        { status: 403 }
      );
    }
    const accessible = await getAccessibleMatchIds(supabase, adminUser.id, role);
    if (accessible !== null) {
      if (accessible.length === 0) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const party = await getPartyUserIdsForMatches(supabase, accessible);
      const { data: row, error: rErr } = await supabase
        .from('reward_requests')
        .select('user_id')
        .eq('id', id)
        .single();
      if (rErr || !row || !party.has(row.user_id)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const updateData: any = {
      status,
      processed_at: new Date().toISOString(),
    };

    if (body.admin_notes !== undefined) {
      updateData.admin_notes = body.admin_notes;
    }
    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }

    const { error: updateError } = await supabase
      .from('reward_requests')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      console.error('Error updating reward request:', updateError);
      return NextResponse.json(
        { error: 'Failed to update reward request', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in PATCH reward request:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
