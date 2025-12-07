import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Disable caching to always reflect latest matches/profiles
export const dynamic = 'force-dynamic';

export async function GET() {
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
    const [{ data: profiles, error: profilesError }, { data: matches, error: matchesError }] =
      await Promise.all([
        supabase
          .from('profiles')
          .select('id, name, phone, role, email')
          .in('role', ['surrogate', 'parent'])
          .order('created_at', { ascending: false }),
        supabase
          .from('surrogate_matches')
          .select('id, surrogate_id, parent_id, status, created_at, updated_at, notes')
          .order('created_at', { ascending: false })
      ]);

    if (profilesError) throw profilesError;
    if (matchesError) throw matchesError;

    return NextResponse.json({ profiles, matches });
  } catch (error: any) {
    console.error('Error loading match options:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load options' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
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
    const body = await req.json();
    const surrogateId = body.surrogate_id;
    const parentId = body.parent_id;
    if (!surrogateId || !parentId) {
      return NextResponse.json(
        { error: 'surrogate_id and parent_id are required' },
        { status: 400 }
      );
    }

    const status = body.status || 'active';
    const notes = body.notes || null;

    // Manual upsert: check existing pair first
    const { data: existing, error: findError } = await supabase
      .from('surrogate_matches')
      .select('id')
      .eq('surrogate_id', surrogateId)
      .eq('parent_id', parentId)
      .limit(1)
      .maybeSingle();

    if (findError) throw findError;

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from('surrogate_matches')
        .update({ status, notes, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('surrogate_matches')
        .insert({
          surrogate_id: surrogateId,
          parent_id: parentId,
          status,
          notes,
        });
      if (insertError) throw insertError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error creating match:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create match' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
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
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json(
        { error: 'Missing match id' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('surrogate_matches')
      .update({ status: body.status || 'active', updated_at: new Date().toISOString() })
      .eq('id', body.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating match status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update match status' },
      { status: 500 }
    );
  }
}
