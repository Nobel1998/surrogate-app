import { NextRequest, NextResponse } from 'next/server';
import {
  MEDICAL_RECORD_STORAGE_BUCKET,
  buildDocumentsPublicUrl,
  requireMedicalRecordAccess,
} from '@/lib/medicalRecordReviews';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/** Finalize after client finished direct-to-storage upload. */
export async function POST(req: NextRequest, context: RouteContext) {
  const auth = await requireMedicalRecordAccess({ requireWrite: true });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const pathFromClient = typeof body?.path === 'string' ? body.path : null;

    const { data: existing, error: fetchError } = await auth.supabase
      .from('medical_record_reviews')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    const path = pathFromClient || existing.storage_path;
    if (!path || path === 'pending') {
      return NextResponse.json({ error: 'Missing storage path' }, { status: 400 });
    }

    const { data: listed, error: listError } = await auth.supabase.storage
      .from(MEDICAL_RECORD_STORAGE_BUCKET)
      .list(path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '', {
        search: path.includes('/') ? path.slice(path.lastIndexOf('/') + 1) : path,
        limit: 5,
      });

    if (listError) throw listError;

    const fileName = path.includes('/') ? path.slice(path.lastIndexOf('/') + 1) : path;
    const found = (listed || []).some((item) => item.name === fileName);
    if (!found) {
      return NextResponse.json(
        { error: 'Upload not found in storage. Please retry.' },
        { status: 400 }
      );
    }

    const publicUrl = buildDocumentsPublicUrl(path);
    const { data: updated, error: updateError } = await auth.supabase
      .from('medical_record_reviews')
      .update({
        file_url: publicUrl,
        storage_path: path,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ review: updated });
  } catch (error: any) {
    console.error('[medical-record-reviews/:id/finalize] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to finalize upload' },
      { status: 500 }
    );
  }
}
