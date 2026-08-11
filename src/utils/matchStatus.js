/** Statuses that mean the surrogate/parent currently has an active match. */
export const ACTIVE_MATCH_STATUSES = ['matched', 'active', 'pregnant', 'pending'];

export function isActiveMatchStatus(status) {
  return ACTIVE_MATCH_STATUSES.includes(String(status || '').toLowerCase());
}
