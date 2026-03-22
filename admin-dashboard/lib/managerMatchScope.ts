import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * `admin` and `finance_manager` see all matches (no match_managers filter).
 * Every other admin_users row is limited to match_managers.assignments.
 */
export async function getAccessibleMatchIds(
  supabase: SupabaseClient,
  adminUserId: string,
  roleLower: string
): Promise<string[] | null> {
  if (roleLower === 'admin' || roleLower === 'finance_manager') {
    return null;
  }

  const { data: assignedMatches, error } = await supabase
    .from('match_managers')
    .select('match_id')
    .eq('manager_id', adminUserId);

  if (error) {
    console.error('[managerMatchScope] match_managers error:', error);
    return [];
  }

  const ids =
    assignedMatches
      ?.map((row: { match_id: string | null }) => row.match_id)
      .filter((id): id is string => !!id) || [];
  return Array.from(new Set(ids));
}

/** All profile user ids tied to the given matches (surrogate + parents). */
export async function getPartyUserIdsForMatches(
  supabase: SupabaseClient,
  matchIds: string[]
): Promise<Set<string>> {
  const out = new Set<string>();
  if (matchIds.length === 0) return out;

  const { data: rows, error } = await supabase
    .from('surrogate_matches')
    .select('surrogate_id, parent_id, first_parent_id, second_parent_id')
    .in('id', matchIds);

  if (error) {
    console.error('[managerMatchScope] surrogate_matches party ids error:', error);
    return out;
  }

  for (const r of rows || []) {
    const row = r as Record<string, string | null>;
    for (const key of ['surrogate_id', 'parent_id', 'first_parent_id', 'second_parent_id']) {
      const v = row[key];
      if (v) out.add(v);
    }
  }
  return out;
}

/** Surrogate profile ids only (for insurance rows with null match_id, etc.). */
export async function getSurrogateIdsForMatches(
  supabase: SupabaseClient,
  matchIds: string[]
): Promise<Set<string>> {
  const out = new Set<string>();
  if (matchIds.length === 0) return out;

  const { data: rows, error } = await supabase
    .from('surrogate_matches')
    .select('surrogate_id')
    .in('id', matchIds);

  if (error) {
    console.error('[managerMatchScope] surrogate_ids error:', error);
    return out;
  }

  for (const r of rows || []) {
    const id = (r as { surrogate_id?: string | null }).surrogate_id;
    if (id) out.add(id);
  }
  return out;
}

/**
 * Build PostgREST .or() filter: rows in assigned matches OR legacy rows with null match_id
 * but surrogate user_id in scope.
 */
export function buildMatchOrNullSurrogateOrFilter(
  matchIds: string[],
  surrogateIds: Set<string>
): string {
  const mid = matchIds.map((id) => `"${id}"`).join(',');
  const su = [...surrogateIds].map((id) => `"${id}"`).join(',');
  if (!su) {
    return `match_id.in.(${mid})`;
  }
  return `match_id.in.(${mid}),and(match_id.is.null,user_id.in.(${su}))`;
}

/** Scoped manager may see a row if match_id is assigned to them, or match_id is null and user_id is a surrogate on an assigned match. */
export async function rowAllowedForScopedManager(
  supabase: SupabaseClient,
  accessibleMatchIds: string[],
  row: { match_id?: string | null; user_id?: string | null }
): Promise<boolean> {
  if (accessibleMatchIds.length === 0) return false;
  const mid = row.match_id || null;
  const uid = row.user_id || null;
  if (mid && accessibleMatchIds.includes(mid)) return true;
  const sur = await getSurrogateIdsForMatches(supabase, accessibleMatchIds);
  if (!mid && uid && sur.has(uid)) return true;
  return false;
}
