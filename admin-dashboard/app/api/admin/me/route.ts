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

    // Fetch admin user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, role, branch_id')
      .eq('id', adminUserId)
      .single();

    if (profileError) {
      console.error('[admin/me] Error fetching profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch admin profile' },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'Admin user not found' },
        { status: 404 }
      );
    }

    // Check if user is admin or branch_manager
    const role = (profile.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'branch_manager') {
      return NextResponse.json(
        { error: 'User is not an admin or branch manager' },
        { status: 403 }
      );
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
      id: profile.id,
      name: profile.name,
      role: role,
      branch_id: profile.branch_id,
      branch: branch,
      canViewAllBranches: role === 'admin',
    });
  } catch (error: any) {
    console.error('[admin/me] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get admin info' },
      { status: 500 }
    );
  }
}
