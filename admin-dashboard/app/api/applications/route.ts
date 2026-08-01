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

function parseFormData(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return { ...(raw as Record<string, unknown>) };
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
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

/** Admin-only full edit of surrogate application form_data. */
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
    const { id, form_data: incomingFormData } = body || {};

    if (!id) {
      return NextResponse.json({ error: 'Application ID is required' }, { status: 400 });
    }
    if (!incomingFormData || typeof incomingFormData !== 'object' || Array.isArray(incomingFormData)) {
      return NextResponse.json(
        { error: 'form_data object is required for full application edit.' },
        { status: 400 }
      );
    }

    const { data: existing, error: fetchError } = await supabase
      .from('applications')
      .select('id, form_data')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const formData = { ...parseFormData(existing.form_data), ...incomingFormData };

    const fullName =
      (typeof formData.fullName === 'string' && formData.fullName.trim()) ||
      [formData.firstName, formData.middleName, formData.lastName]
        .filter((part) => typeof part === 'string' && part.trim())
        .join(' ')
        .trim() ||
      null;
    const phone =
      (typeof formData.phoneNumber === 'string' && formData.phoneNumber.trim()) ||
      (typeof formData.phone === 'string' && formData.phone.trim()) ||
      null;

    const { data, error } = await supabase
      .from('applications')
      .update({
        form_data: JSON.stringify(formData),
        ...(fullName ? { full_name: fullName } : {}),
        ...(phone ? { phone } : {}),
      })
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
