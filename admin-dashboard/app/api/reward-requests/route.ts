import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET all reward requests with user profiles
export async function GET() {
  try {
    const { data: requests, error: requestsError } = await supabase
      .from('reward_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (requestsError) {
      console.error('Error fetching reward requests:', requestsError);
      return NextResponse.json(
        { error: 'Failed to fetch reward requests', details: requestsError.message },
        { status: 500 }
      );
    }

    // Fetch user profiles to get names
    const userIds = [...new Set(requests?.map((r) => r.user_id) || [])];
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      // Continue even if profiles fail
    }

    const profileMap = new Map((profiles || []).map((p) => [p.id, p.name || 'Unknown']));

    // Combine requests with user names
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
  try {
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
