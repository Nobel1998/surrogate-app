/**
 * Normalize and copy helpers for surrogate / intended-parent application review status.
 */

export const APPLICATION_STATUS = {
  NONE: 'none',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

/**
 * Map DB status (including under_review / in_progress) to UI status.
 * @param {string|null|undefined} status
 * @returns {'pending'|'approved'|'rejected'|'none'}
 */
export function normalizeApplicationStatus(status) {
  const s = String(status || '')
    .trim()
    .toLowerCase();
  if (!s) return APPLICATION_STATUS.NONE;
  if (s === 'approved') return APPLICATION_STATUS.APPROVED;
  if (s === 'rejected') return APPLICATION_STATUS.REJECTED;
  // pending, under_review, in_progress, updated, etc.
  if (
    s === 'pending' ||
    s === 'under_review' ||
    s === 'in_progress' ||
    s === 'updated' ||
    s === 'submitted'
  ) {
    return APPLICATION_STATUS.PENDING;
  }
  return APPLICATION_STATUS.PENDING;
}

/**
 * @param {'surrogate'|'parent'|string} role
 * @param {'pending'|'approved'|'rejected'|'none'} status
 * @param {(key: string, params?: object) => string} t
 */
export function getApplicationStatusCopy(role, status, t) {
  const normalized = normalizeApplicationStatus(status);
  const isParent = String(role || '').toLowerCase() === 'parent';

  if (normalized === APPLICATION_STATUS.NONE) {
    return {
      badge: t('profile.notSubmitted'),
      title: isParent ? t('applicationStatus.noApplicationTitle') : t('applicationStatus.noApplicationTitle'),
      description: t('applicationStatus.noApplicationDescription'),
      badgeColor: '#E91E63',
    };
  }

  if (normalized === APPLICATION_STATUS.APPROVED) {
    return {
      badge: t('profile.statusApproved'),
      title: t('applicationStatus.approvedTitle'),
      description: isParent
        ? t('applicationStatus.approvedDescriptionParent')
        : t('applicationStatus.approvedDescriptionSurrogate'),
      badgeColor: '#4CAF50',
    };
  }

  if (normalized === APPLICATION_STATUS.REJECTED) {
    return {
      badge: t('profile.statusRejected'),
      title: t('applicationStatus.rejectedTitle'),
      description: t('applicationStatus.rejectedDescription'),
      badgeColor: '#F44336',
    };
  }

  return {
    badge: t('profile.statusPending'),
    title: t('applicationStatus.underReviewTitle'),
    description: t('applicationStatus.underReviewDescription'),
    badgeColor: '#FF9800',
  };
}

/**
 * Fetch latest application row for a user.
 * @returns {Promise<{ id: string|number|null, status: string, raw: object|null }>}
 */
export async function fetchLatestApplication(supabase, userId, role) {
  const isParent = String(role || '').toLowerCase() === 'parent';
  const table = isParent ? 'intended_parent_applications' : 'applications';
  const orderCol = isParent ? 'submitted_at' : 'created_at';
  // applications has no updated_at / submitted_at (Postgres 42703 if selected)
  const selectCols = isParent
    ? 'id, status, updated_at, created_at, submitted_at'
    : 'id, status, created_at';

  const { data, error } = await supabase
    .from(table)
    .select(selectCols)
    .eq('user_id', userId)
    .order(orderCol, { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return {
    id: data?.id ?? null,
    status: normalizeApplicationStatus(data?.status),
    raw: data || null,
  };
}
