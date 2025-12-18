import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

// GET all branches
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
    const { data: branches, error: branchesError } = await supabase
      .from('branches')
      .select('id, name, code, address, phone, email')
      .order('name', { ascending: true });

    if (branchesError) throw branchesError;

    return NextResponse.json({ branches: branches || [] });
  } catch (error: any) {
    console.error('[branches] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load branches' },
      { status: 500 }
    );
  }
}
