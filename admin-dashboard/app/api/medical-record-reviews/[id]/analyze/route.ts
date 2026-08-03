import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import {
  markMedicalRecordAnalysisFailed,
  runMedicalRecordAnalysis,
  saveMedicalRecordTempPdf,
  setAnalysisProgress,
} from '@/lib/runMedicalRecordAnalysis';
import { requireMedicalRecordAccess } from '@/lib/medicalRecordReviews';

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

function hasKimiApiKey() {
  return !!(process.env.MOONSHOT_API_KEY || process.env.KIMI_API_KEY);
}

export async function POST(req: NextRequest, context: RouteContext) {
  const auth = await requireMedicalRecordAccess({ requireWrite: true });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!hasKimiApiKey()) {
    return NextResponse.json(
      {
        error: 'AI review is not configured on the server. Please contact the administrator.',
      },
      { status: 500 }
    );
  }

  const { id } = await context.params;

  if (isRateLimited(id)) {
    return NextResponse.json(
      { error: 'Please wait a few seconds before running review again.' },
      { status: 429 }
    );
  }

  try {
    const { data: existing, error: fetchError } = await auth.supabase
      .from('medical_record_reviews')
      .select('id, status, storage_path, file_url, file_deleted_at, updated_at, error_message')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    if (existing.status === 'analyzing') {
      const updatedAt = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
      const staleMs = 10 * 60 * 1000;
      if (updatedAt && Date.now() - updatedAt < staleMs) {
        // #region agent log
        fetch('http://127.0.0.1:7292/ingest/ae0d1be9-2477-4454-828d-6c03ee3b2577', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Debug-Session-Id': '5244e3',
          },
          body: JSON.stringify({
            sessionId: '5244e3',
            runId: 'prod-debug',
            hypothesisId: 'B',
            location: 'analyze/route.ts:alreadyRunning',
            message: 'alreadyRunning short-circuit',
            data: {
              id,
              ageMs: Date.now() - updatedAt,
              progress: existing.error_message || null,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        return NextResponse.json(
          {
            started: true,
            reviewId: id,
            alreadyRunning: true,
            debug: {
              hypothesis: 'B',
              progress: existing.error_message,
              updatedAtAgeMs: Date.now() - updatedAt,
            },
          },
          { status: 202 }
        );
      }
    }

    let providedPdfBytes: Uint8Array | null = null;
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file');
      if (file instanceof File && file.size > 0) {
        const arrayBuffer = await file.arrayBuffer();
        providedPdfBytes = new Uint8Array(arrayBuffer);
        try {
          await saveMedicalRecordTempPdf(id, providedPdfBytes);
        } catch (tempError) {
          console.warn('[analyze] temp cache failed:', tempError);
        }
      }
    }

    await auth.supabase
      .from('medical_record_reviews')
      .update({
        status: 'analyzing',
        error_message: `PROGRESS: [A] 0.queued — waiting for after() @ ${new Date().toISOString()}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    const supabase = auth.supabase;
    after(async () => {
      // #region agent log
      fetch('http://127.0.0.1:7292/ingest/ae0d1be9-2477-4454-828d-6c03ee3b2577', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug-Session-Id': '5244e3',
        },
        body: JSON.stringify({
          sessionId: '5244e3',
          runId: 'prod-debug',
          hypothesisId: 'A',
          location: 'analyze/route.ts:afterStart',
          message: 'after() started',
          data: { id },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      try {
        await setAnalysisProgress(supabase, id, '0.after_started', 'background job running', 'A');
        await runMedicalRecordAnalysis(supabase, id, providedPdfBytes);
        // #region agent log
        fetch('http://127.0.0.1:7292/ingest/ae0d1be9-2477-4454-828d-6c03ee3b2577', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Debug-Session-Id': '5244e3',
          },
          body: JSON.stringify({
            sessionId: '5244e3',
            runId: 'prod-debug',
            hypothesisId: 'A',
            location: 'analyze/route.ts:afterOk',
            message: 'after() finished ok',
            data: { id },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
      } catch (error: any) {
        console.error('[medical-record-reviews/:id/analyze] background error:', error);
        const message = error?.message || 'Failed to analyze medical record';
        // #region agent log
        fetch('http://127.0.0.1:7292/ingest/ae0d1be9-2477-4454-828d-6c03ee3b2577', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Debug-Session-Id': '5244e3',
          },
          body: JSON.stringify({
            sessionId: '5244e3',
            runId: 'prod-debug',
            hypothesisId: 'A',
            location: 'analyze/route.ts:afterErr',
            message: 'after() failed',
            data: { id, error: String(message).slice(0, 300) },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        await markMedicalRecordAnalysisFailed(supabase, id, message);
      }
    });

    return NextResponse.json(
      {
        started: true,
        reviewId: id,
        debug: {
          hypothesis: 'A',
          note: 'queued for after(); watch PROGRESS on the review detail panel',
          vercelRuntime: process.env.VERCEL ? 'vercel' : 'local',
        },
      },
      { status: 202 }
    );
  } catch (error: any) {
    console.error('[medical-record-reviews/:id/analyze] error:', error);
    const message = error?.message || 'Failed to start analysis';
    await markMedicalRecordAnalysisFailed(auth.supabase, id, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
