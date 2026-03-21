import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getAdminSession,
  canListAllApplicationsOrProfiles,
  canFetchApplicationsByUserId,
  type AdminSessionResult,
} from '@/lib/adminSession';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

function denyIntendedParentMutation(session: AdminSessionResult): NextResponse | null {
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }
  if (!canListAllApplicationsOrProfiles(session.role)) {
    return NextResponse.json(
      { error: 'Only admins and finance managers can modify intended parent applications.' },
      { status: 403 }
    );
  }
  return null;
}

export async function GET(req: NextRequest) {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase env vars' },
      { status: 500 }
    );
  }

  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('user_id');

  if (userId) {
    if (!canFetchApplicationsByUserId(session.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to load intended parent applications for this user.' },
        { status: 403 }
      );
    }
  } else {
    if (!canListAllApplicationsOrProfiles(session.role)) {
      return NextResponse.json(
        { error: 'Branch managers cannot list all intended parent applications.' },
        { status: 403 }
      );
    }
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    let query = supabase
      .from('intended_parent_applications')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (error: any) {
    console.error('[intended-parent-applications] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch intended parent applications' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase env vars' },
      { status: 500 }
    );
  }

  const session = await getAdminSession();
  const denied = denyIntendedParentMutation(session);
  if (denied) return denied;

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('intended_parent_applications')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('[intended-parent-applications] PATCH error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update application' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase env vars' },
      { status: 500 }
    );
  }

  const session = await getAdminSession();
  const denied = denyIntendedParentMutation(session);
  if (denied) return denied;

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('intended_parent_applications')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[intended-parent-applications] DELETE error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete application' },
      { status: 500 }
    );
  }
}
