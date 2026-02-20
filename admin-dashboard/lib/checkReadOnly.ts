import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Returns true if the current admin user is a branch_manager with read_only=true.
 * Call this at the start of any mutation (POST/PUT/PATCH/DELETE) to enforce view-only access.
 */
export async function isReadOnlyBranchManager(
  supabase: SupabaseClient,
  adminUserId: string | undefined
): Promise<boolean> {
  if (!adminUserId) return false;
  const { data, error } = await supabase
    .from('admin_users')
    .select('role, read_only')
    .eq('id', adminUserId)
    .single();
  if (error || !data) return false;
  const role = (data.role || '').toLowerCase();
  return role === 'branch_manager' && !!data.read_only;
}
