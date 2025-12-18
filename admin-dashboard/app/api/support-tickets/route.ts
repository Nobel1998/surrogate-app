import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // Fetch all support tickets with user information
    const { data: tickets, error: ticketsError } = await supabase
      .from('support_tickets')
      .select(`
        id,
        user_id,
        subject,
        message,
        status,
        admin_response,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (ticketsError) throw ticketsError;

    // Fetch user profiles for tickets
    const userIds = [...new Set(tickets?.map(t => t.user_id) || [])];
    const profiles: Record<string, any> = {};
    
    if (userIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, phone, email, role')
        .in('id', userIds);

      if (!profilesError && profilesData) {
        profilesData.forEach(p => {
          profiles[p.id] = p;
        });
      }
    }

    // Combine tickets with user information
    const ticketsWithUsers = tickets?.map(ticket => ({
      ...ticket,
      user: profiles[ticket.user_id] || null,
    })) || [];

    return NextResponse.json({ tickets: ticketsWithUsers });
  } catch (err: any) {
    console.error('[support-tickets] GET error', err);
    return NextResponse.json({ error: err.message || 'Failed to load support tickets' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const body = await req.json();
    const { id, status, admin_response } = body;

    if (!id) {
      return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 });
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (status) {
      updateData.status = status;
    }

    if (admin_response !== undefined) {
      updateData.admin_response = admin_response;
    }

    const { error } = await supabase
      .from('support_tickets')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[support-tickets] PATCH error', err);
    return NextResponse.json({ error: err.message || 'Failed to update support ticket' }, { status: 500 });
  }
}


