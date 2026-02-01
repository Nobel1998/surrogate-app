import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export type AdminPermissionResult = {
  canUpdate: boolean;
  role: string;
  branch_id: string | null;
  branch_manager_permission: 'view' | 'update' | null;
};

/**
 * Get admin user and compute canUpdate.
 * - admin: canUpdate = true
 * - branch_manager with permission 'update': canUpdate = true
 * - branch_manager with permission 'view' or null: canUpdate = false
 */
export async function getAdminCanUpdate(
  adminUserId: string | undefined
): Promise<{ canUpdate: boolean; supabase: SupabaseClient; adminUser?: AdminPermissionResult } | { canUpdate: false; error: string }> {
  if (!supabaseUrl || !serviceKey) {
    return { canUpdate: false, error: 'Missing Supabase env vars' };
  }
  if (!adminUserId) {
    return { canUpdate: false, error: 'Unauthorized' };
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: adminUser, error } = await supabase
    .from('admin_users')
    .select('id, role, branch_id, branch_manager_permission')
    .eq('id', adminUserId)
    .single();

  if (error || !adminUser) {
    return { canUpdate: false, error: 'Admin user not found' };
  }

  const role = (adminUser.role || '').toLowerCase();
  const perm = (adminUser.branch_manager_permission || 'view') as 'view' | 'update';
  const canUpdate =
    role === 'admin' || (role === 'branch_manager' && perm === 'update');

  return {
    canUpdate,
    supabase,
    adminUser: {
      canUpdate,
      role,
      branch_id: adminUser.branch_id ?? null,
      branch_manager_permission: role === 'branch_manager' ? perm : null,
    },
  };
}
