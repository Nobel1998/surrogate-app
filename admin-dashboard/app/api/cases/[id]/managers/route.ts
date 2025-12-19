import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

// GET all managers for a case
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id: matchId } = await params;

    const { data: matchManagers, error } = await supabase
      .from('match_managers')
      .select(`
        id,
        manager_id,
        created_at,
        manager:admin_users!match_managers_manager_id_fkey(id, name, role)
      `)
      .eq('match_id', matchId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[cases/[id]/managers] GET error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to load managers' },
        { status: 500 }
      );
    }

    return NextResponse.json({ managers: matchManagers || [] });
  } catch (error: any) {
    console.error('[cases/[id]/managers] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load managers' },
      { status: 500 }
    );
  }
}

// POST/PUT update managers for a case
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id: matchId } = await params;
    const body = await req.json();
    const { manager_ids } = body; // Array of manager IDs

    if (!Array.isArray(manager_ids)) {
      return NextResponse.json(
        { error: 'manager_ids must be an array' },
        { status: 400 }
      );
    }

    // Remove null/empty values
    const validManagerIds = manager_ids.filter((id: string) => id && id.trim() !== '');

    // Delete all existing managers for this match
    const { error: deleteError } = await supabase
      .from('match_managers')
      .delete()
      .eq('match_id', matchId);

    if (deleteError) {
      console.error('[cases/[id]/managers] DELETE error:', deleteError);
      return NextResponse.json(
        { error: deleteError.message || 'Failed to remove existing managers' },
        { status: 500 }
      );
    }

    // Insert new managers
    if (validManagerIds.length > 0) {
      const newManagers = validManagerIds.map((managerId: string) => ({
        match_id: matchId,
        manager_id: managerId,
      }));

      const { error: insertError } = await supabase
        .from('match_managers')
        .insert(newManagers);

      if (insertError) {
        console.error('[cases/[id]/managers] INSERT error:', insertError);
        return NextResponse.json(
          { error: insertError.message || 'Failed to add managers' },
          { status: 500 }
        );
      }
    }

    // Fetch updated managers
    const { data: updatedManagers, error: fetchError } = await supabase
      .from('match_managers')
      .select(`
        id,
        manager_id,
        created_at,
        manager:admin_users!match_managers_manager_id_fkey(id, name, role)
      `)
      .eq('match_id', matchId)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('[cases/[id]/managers] FETCH error:', fetchError);
    }

    return NextResponse.json({
      success: true,
      managers: updatedManagers || [],
    });
  } catch (error: any) {
    console.error('[cases/[id]/managers] POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update managers' },
      { status: 500 }
    );
  }
}
