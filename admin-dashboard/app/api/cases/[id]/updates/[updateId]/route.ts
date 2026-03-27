import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { storagePathFromDocumentsPublicUrl } from '@/lib/matchUpdateImages';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const STORAGE_BUCKET = 'documents';

export const dynamic = 'force-dynamic';

// DELETE case update (and storage files for attached images)
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

    const { data: attachments, error: attErr } = await supabase
      .from('match_update_images')
      .select('image_url')
      .eq('update_id', updateId);

    if (attErr) {
      console.warn('[cases/[id]/updates/[updateId]] Could not list attachments:', attErr.message);
    }

    const paths = (attachments || [])
      .map((row) => storagePathFromDocumentsPublicUrl(row.image_url))
      .filter((p): p is string => !!p);

    if (paths.length > 0) {
      const { error: removeErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove(paths);
      if (removeErr) {
        console.warn('[cases/[id]/updates/[updateId]] Storage remove warning:', removeErr.message);
      }
    }

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
