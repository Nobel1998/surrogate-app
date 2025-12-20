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
    
    console.log('[cases/[id]/managers] POST request:', {
      matchId,
      manager_ids,
      validManagerIds,
      validManagerIdsCount: validManagerIds.length,
    });

    // Delete all existing managers for this match
    const { error: deleteError, data: deletedData } = await supabase
      .from('match_managers')
      .delete()
      .eq('match_id', matchId)
      .select();

    if (deleteError) {
      console.error('[cases/[id]/managers] DELETE error:', deleteError);
      return NextResponse.json(
        { error: deleteError.message || 'Failed to remove existing managers' },
        { status: 500 }
      );
    }
    
    console.log('[cases/[id]/managers] Deleted existing managers:', {
      deletedCount: deletedData?.length || 0,
      deleted: deletedData,
    });

    // Update legacy manager_id field in surrogate_matches
    // If no managers are assigned, set manager_id to null
    // If managers are assigned, set manager_id to the first manager (for backward compatibility)
    const newManagerId = validManagerIds.length > 0 ? validManagerIds[0] : null;
    const { error: updateLegacyError } = await supabase
      .from('surrogate_matches')
      .update({ manager_id: newManagerId })
      .eq('id', matchId);
    
    if (updateLegacyError) {
      console.warn('[cases/[id]/managers] Warning: Failed to update legacy manager_id:', updateLegacyError);
      // Don't fail the request, just log the warning
    }

    // Insert new managers
    if (validManagerIds.length > 0) {
      const newManagers = validManagerIds.map((managerId: string) => ({
        match_id: matchId,
        manager_id: managerId,
      }));

      console.log('[cases/[id]/managers] Inserting managers:', {
        newManagers,
        count: newManagers.length,
      });

      const { data: insertedData, error: insertError } = await supabase
        .from('match_managers')
        .insert(newManagers)
        .select();

      if (insertError) {
        console.error('[cases/[id]/managers] INSERT error:', {
          error: insertError,
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          newManagers,
        });
        return NextResponse.json(
          { error: insertError.message || 'Failed to add managers' },
          { status: 500 }
        );
      }
      
      if (!insertedData || insertedData.length === 0) {
        console.error('[cases/[id]/managers] INSERT returned no data:', {
          newManagers,
          insertedData,
        });
        return NextResponse.json(
          { error: 'Insert operation returned no data' },
          { status: 500 }
        );
      }
      
      if (insertedData.length !== newManagers.length) {
        console.warn('[cases/[id]/managers] INSERT returned fewer rows than expected:', {
          expected: newManagers.length,
          actual: insertedData.length,
          newManagers,
          insertedData,
        });
      }
      
      console.log('[cases/[id]/managers] Successfully inserted managers:', {
        insertedCount: insertedData?.length || 0,
        inserted: insertedData,
      });
    }

    // First, try a simple query without join to verify data exists
    const { data: rawManagers, error: rawError } = await supabase
      .from('match_managers')
      .select('id, manager_id, created_at')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true });
    
    console.log('[cases/[id]/managers] Raw managers (without join):', {
      matchId,
      rawCount: rawManagers?.length || 0,
      rawManagers: rawManagers,
      rawError,
    });

    // Fetch updated managers with join
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
      console.error('[cases/[id]/managers] FETCH error:', {
        error: fetchError,
        code: fetchError.code,
        message: fetchError.message,
        details: fetchError.details,
        hint: fetchError.hint,
      });
    }
    
    console.log('[cases/[id]/managers] Fetched updated managers (with join):', {
      matchId,
      managersCount: updatedManagers?.length || 0,
      managers: updatedManagers?.map((m: any) => ({
        id: m.id,
        manager_id: m.manager_id,
        manager_name: m.manager?.name,
        has_manager: !!m.manager,
      })) || [],
      fetchError: fetchError ? {
        code: fetchError.code,
        message: fetchError.message,
      } : null,
    });

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
