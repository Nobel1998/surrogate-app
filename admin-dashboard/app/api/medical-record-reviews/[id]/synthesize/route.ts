import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import {
  createServiceSupabase,
  getMrrInternalSecret,
  markMedicalRecordAnalysisFailed,
  runSynthesizePhase,
  setAnalysisProgress,
} from '@/lib/runMedicalRecordAnalysis';
import { requireMedicalRecordAccess } from '@/lib/medicalRecordReviews';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

function isInternal(req: NextRequest) {
  const secret = getMrrInternalSecret();
  if (!secret) return false;
  return req.headers.get('x-mrr-internal-secret') === secret;
}

/**
 * Phase 2: generate clinic/staff reports from a saved facts checkpoint.
 * Invoked automatically after phase-1 extract, or manually via Retry when checkpoint exists.
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const internal = isInternal(req);

  if (!internal) {
    const auth = await requireMedicalRecordAccess({ requireWrite: true });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
  }

  const supabase = createServiceSupabase();

  try {
    await supabase
      .from('medical_record_reviews')
      .update({
        status: 'analyzing',
        error_message: `PROGRESS: [D] 2.phase2_queued — report synthesis @ ${new Date().toISOString()}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    after(async () => {
      const startedAt = Date.now();
      const budgetMs = 270_000;
      // #region agent log
      fetch('http://127.0.0.1:7292/ingest/ae0d1be9-2477-4454-828d-6c03ee3b2577', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug-Session-Id': '5244e3',
        },
        body: JSON.stringify({
          sessionId: '5244e3',
          runId: 'post-fix',
          hypothesisId: 'D',
          location: 'synthesize/route.ts:afterStart',
          message: 'phase2 after() started',
          data: { id, budgetMs },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      try {
        await setAnalysisProgress(supabase, id, '2.phase2_started', 'generating clinic+staff reports', 'D');
        await Promise.race([
          runSynthesizePhase(supabase, id),
          new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(
                new Error(
                  `Report phase timed out after ${Math.round(budgetMs / 1000)}s. Facts are saved — click Retry Review to resume reports only.`
                )
              );
            }, budgetMs);
          }),
        ]);
        // #region agent log
        fetch('http://127.0.0.1:7292/ingest/ae0d1be9-2477-4454-828d-6c03ee3b2577', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Debug-Session-Id': '5244e3',
          },
          body: JSON.stringify({
            sessionId: '5244e3',
            runId: 'post-fix',
            hypothesisId: 'D',
            location: 'synthesize/route.ts:afterOk',
            message: 'phase2 finished ok',
            data: { id, elapsedMs: Date.now() - startedAt },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
      } catch (error: any) {
        console.error('[medical-record-reviews/:id/synthesize] error:', error);
        const message = error?.message || 'Failed to generate reports';
        await markMedicalRecordAnalysisFailed(supabase, id, message);
      }
    });

    return NextResponse.json(
      { started: true, reviewId: id, phase: 2, debug: { note: 'phase2 report synthesis queued' } },
      { status: 202 }
    );
  } catch (error: any) {
    const message = error?.message || 'Failed to start report phase';
    await markMedicalRecordAnalysisFailed(supabase, id, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
