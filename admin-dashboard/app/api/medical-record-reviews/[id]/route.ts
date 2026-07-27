import { NextRequest, NextResponse } from 'next/server';
import {
  MEDICAL_RECORD_STORAGE_BUCKET,
  purgeMedicalRecordPdf,
  requireMedicalRecordAccess,
} from '@/lib/medicalRecordReviews';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const auth = await requireMedicalRecordAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const { data, error } = await auth.supabase
      .from('medical_record_reviews')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    return NextResponse.json({ review: data });
  } catch (error: any) {
    console.error('[medical-record-reviews/:id] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch review' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const auth = await requireMedicalRecordAccess({ requireWrite: true });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const body = await req.json();
    const { status, title } = body || {};

    const { data: existing, error: fetchError } = await auth.supabase
      .from('medical_record_reviews')
      .select('id, storage_path, file_deleted_at, status')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof title === 'string') {
      updateData.title = title.trim() || null;
    }

    if (status === 'reviewed') {
      updateData.status = 'reviewed';
      updateData.reviewed_at = new Date().toISOString();
      updateData.reviewed_by = auth.adminUserId;
    } else if (status === 'uploaded' || status === 'analyzed' || status === 'failed') {
      updateData.status = status;
    }

    const { data, error } = await auth.supabase
      .from('medical_record_reviews')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    let finalReview = data;
    // If marking reviewed and PDF still exists, purge it to free space.
    if (status === 'reviewed' && !existing.file_deleted_at && existing.storage_path) {
      try {
        const purge = await purgeMedicalRecordPdf(auth.supabase, existing);
        if (purge.purged && purge.review) {
          finalReview = purge.review;
        }
      } catch (purgeError) {
        console.error('[medical-record-reviews/:id] PDF purge on review failed:', purgeError);
      }
    }

    return NextResponse.json({ review: finalReview });
  } catch (error: any) {
    console.error('[medical-record-reviews/:id] PATCH error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update review' },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const auth = await requireMedicalRecordAccess({ requireWrite: true });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const { data: existing, error: fetchError } = await auth.supabase
      .from('medical_record_reviews')
      .select('storage_path')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    if (existing.storage_path && existing.storage_path !== 'pending') {
      await auth.supabase.storage
        .from(MEDICAL_RECORD_STORAGE_BUCKET)
        .remove([existing.storage_path])
        .catch((err) => console.error('Error deleting storage file:', err));
    }

    const { error: deleteError } = await auth.supabase
      .from('medical_record_reviews')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[medical-record-reviews/:id] DELETE error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete review' },
      { status: 500 }
    );
  }
}
