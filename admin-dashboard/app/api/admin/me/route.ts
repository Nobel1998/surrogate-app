import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

// Get current admin user info (role and branch_id)
// Gets admin_user_id from session cookie
export async function GET(req: NextRequest) {
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
    // Get admin_user_id from cookie (preferred) or query param (fallback)
    const cookieStore = await cookies();
    const adminUserId = cookieStore.get('admin_user_id')?.value || req.nextUrl.searchParams.get('admin_user_id');

    if (!adminUserId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Fetch admin user
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id, name, role, branch_id, branch_manager_permission')
      .eq('id', adminUserId)
      .single();

    if (adminError) {
      console.error('[admin/me] Error fetching admin user:', adminError);
      return NextResponse.json(
        { error: 'Failed to fetch admin user' },
        { status: 500 }
      );
    }

    if (!adminUser) {
      return NextResponse.json(
        { error: 'Admin user not found' },
        { status: 404 }
      );
    }

    const role = (adminUser.role || '').toLowerCase();
    const perm = (adminUser.branch_manager_permission || 'view') as string;
    const canUpdate = role === 'admin' || (role === 'branch_manager' && perm === 'update');

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
      id: adminUser.id,
      name: adminUser.name,
      role: role,
      branch_id: adminUser.branch_id,
      branch: branch,
      canViewAllBranches: role === 'admin',
      canUpdate,
    });
  } catch (error: any) {
    console.error('[admin/me] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get admin info' },
      { status: 500 }
    );
  }
}
