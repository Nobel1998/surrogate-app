import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

// DELETE case update
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; updateId: string }> }
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
    const { id: matchId, updateId } = await params;

    // Verify the update belongs to this match
    const { data: update, error: fetchError } = await supabase
      .from('match_updates')
      .select('id, match_id')
      .eq('id', updateId)
      .single();

    if (fetchError) {
      console.error('[cases/[id]/updates/[updateId]] Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Update not found' },
        { status: 404 }
      );
    }

    if (update.match_id !== matchId) {
      return NextResponse.json(
        { error: 'Update does not belong to this match' },
        { status: 403 }
      );
    }

    // Delete the update
    const { error: deleteError } = await supabase
      .from('match_updates')
      .delete()
      .eq('id', updateId);

    if (deleteError) {
      console.error('[cases/[id]/updates/[updateId]] DELETE error:', deleteError);
      return NextResponse.json(
        { error: deleteError.message || 'Failed to delete update' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[cases/[id]/updates/[updateId]] DELETE error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete update' },
      { status: 500 }
    );
  }
}
