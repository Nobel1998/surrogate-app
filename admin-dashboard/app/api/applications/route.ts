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

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

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

