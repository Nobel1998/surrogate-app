/** First word of a full name (claim_id convention). */
export function matchFirstName(fullName?: string | null): string {
  const part = String(fullName || '')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean)[0];
  return part || '';
}

/** Base claim_id: SurrogateFirst--ParentFirst */
export function buildMatchClaimBase(
  surrogateName?: string | null,
  parentName?: string | null
): string {
  return `${matchFirstName(surrogateName) || 'Surrogate'}--${matchFirstName(parentName) || 'Parent'}`;
}

/**
 * Allocate a unique claim_id for a match, adding numeric suffix if needed.
 */
export async function allocateUniqueClaimId(
  supabase: { from: (table: string) => any },
  baseClaimId: string,
  matchId: string
): Promise<string> {
  let claimId = baseClaimId;
  let counter = 1;
  while (true) {
    const { data: existingMatch } = await supabase
      .from('surrogate_matches')
      .select('id')
      .eq('claim_id', claimId)
      .neq('id', matchId)
      .maybeSingle();
    if (!existingMatch) break;
    counter += 1;
    claimId = `${baseClaimId}${counter}`;
  }
  return claimId;
}

/**
 * Rebuild claim_id from live profile names when it is stale.
 * Returns the claim_id that should be displayed (updated or unchanged).
 */
export async function refreshMatchClaimIdIfStale(
  supabase: { from: (table: string) => any },
  match: {
    id: string;
    claim_id?: string | null;
    surrogate_id?: string | null;
    parent_id?: string | null;
    first_parent_id?: string | null;
    first_parent_name?: string | null;
  },
  profileNameById: Record<string, string | null | undefined>
): Promise<string | null> {
  if (!match?.id) return match?.claim_id || null;

  const surrogateName = match.surrogate_id
    ? profileNameById[match.surrogate_id]
    : null;
  const parentId = match.first_parent_id || match.parent_id || null;
  const parentName = parentId
    ? profileNameById[parentId] || match.first_parent_name
    : match.first_parent_name;

  if (!surrogateName && !parentName) return match.claim_id || null;

  const baseClaimId = buildMatchClaimBase(surrogateName, parentName);
  const current = String(match.claim_id || '');
  // Same base (with optional numeric suffix) → already in sync
  if (current === baseClaimId || current.startsWith(baseClaimId)) {
    // If current is baseClaimId2 but names still match base, ok;
    // if names changed, baseClaimId is different so we fall through.
    const suffix = current.slice(baseClaimId.length);
    if (current === baseClaimId || /^[0-9]+$/.test(suffix)) {
      return current || baseClaimId;
    }
  }

  const claimId = await allocateUniqueClaimId(supabase, baseClaimId, match.id);
  if (claimId !== current) {
    const { error } = await supabase
      .from('surrogate_matches')
      .update({ claim_id: claimId })
      .eq('id', match.id);
    if (error) {
      console.warn('[matchClaimId] failed to update claim_id', match.id, error.message);
      return current || claimId;
    }
  }
  return claimId;
}
