import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
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
    const cookieStore = await cookies();
    const adminUserId = cookieStore.get('admin_user_id')?.value;

    if (!adminUserId) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Verify user still exists and is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, role, branch_id')
      .eq('id', adminUserId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const role = (profile.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'branch_manager') {
      return NextResponse.json({ authenticated: false }, { status: 403 });
    }

    // If branch_manager, fetch branch info
    let branch = null;
    if (role === 'branch_manager' && profile.branch_id) {
      const { data: branchData, error: branchError } = await supabase
        .from('branches')
        .select('id, name, code')
        .eq('id', profile.branch_id)
        .single();

      if (!branchError && branchData) {
        branch = branchData;
      }
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: profile.id,
        name: profile.name,
        role: role,
        branch_id: profile.branch_id,
        branch: branch,
        canViewAllBranches: role === 'admin',
      },
    });
  } catch (error: any) {
    console.error('[auth/check] Error:', error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
