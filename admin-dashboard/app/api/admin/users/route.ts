import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

// GET all admin users (for manager selection)
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
    const { data: adminUsers, error: adminError } = await supabase
      .from('admin_users')
      .select('id, name, role')
      .order('name', { ascending: true });

    if (adminError) throw adminError;

    return NextResponse.json({ users: adminUsers || [] });
  } catch (error: any) {
    console.error('[admin/users] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load admin users' },
      { status: 500 }
    );
  }
}
