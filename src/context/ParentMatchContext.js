import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorageLib from '../utils/Storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const STORAGE_KEY = (userId) => `parent_active_match_id:${userId}`;

function sortParentMatches(rows) {
  if (!rows?.length) return [];
  return [...rows].sort((a, b) => {
    const ta = Date.parse(a.updated_at || a.created_at || 0) || 0;
    const tb = Date.parse(b.updated_at || b.created_at || 0) || 0;
    return tb - ta;
  });
}

function pickActiveId(sortedMatches, storedId) {
  if (!sortedMatches.length) return null;
  if (storedId && sortedMatches.some((m) => m.id === storedId)) return storedId;
  return sortedMatches[0].id;
}

const ParentMatchContext = createContext(null);

export function ParentMatchProvider({ children }) {
  const { user } = useAuth();
  const roleLower = (user?.role || '').toLowerCase();
  const isParent = roleLower === 'parent';

  const [matches, setMatches] = useState([]);
  const [activeMatchId, setActiveMatchIdState] = useState(null);
  const [surrogateNames, setSurrogateNames] = useState({});
  const [loading, setLoading] = useState(false);
  /** First refresh finished for this parent session (avoids treating "loading" as unmatched). */
  const [initialSyncDone, setInitialSyncDone] = useState(false);

  const activeMatch = useMemo(() => {
    if (!activeMatchId || !matches.length) return null;
    return matches.find((m) => m.id === activeMatchId) || null;
  }, [matches, activeMatchId]);

  const loadSurrogateNames = useCallback(async (matchRows) => {
    const ids = [
      ...new Set(
        (matchRows || []).map((m) => m.surrogate_id).filter(Boolean)
      ),
    ];
    if (!ids.length) {
      setSurrogateNames({});
      return;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', ids);
      if (error) {
        console.warn('[ParentMatch] loadSurrogateNames:', error.message);
        return;
      }
      const map = {};
      (data || []).forEach((p) => {
        if (p?.id) map[p.id] = p.name || '';
      });
      setSurrogateNames(map);
    } catch (e) {
      console.warn('[ParentMatch] loadSurrogateNames failed:', e);
    }
  }, []);

  const refreshMatches = useCallback(async () => {
    if (!user?.id || !isParent) {
      setMatches([]);
      setActiveMatchIdState(null);
      setSurrogateNames({});
      return { matches: [], activeMatch: null };
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('surrogate_matches')
        .select('*')
        .eq('parent_id', user.id)
        .in('status', ['matched', 'active']);

      if (error && error.code !== 'PGRST116') {
        console.error('[ParentMatch] refreshMatches error:', error);
        setMatches([]);
        setActiveMatchIdState(null);
        return { matches: [], activeMatch: null };
      }

      const sorted = sortParentMatches(data || []);
      setMatches(sorted);

      let stored = null;
      try {
        stored = await AsyncStorageLib.getItem(STORAGE_KEY(user.id));
      } catch (e) {
        console.warn('[ParentMatch] read storage:', e);
      }

      const nextId = pickActiveId(sorted, stored);
      setActiveMatchIdState(nextId);

      if (nextId) {
        try {
          await AsyncStorageLib.setItem(STORAGE_KEY(user.id), nextId);
        } catch (e) {
          console.warn('[ParentMatch] write storage:', e);
        }
      } else {
        try {
          await AsyncStorageLib.removeItem(STORAGE_KEY(user.id));
        } catch (e) {
          console.warn('[ParentMatch] remove storage:', e);
        }
      }

      await loadSurrogateNames(sorted);

      const active = sorted.find((m) => m.id === nextId) || null;
      return { matches: sorted, activeMatch: active };
    } finally {
      setLoading(false);
      setInitialSyncDone(true);
    }
  }, [user?.id, isParent, loadSurrogateNames]);

  const setActiveMatchId = useCallback(
    async (matchId, options = {}) => {
      if (!user?.id || !isParent) return;
      const { silent } = options;
      const sorted = sortParentMatches(matches);
      const valid = sorted.find((m) => m.id === matchId);
      if (!valid) {
        if (!silent) {
          console.warn('[ParentMatch] setActiveMatchId: invalid id', matchId);
        }
        return;
      }
      setActiveMatchIdState(matchId);
      try {
        await AsyncStorageLib.setItem(STORAGE_KEY(user.id), matchId);
      } catch (e) {
        console.warn('[ParentMatch] persist active match:', e);
      }
    },
    [user?.id, isParent, matches]
  );

  useEffect(() => {
    if (!user?.id || !isParent) {
      setMatches([]);
      setActiveMatchIdState(null);
      setSurrogateNames({});
      setLoading(false);
      setInitialSyncDone(false);
      return;
    }
    refreshMatches();
  }, [user?.id, isParent, refreshMatches]);

  useEffect(() => {
    if (!user?.id || !isParent) return undefined;

    const filter = `parent_id=eq.${user.id}`;
    const channel = supabase
      .channel(`parent-match-ctx-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'surrogate_matches',
          filter,
        },
        () => {
          refreshMatches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, isParent, refreshMatches]);

  const value = useMemo(
    () => ({
      isParent,
      matches,
      activeMatchId,
      activeMatch,
      surrogateNames,
      loading,
      initialSyncDone,
      refreshMatches,
      setActiveMatchId,
    }),
    [
      isParent,
      matches,
      activeMatchId,
      activeMatch,
      surrogateNames,
      loading,
      initialSyncDone,
      refreshMatches,
      setActiveMatchId,
    ]
  );

  return (
    <ParentMatchContext.Provider value={value}>
      {children}
    </ParentMatchContext.Provider>
  );
}

export function useParentMatch() {
  const ctx = useContext(ParentMatchContext);
  if (!ctx) {
    throw new Error('useParentMatch must be used within ParentMatchProvider');
  }
  return ctx;
}
