import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

/**
 * GET: List online claim submissions for admin.
 * Query: surrogate_id (filter by surrogate) or match_id (filter by match). If neither, returns all.
 */
export async function GET(req: Request) {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { searchParams } = new URL(req.url);
    const surrogateId = searchParams.get('surrogate_id');
    const matchId = searchParams.get('match_id');

    let query = supabase
      .from('online_claim_submissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (surrogateId) query = query.eq('user_id', surrogateId);
    if (matchId) query = query.eq('match_id', matchId);

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error('[matches/online-claim-submissions] GET error', err);
    return NextResponse.json({ error: err.message || 'Failed to list submissions' }, { status: 500 });
  }
}
