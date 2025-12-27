import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

// GET: Get list of available surrogates (excluding those with active matches)
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
    // First, get all surrogate_ids that have active matches
    const { data: activeMatches, error: matchesError } = await supabase
      .from('surrogate_matches')
      .select('surrogate_id')
      .eq('status', 'active');

    if (matchesError) {
      console.error('[surrogates/available] Error loading active matches:', matchesError);
      return NextResponse.json(
        { error: 'Failed to load active matches' },
        { status: 500 }
      );
    }

    // Extract unique surrogate IDs that are already matched
    const matchedSurrogateIds = new Set(
      (activeMatches || [])
        .map(m => m.surrogate_id)
        .filter(id => id != null && id !== '')
    );

    console.log('[surrogates/available] Matched surrogate IDs to exclude:', Array.from(matchedSurrogateIds));

    // Get all available surrogates
    const { data: allSurrogates, error: surrogatesError } = await supabase
      .from('profiles')
      .select('id, name, phone, location, available')
      .eq('role', 'surrogate')
      .eq('available', true)
      .order('created_at', { ascending: false });

    if (surrogatesError) {
      console.error('[surrogates/available] Error loading surrogates:', surrogatesError);
      return NextResponse.json(
        { error: 'Failed to load surrogates' },
        { status: 500 }
      );
    }

    // Filter out surrogates that are already matched
    const availableSurrogates = (allSurrogates || []).filter(
      surrogate => !matchedSurrogateIds.has(surrogate.id)
    );

    console.log('[surrogates/available] Returning', availableSurrogates.length, 'available surrogates (excluded', matchedSurrogateIds.size, 'matched)');

    return NextResponse.json({ 
      surrogates: availableSurrogates,
      total: availableSurrogates.length,
      excluded: matchedSurrogateIds.size
    });
  } catch (error: any) {
    console.error('[surrogates/available] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load available surrogates' },
      { status: 500 }
    );
  }
}

