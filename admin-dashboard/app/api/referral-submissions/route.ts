import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getAccessibleMatchIds, getPartyUserIdsForMatches } from '@/lib/managerMatchScope';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

export async function GET() {
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

    let subQuery = supabase.from('referral_submissions').select('*').order('created_at', { ascending: false });

    if (accessible !== null) {
      if (accessible.length === 0) {
        return NextResponse.json({ submissions: [] });
      }
      const party = await getPartyUserIdsForMatches(supabase, accessible);
      const partyIds = [...party];
      if (partyIds.length === 0) {
        return NextResponse.json({ submissions: [] });
      }
      subQuery = subQuery.in('referrer_user_id', partyIds);
    }

    const { data: submissions, error: submissionsError } = await subQuery;

    if (submissionsError) throw submissionsError;

    return NextResponse.json({ submissions: submissions || [] });
  } catch (error: any) {
    console.error('[referral-submissions] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load referral submissions' },
      { status: 500 }
    );
  }
}
