import { NextRequest, NextResponse } from 'next/server';
import { analyzeMedicalRecordPdf } from '@/lib/claudeMedicalReview';
import {
  MEDICAL_RECORD_STORAGE_BUCKET,
  requireMedicalRecordAccess,
} from '@/lib/medicalRecordReviews';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

const analyzeTimestamps = new Map<string, number>();
const MIN_ANALYZE_INTERVAL_MS = 15_000;

function isRateLimited(id: string) {
  const now = Date.now();
  const previous = analyzeTimestamps.get(id);
  if (previous && now - previous < MIN_ANALYZE_INTERVAL_MS) {
    return true;
  }
  analyzeTimestamps.set(id, now);
  return false;
}

export async function POST(_req: NextRequest, context: RouteContext) {
  const auth = await requireMedicalRecordAccess({ requireWrite: true });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'Missing ANTHROPIC_API_KEY. Configure it in server environment variables.' },
      { status: 500 }
    );
  }

  const { id } = await context.params;

  if (isRateLimited(id)) {
    return NextResponse.json(
      { error: 'Please wait a few seconds before running Claude review again.' },
      { status: 429 }
    );
  }

  try {
    const { data: existing, error: fetchError } = await auth.supabase
      .from('medical_record_reviews')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    if (!existing.storage_path || existing.storage_path === 'pending') {
      return NextResponse.json({ error: 'PDF file is missing' }, { status: 400 });
    }

    await auth.supabase
      .from('medical_record_reviews')
      .update({
        status: 'analyzing',
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    const { data: fileData, error: downloadError } = await auth.supabase.storage
      .from(MEDICAL_RECORD_STORAGE_BUCKET)
      .download(existing.storage_path);

    if (downloadError || !fileData) {
      throw new Error(downloadError?.message || 'Failed to download PDF from storage');
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const pdfBytes = new Uint8Array(arrayBuffer);

    const result = await analyzeMedicalRecordPdf(pdfBytes);

    const { data: updated, error: updateError } = await auth.supabase
      .from('medical_record_reviews')
      .update({
        status: 'analyzed',
        complications: result.complications,
        raw_ai_response: result.rawAiResponse,
        error_message: null,
        analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      review: updated,
      pageCount: result.pageCount,
    });
  } catch (error: any) {
    console.error('[medical-record-reviews/:id/analyze] error:', error);
    const message = error?.message || 'Failed to analyze medical record';

    await auth.supabase
      .from('medical_record_reviews')
      .update({
        status: 'failed',
        error_message: message.slice(0, 1000),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
