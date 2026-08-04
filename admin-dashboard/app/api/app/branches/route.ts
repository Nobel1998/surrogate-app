import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

/**
 * Public contact list for the mobile app Contact Us screen.
 * Returns only non-sensitive office fields from branches.
 */
export async function GET() {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data: branches, error } = await supabase
      .from('branches')
      .select('id, name, code, address, phone, email')
      .order('name', { ascending: true });

    if (error) throw error;

    return NextResponse.json(
      { branches: branches || [] },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load branches';
    console.error('[api/app/branches] GET error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
