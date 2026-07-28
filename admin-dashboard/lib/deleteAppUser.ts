import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Remove app-user owned rows so auth.admin.deleteUser can succeed.
 * Mirrors supabase/functions/delete-account cleanup.
 */
export async function cleanupAppUserData(
  admin: SupabaseClient,
  userId: string
): Promise<string[]> {
  const warnings: string[] = [];

  const softNull: Array<{ table: string; column: string }> = [
    { table: 'events', column: 'created_by' },
    { table: 'reward_requests', column: 'processed_by' },
  ];

  for (const { table, column } of softNull) {
    const { error } = await admin.from(table).update({ [column]: null }).eq(column, userId);
    if (error) warnings.push(`${table}.${column}: ${error.message}`);
  }

  const deleteByUserId = [
    'points_rewards',
    'reward_requests',
    'applications',
    'intended_parent_applications',
    'medical_reports',
    'surrogate_medical_info',
    'ob_appointments',
    'ivf_appointments',
    'psychological_evaluations',
    'surrogate_insurance',
    'online_claim_submissions',
    'monthly_assessments',
    'support_tickets',
    'event_registrations',
    'event_likes',
    'post_likes',
    'comment_likes',
    'comments',
    'posts',
    'documents',
  ];

  for (const table of deleteByUserId) {
    const { error } = await admin.from(table).delete().eq('user_id', userId);
    if (error) warnings.push(`${table}: ${error.message}`);
  }

  const { error: referralError } = await admin
    .from('referral_submissions')
    .delete()
    .eq('referrer_user_id', userId);
  if (referralError) warnings.push(`referral_submissions: ${referralError.message}`);

  // Matches may reference profile id as surrogate/parent
  for (const col of ['surrogate_id', 'parent_id', 'first_parent_id', 'second_parent_id']) {
    const { data: matches } = await admin.from('surrogate_matches').select('id').eq(col, userId);
    const matchIds = (matches || []).map((m: { id: string }) => m.id).filter(Boolean);
    if (matchIds.length > 0) {
      const { error: mmError } = await admin.from('match_managers').delete().in('match_id', matchIds);
      if (mmError) warnings.push(`match_managers: ${mmError.message}`);
    }
    const { error } = await admin.from('surrogate_matches').delete().eq(col, userId);
    if (error) warnings.push(`surrogate_matches.${col}: ${error.message}`);
  }

  const { error: profileError } = await admin.from('profiles').delete().eq('id', userId);
  if (profileError) warnings.push(`profiles: ${profileError.message}`);

  return warnings;
}

export async function deleteAppUser(
  admin: SupabaseClient,
  userId: string
): Promise<{ ok: true; warnings: string[] } | { ok: false; error: string; warnings: string[] }> {
  const warnings = await cleanupAppUserData(admin, userId);
  if (warnings.length) {
    console.warn('[deleteAppUser] cleanup warnings:', warnings);
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    // Profile may already be gone; still try to remove auth user failure is fatal
    return { ok: false, error: deleteError.message, warnings };
  }

  return { ok: true, warnings };
}
