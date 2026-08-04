import AsyncStorageLib from './Storage';

export const SURROGATE_DRAFT_PREFIX = 'application_draft_';
export const PARENT_DRAFT_PREFIX = 'intended_parent_draft_';
export const PENDING_SURROGATE_DRAFT_KEY = 'application_draft_pending_surrogate';
export const PENDING_PARENT_DRAFT_KEY = 'intended_parent_draft_pending';

export function getSurrogateDraftKey(userId) {
  return userId ? `${SURROGATE_DRAFT_PREFIX}${userId}` : `${SURROGATE_DRAFT_PREFIX}guest`;
}

export function getParentDraftKey(userId) {
  return userId ? `${PARENT_DRAFT_PREFIX}${userId}` : `${PARENT_DRAFT_PREFIX}guest`;
}

/**
 * Normalize draft payloads.
 * Legacy: raw applicationData object
 * v2: { version, currentStep, data, photos?, savedAt }
 */
export function parseDraftEnvelope(raw) {
  if (!raw) return null;
  let parsed;
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;

  if (parsed.version === 2 && parsed.data && typeof parsed.data === 'object') {
    const step = Number(parsed.currentStep);
    return {
      version: 2,
      currentStep: Number.isFinite(step) && step >= 1 ? Math.floor(step) : 1,
      data: parsed.data,
      photos: Array.isArray(parsed.photos) ? parsed.photos : null,
      savedAt: parsed.savedAt || null,
    };
  }

  // Legacy flat form data
  return {
    version: 1,
    currentStep: 1,
    data: parsed,
    photos: Array.isArray(parsed.photos) ? parsed.photos : null,
    savedAt: null,
  };
}

export function buildDraftEnvelope({ currentStep, data, photos }) {
  const photoUrls = Array.isArray(photos)
    ? photos.map((p) => (typeof p === 'string' ? p : p?.url)).filter(Boolean)
    : [];
  return {
    version: 2,
    currentStep: Math.max(1, Number(currentStep) || 1),
    data: data || {},
    photos: photoUrls,
    savedAt: new Date().toISOString(),
  };
}

export function draftDataRichness(draft) {
  const data = draft?.data;
  if (!data || typeof data !== 'object') return 0;
  let score = 0;
  Object.keys(data).forEach((key) => {
    const v = data[key];
    if (v == null) return;
    if (typeof v === 'string') {
      if (v.trim()) score += 1;
      return;
    }
    if (Array.isArray(v)) {
      if (v.length) score += 1;
      return;
    }
    if (typeof v === 'boolean' || typeof v === 'number') {
      score += 1;
      return;
    }
    if (typeof v === 'object' && Object.keys(v).length) score += 1;
  });
  if (Array.isArray(draft.photos) && draft.photos.length) {
    score += draft.photos.length;
  }
  return score;
}

export async function saveApplicationDraft(key, envelope) {
  if (!key) return;
  await AsyncStorageLib.setItem(key, JSON.stringify(envelope));
}

export async function loadApplicationDraft(key) {
  if (!key) return null;
  const raw = await AsyncStorageLib.getItem(key);
  return parseDraftEnvelope(raw);
}

export async function clearApplicationDraft(key) {
  if (!key) return;
  await AsyncStorageLib.removeItem(key);
}

/**
 * Pick the richest (then newest) draft among several storage keys.
 * Soft-register remounts often leave the filled form on guest/pending while
 * the new logged-in screen only looked at the user key.
 */
export async function loadBestApplicationDraft(keys) {
  const uniqueKeys = [...new Set((keys || []).filter(Boolean))];
  const found = [];
  for (const key of uniqueKeys) {
    const draft = await loadApplicationDraft(key);
    if (draft?.data) found.push({ key, draft });
  }
  if (!found.length) return null;

  found.sort((a, b) => {
    const richDiff = draftDataRichness(b.draft) - draftDataRichness(a.draft);
    if (richDiff !== 0) return richDiff;
    const ta = a.draft.savedAt ? Date.parse(a.draft.savedAt) : 0;
    const tb = b.draft.savedAt ? Date.parse(b.draft.savedAt) : 0;
    return tb - ta;
  });
  return found[0];
}

/** Persist the same envelope to guest + pending (+ optional user) before auth remount. */
export async function persistDraftForAuthHandoff({
  envelope,
  guestKey,
  pendingKey,
  userKey,
}) {
  if (!envelope) return;
  const tasks = [];
  if (guestKey) tasks.push(saveApplicationDraft(guestKey, envelope));
  if (pendingKey) tasks.push(saveApplicationDraft(pendingKey, envelope));
  if (userKey) tasks.push(saveApplicationDraft(userKey, envelope));
  await Promise.all(tasks);
}

/** After restore as logged-in user, keep user key and drop guest/pending copies. */
export async function consolidateDraftToUser({
  draft,
  userKey,
  guestKey,
  pendingKey,
}) {
  if (!draft || !userKey) return;
  await saveApplicationDraft(userKey, {
    ...draft,
    savedAt: new Date().toISOString(),
  });
  if (guestKey) await clearApplicationDraft(guestKey);
  if (pendingKey) await clearApplicationDraft(pendingKey);
}

/** Copy guest draft to authenticated user key after soft-register. */
export async function migrateGuestDraftToUser(guestKey, userKey) {
  if (!guestKey || !userKey || guestKey === userKey) return null;
  const draft = await loadApplicationDraft(guestKey);
  if (!draft) return null;
  await saveApplicationDraft(userKey, {
    ...draft,
    savedAt: new Date().toISOString(),
  });
  await clearApplicationDraft(guestKey);
  return draft;
}
