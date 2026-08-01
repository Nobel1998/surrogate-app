import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getAdminSession,
  canListAllApplicationsOrProfiles,
  canFetchApplicationsByUserId,
} from '@/lib/adminSession';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

function createServiceClient() {
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
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
        { error: 'You do not have permission to load applications for this user.' },
        { status: 403 }
      );
    }
  } else {
    if (!canListAllApplicationsOrProfiles(session.role)) {
      return NextResponse.json(
        { error: 'Branch managers cannot list all applications. Use a user filter from Matches.' },
        { status: 403 }
      );
    }
  }

  const supabase = createServiceClient();

  try {
    let query = supabase
      .from('applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (error: any) {
    console.error('[applications] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}

/** Admin-only edit of surrogate application contact / basic form fields. */
export async function PATCH(req: NextRequest) {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 });
  }

  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }
  if (session.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only admins can edit applications.' },
      { status: 403 }
    );
  }

  const supabase = createServiceClient();

  try {
    const body = await req.json();
    const { id, full_name, phone, email, location, age, dateOfBirth } = body || {};

    if (!id) {
      return NextResponse.json({ error: 'Application ID is required' }, { status: 400 });
    }

    const { data: existing, error: fetchError } = await supabase
      .from('applications')
      .select('id, form_data, full_name, phone')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    let formData: Record<string, unknown> = {};
    try {
      formData =
        typeof existing.form_data === 'string'
          ? JSON.parse(existing.form_data || '{}')
          : existing.form_data || {};
    } catch {
      formData = {};
    }

    if (typeof full_name === 'string') {
      formData.fullName = full_name.trim();
    }
    if (typeof phone === 'string') {
      formData.phoneNumber = phone.trim();
    }
    if (typeof email === 'string') {
      formData.email = email.trim();
    }
    if (typeof location === 'string') {
      formData.location = location.trim();
    }
    if (typeof age === 'string' || typeof age === 'number') {
      formData.age = String(age).trim();
    }
    if (typeof dateOfBirth === 'string') {
      formData.dateOfBirth = dateOfBirth.trim();
    }

    const updateRow: Record<string, unknown> = {
      form_data: JSON.stringify(formData),
    };
    if (typeof full_name === 'string') {
      updateRow.full_name = full_name.trim();
    }
    if (typeof phone === 'string') {
      updateRow.phone = phone.trim();
    }

    const { data, error } = await supabase
      .from('applications')
      .update(updateRow)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('[applications] PATCH error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update application' },
      { status: 500 }
    );
  }
}
