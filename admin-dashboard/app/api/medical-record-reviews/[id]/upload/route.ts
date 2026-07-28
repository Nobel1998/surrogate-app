import { NextRequest, NextResponse } from 'next/server';
import {
  MEDICAL_RECORD_STORAGE_BUCKET,
  requireMedicalRecordAccess,
} from '@/lib/medicalRecordReviews';
import { saveMedicalRecordTempPdf } from '@/lib/runMedicalRecordAnalysis';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

export async function POST(req: NextRequest, context: RouteContext) {
  const auth = await requireMedicalRecordAccess({ requireWrite: true });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 });
    }

    if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'Invalid PDF file size' }, { status: 400 });
    }

    const { data: existing, error: fetchError } = await auth.supabase
      .from('medical_record_reviews')
      .select('id, storage_path')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    if (!existing.storage_path || existing.storage_path === 'pending') {
      return NextResponse.json({ error: 'Upload path is not ready yet' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await auth.supabase.storage
      .from(MEDICAL_RECORD_STORAGE_BUCKET)
      .upload(existing.storage_path, buffer, {
        contentType: file.type || 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    try {
      await saveMedicalRecordTempPdf(id, buffer);
    } catch (tempError) {
      console.warn('[medical-record-reviews/:id/upload] temp cache failed:', tempError);
    }

    return NextResponse.json({
      success: true,
      reviewId: id,
      storagePath: existing.storage_path,
    });
  } catch (error: any) {
    console.error('[medical-record-reviews/:id/upload] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload PDF' },
      { status: 500 }
    );
  }
}
