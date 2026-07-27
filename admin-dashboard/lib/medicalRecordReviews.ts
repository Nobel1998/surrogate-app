import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getAdminSession } from '@/lib/adminSession';
import { isReadOnlyBranchManager } from '@/lib/checkReadOnly';

export const MEDICAL_RECORD_STORAGE_BUCKET = 'documents';
export const MEDICAL_RECORD_STORAGE_PREFIX = 'medical-record-reviews';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export type MedicalRecordReviewStatus =
  | 'uploaded'
  | 'analyzing'
  | 'analyzed'
  | 'failed'
  | 'reviewed';

export type MedicalComplication = {
  complication: string;
  page: number;
  note?: string;
};

export function createServiceSupabase(): SupabaseClient {
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function buildDocumentsPublicUrl(path: string) {
  return `${supabaseUrl}/storage/v1/object/public/${MEDICAL_RECORD_STORAGE_BUCKET}/${path}`;
}

/** Remove PDF from storage after review; keep DB row + complications. */
export async function purgeMedicalRecordPdf(
  supabase: SupabaseClient,
  review: { id: string; storage_path?: string | null; file_deleted_at?: string | null }
) {
  if (review.file_deleted_at) {
    return { purged: false as const, reason: 'already_deleted' as const };
  }

  const path = review.storage_path;
  if (path && path !== 'pending') {
    const { error } = await supabase.storage.from(MEDICAL_RECORD_STORAGE_BUCKET).remove([path]);
    if (error) {
      console.error('[medical-record-reviews] storage purge error:', error);
      throw new Error(error.message || 'Failed to delete PDF from storage');
    }
  }

  const { data, error } = await supabase
    .from('medical_record_reviews')
    .update({
      file_url: null,
      storage_path: null,
      file_deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', review.id)
    .select()
    .single();

  if (error) throw error;
  return { purged: true as const, review: data };
}

export async function requireMedicalRecordAccess(opts?: { requireWrite?: boolean }) {
  const session = await getAdminSession();
  if (!session.ok) {
    return { ok: false as const, status: session.status, error: session.error };
  }

  const role = session.role;
  if (role === 'finance_manager') {
    return {
      ok: false as const,
      status: 403 as const,
      error: 'Finance manager cannot access this section.',
    };
  }
  if (role !== 'admin' && role !== 'branch_manager') {
    return { ok: false as const, status: 403 as const, error: 'Forbidden' };
  }

  if (!supabaseUrl || !serviceKey) {
    return { ok: false as const, status: 500 as const, error: 'Missing Supabase env vars' };
  }

  const supabase = createServiceSupabase();

  if (opts?.requireWrite) {
    if (await isReadOnlyBranchManager(supabase, session.adminUserId)) {
      return {
        ok: false as const,
        status: 403 as const,
        error: 'View-only access. You cannot modify data.',
      };
    }
  }

  return {
    ok: true as const,
    supabase,
    adminUserId: session.adminUserId,
    role,
  };
}
