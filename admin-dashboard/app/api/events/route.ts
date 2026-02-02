import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

/**
 * GET events with registration_count and likes_count.
 * Uses service role so event_registrations and event_likes are visible
 * (RLS otherwise only allows users to see their own registrations).
 */
export async function GET(req: NextRequest) {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase env vars' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data: eventsData, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .not('id', 'is', null)
      .order('created_at', { ascending: false });

    if (eventsError) throw eventsError;

    const { data: registrations, error: regError } = await supabase
      .from('event_registrations')
      .select('event_id')
      .eq('status', 'registered');

    if (regError) throw regError;

    const { data: likes, error: likesError } = await supabase
      .from('event_likes')
      .select('event_id');

    if (likesError) throw likesError;

    const norm = (id: unknown) => String(id ?? '').toLowerCase().trim();

    // #region agent log
    console.log('[api/events] raw', {
      eventsCount: eventsData?.length ?? 0,
      registrationsCount: registrations?.length ?? 0,
      firstRegEventId: registrations?.[0]?.event_id,
      firstEventId: eventsData?.[0]?.id,
      idsMatch: registrations?.[0] && eventsData?.[0] ? norm(registrations[0].event_id) === norm(eventsData[0].id) : false,
    });
    // #endregion

    const eventsWithStats = (eventsData || []).map((event) => {
      const eventIdNorm = norm(event.id);
      const registrationCount = registrations?.filter((r) => norm(r.event_id) === eventIdNorm).length ?? 0;
      const likesCount = likes?.filter((l) => norm(l.event_id) === eventIdNorm).length ?? 0;
      return {
        ...event,
        registration_count: registrationCount,
        likes_count: likesCount,
        current_participants: registrationCount,
      };
    });

    // #region agent log
    console.log('[api/events] response', {
      eventsWithStatsLength: eventsWithStats.length,
      firstEventRegistrationCount: eventsWithStats[0]?.registration_count,
    });
    // #endregion

    return NextResponse.json({ events: eventsWithStats });
  } catch (error: any) {
    console.error('[api/events] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load events' },
      { status: 500 }
    );
  }
}
