import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    const { data: submissions, error: submissionsError } = await supabase
      .from('referral_submissions')
      .select('*')
      .order('created_at', { ascending: false });

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
