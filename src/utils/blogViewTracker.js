import AsyncStorageLib from './Storage';
import { supabase } from '../lib/supabase';

const VISITOR_KEY_STORAGE = 'blog_visitor_key';
const THROTTLE_PREFIX = 'blog_view_throttle_';
const THROTTLE_MS = 24 * 60 * 60 * 1000;

function createVisitorKey() {
  try {
    if (typeof globalThis?.crypto?.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
  } catch (_) {
    // fall through
  }
  return `v_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Stable anonymous id for guest blog view tracking.
 */
export async function getOrCreateVisitorKey() {
  try {
    const existing = await AsyncStorageLib.getItem(VISITOR_KEY_STORAGE);
    if (existing) return existing;
    const key = createVisitorKey();
    await AsyncStorageLib.setItem(VISITOR_KEY_STORAGE, key);
    return key;
  } catch (err) {
    console.warn('[blogViewTracker] visitor key failed:', err?.message || err);
    return createVisitorKey();
  }
}

async function wasTrackedRecently(throttleKey) {
  try {
    const raw = await AsyncStorageLib.getItem(throttleKey);
    if (!raw) return false;
    const last = Number(raw);
    if (!Number.isFinite(last)) return false;
    return Date.now() - last < THROTTLE_MS;
  } catch (_) {
    return false;
  }
}

async function markTracked(throttleKey) {
  try {
    await AsyncStorageLib.setItem(throttleKey, String(Date.now()));
  } catch (_) {
    // ignore
  }
}

/**
 * Record one blog article view. Silent on failure. 24h throttle per visitor+event.
 * @param {string} eventId
 * @param {{ id?: string }|null|undefined} user
 */
export async function trackBlogArticleView(eventId, user) {
  if (!eventId) return { tracked: false, reason: 'no_event_id' };

  try {
    const userId = user?.id || null;
    const visitorKey = userId ? null : await getOrCreateVisitorKey();
    const identity = userId || visitorKey;
    if (!identity) return { tracked: false, reason: 'no_identity' };

    const throttleKey = `${THROTTLE_PREFIX}${eventId}_${identity}`;
    if (await wasTrackedRecently(throttleKey)) {
      return { tracked: false, reason: 'throttled' };
    }

    const row = {
      event_id: eventId,
      user_id: userId,
      visitor_key: visitorKey,
    };

    const { error } = await supabase.from('event_views').insert(row);

    if (error) {
      console.warn('[blogViewTracker] insert failed:', error.message || error);
      return { tracked: false, reason: 'insert_failed', error };
    }

    await markTracked(throttleKey);
    return { tracked: true };
  } catch (err) {
    console.warn('[blogViewTracker] unexpected error:', err?.message || err);
    return { tracked: false, reason: 'exception' };
  }
}
