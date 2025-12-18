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

    // Verify admin user still exists
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id, name, role, branch_id')
      .eq('id', adminUserId)
      .single();

    if (adminError || !adminUser) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const role = (adminUser.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'branch_manager') {
      return NextResponse.json({ authenticated: false }, { status: 403 });
    }

    // If branch_manager, fetch branch info
    let branch = null;
    if (role === 'branch_manager' && adminUser.branch_id) {
      const { data: branchData, error: branchError } = await supabase
        .from('branches')
        .select('id, name, code')
        .eq('id', adminUser.branch_id)
        .single();

      if (!branchError && branchData) {
        branch = branchData;
      }
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: adminUser.id,
        name: adminUser.name,
        role: role,
        branch_id: adminUser.branch_id,
        branch: branch,
        canViewAllBranches: role === 'admin',
      },
    });
  } catch (error: any) {
    console.error('[auth/check] Error:', error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
