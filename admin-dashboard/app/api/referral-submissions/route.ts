import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

/** GET: list all referral submissions (admin only, service role) */
export async function GET() {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data, error } = await supabase
      .from('referral_submissions')
      .select('id, referrer_user_id, referrer_name, referrer_email, referred_surrogate_name, referred_surrogate_phone, referred_surrogate_email, notes, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ submissions: data || [] });
  } catch (err: unknown) {
    console.error('[referral-submissions] GET error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load referral submissions' },
      { status: 500 }
    );
  }
}
