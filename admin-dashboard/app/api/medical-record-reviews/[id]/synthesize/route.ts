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
/** Vercel Pro allows up to 800s for long clinic/staff report generation. */
export const maxDuration = 800;

type RouteContext = { params: Promise<{ id: string }> };

function isInternal(req: NextRequest) {
  const secret = getMrrInternalSecret();
  if (!secret) return false;
  return req.headers.get('x-mrr-internal-secret') === secret;
}

/**
 * Phase 2: generate clinic/staff reports from a saved facts checkpoint.
 * Invoked automatically after phase-1 extract, or via Retry when checkpoint exists.
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
        error_message: 'PROGRESS: phase2_queued — generating clinic and staff reports',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    after(async () => {
      const budgetMs = 780_000;
      try {
        await setAnalysisProgress(supabase, id, 'phase2_started', 'generating clinic+staff reports');
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
      } catch (error: any) {
        console.error('[medical-record-reviews/:id/synthesize] error:', error);
        const message = error?.message || 'Failed to generate reports';
        await markMedicalRecordAnalysisFailed(supabase, id, message);
      }
    });

    return NextResponse.json({ started: true, reviewId: id, phase: 2 }, { status: 202 });
  } catch (error: any) {
    const message = error?.message || 'Failed to start report phase';
    await markMedicalRecordAnalysisFailed(supabase, id, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
