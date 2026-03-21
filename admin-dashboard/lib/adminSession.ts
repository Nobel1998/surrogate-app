import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/** Roles that may list all applications / sign-up profiles (no user_id filter). */
export const APPLICATIONS_AND_SIGNUP_LIST_ROLES = ['admin', 'finance_manager'] as const;

/** Roles that may read a single user's application rows via ?user_id= (e.g. Matches). */
export const APPLICATION_BY_USER_ID_ROLES = ['admin', 'finance_manager', 'branch_manager'] as const;

export type AdminSessionResult =
  | { ok: true; role: string; adminUserId: string }
  | { ok: false; status: 401 | 403; error: string };

/**
 * Resolve current dashboard user from admin_user_id cookie and admin_users row.
 */
export async function getAdminSession(): Promise<AdminSessionResult> {
  const cookieStore = await cookies();
  const adminUserId = cookieStore.get('admin_user_id')?.value;
  if (!adminUserId) {
    return { ok: false, status: 401, error: 'Not authenticated' };
  }

  if (!supabaseUrl || !serviceKey) {
    return { ok: false, status: 403, error: 'Missing Supabase env vars' };
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: adminUser, error } = await supabase
    .from('admin_users')
    .select('id, role')
    .eq('id', adminUserId)
    .single();

  if (error || !adminUser) {
    return { ok: false, status: 401, error: 'Invalid admin session' };
  }

  return {
    ok: true,
    role: (adminUser.role || '').toLowerCase(),
    adminUserId: adminUser.id,
  };
}

export function canListAllApplicationsOrProfiles(role: string): boolean {
  return (APPLICATIONS_AND_SIGNUP_LIST_ROLES as readonly string[]).includes(role);
}

export function canFetchApplicationsByUserId(role: string): boolean {
  return (APPLICATION_BY_USER_ID_ROLES as readonly string[]).includes(role);
}
