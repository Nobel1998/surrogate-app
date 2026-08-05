/**
 * Sync OB/IVF appointments from medical check-in (service role).
 * - visit date → completed (source_kind=visit)
 * - next check → scheduled (source_kind=next)
 */

import { splitProviderContact } from '@/lib/contactDisplay';

export const EMPTY_PROVIDER_CONTACT = '888888';

export function resolveProviderContact(value: unknown): string {
  const trimmed = value == null ? '' : String(value).trim();
  return trimmed || EMPTY_PROVIDER_CONTACT;
}

export function parseNextCheckDateToISO(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const mdy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mdy) {
    return `${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`;
  }
  return null;
}

export function isDateOnlyBeforeToday(isoDate: unknown): boolean {
  const parsed = parseNextCheckDateToISO(isoDate);
  if (!parsed) return false;
  const [y, m, d] = parsed.split('-').map((n) => parseInt(n, 10));
  const target = new Date(y, m - 1, d, 0, 0, 0, 0);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  return target.getTime() < today.getTime();
}

/**
 * Parse time to HH:MM:SS. Returns null when empty or unparseable.
 */
export function parseAppointmentTime(value: unknown): string | null {
  if (value == null || !String(value).trim()) return null;
  const s = String(value).trim();
  const m24 = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (m24) {
    const h = Math.min(23, Math.max(0, parseInt(m24[1], 10)));
    const min = Math.min(59, Math.max(0, parseInt(m24[2], 10)));
    const sec =
      m24[3] != null ? Math.min(59, Math.max(0, parseInt(m24[3], 10))) : 0;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  const m12 = s.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (m12) {
    let h = parseInt(m12[1], 10) % 12;
    if (m12[3].toLowerCase() === 'pm') h += 12;
    const min = parseInt(m12[2], 10);
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;
  }
  return null;
}

/** Normalize for display / past-due; fallback only for incomplete stored rows. */
export function normalizeAppointmentTime(value: unknown): string {
  return parseAppointmentTime(value) || '09:00:00';
}

export function appointmentTableForMedicalStage(stage: string): 'ob_appointments' | 'ivf_appointments' {
  return stage === 'OBGYN' ? 'ob_appointments' : 'ivf_appointments';
}

export function otherAppointmentTableForMedicalStage(
  stage: string
): 'ob_appointments' | 'ivf_appointments' {
  return stage === 'OBGYN' ? 'ivf_appointments' : 'ob_appointments';
}

/** Normalize medical check-in test_site checkbox values to a string array. */
export function normalizeTestSites(testSite: unknown): string[] {
  if (Array.isArray(testSite)) {
    return testSite.map((s) => String(s || '').trim()).filter(Boolean);
  }
  if (typeof testSite === 'string' && testSite.trim()) {
    return [testSite.trim()];
  }
  return [];
}

/**
 * Appointment location from medical check-in test_site:
 * 1) none selected → hide location (null)
 * 2) labcorp / ivf_clinic → store keys (UI translates)
 * 3) others → medical clinic name if filled, else key "others"
 */
export function resolveAppointmentLocationFromTestSite(
  testSite: unknown,
  medInfo: Record<string, any> | null | undefined,
  stage: string
): { clinicName: string | null; clinicAddress: string | null; usedMedicalClinic: boolean } {
  const sites = normalizeTestSites(testSite);
  if (sites.length === 0) {
    return { clinicName: null, clinicAddress: null, usedMedicalClinic: false };
  }

  const hasOthers = sites.includes('others');
  const specific = sites.filter((s) => s !== 'others');

  if (hasOthers) {
    const clinicName =
      stage === 'OBGYN'
        ? String(medInfo?.obgyn_clinic_name || '').trim()
        : String(medInfo?.ivf_clinic_name || '').trim();
    const clinicAddress =
      stage === 'OBGYN'
        ? String(medInfo?.obgyn_clinic_address || '').trim() || null
        : String(medInfo?.ivf_clinic_address || '').trim() || null;

    if (clinicName) {
      return { clinicName, clinicAddress, usedMedicalClinic: true };
    }

    const keys = [...specific, 'others'];
    return {
      clinicName: keys.join(','),
      clinicAddress: null,
      usedMedicalClinic: false,
    };
  }

  return {
    clinicName: specific.join(','),
    clinicAddress: null,
    usedMedicalClinic: false,
  };
}

async function writeAppointmentRow(
  supabase: any,
  table: string,
  existingId: string | null,
  row: Record<string, any>
) {
  const attempt = async (data: Record<string, any>) => {
    if (existingId) {
      const { error } = await supabase.from(table).update(data).eq('id', existingId);
      if (error) throw error;
      return existingId;
    }
    const { data: inserted, error } = await supabase.from(table).insert(data).select('id').single();
    if (error) throw error;
    return inserted.id as string;
  };

  const stripMissingColumn = (err: any, data: Record<string, any>) => {
    const msg = String(err?.message || '');
    if (err?.code !== 'PGRST204') return null;
    if (msg.includes('clinic_email') && 'clinic_email' in data) {
      const { clinic_email: _omit, ...rest } = data;
      return rest;
    }
    if (msg.includes('medical_stage') && 'medical_stage' in data) {
      const { medical_stage: _omit, ...rest } = data;
      return rest;
    }
    return null;
  };

  try {
    return await attempt(row);
  } catch (err: any) {
    const stripped = stripMissingColumn(err, row);
    if (stripped) {
      try {
        return await attempt(stripped);
      } catch (err2: any) {
        const stripped2 = stripMissingColumn(err2, stripped);
        if (stripped2) return await attempt(stripped2);
        throw err2;
      }
    }
    throw err;
  }
}

function stageFromAppointmentNotes(notes: unknown): string | null {
  const m = String(notes || '').match(/\((Pre-Transfer|Post-Transfer|OBGYN)\)/i);
  return m ? m[1] : null;
}

async function upsertAppointmentByKind(
  supabase: any,
  opts: {
    table: 'ob_appointments' | 'ivf_appointments';
    reportId: string;
    userId: string;
    kind: 'visit' | 'next';
    stage: string;
    appointmentDateISO: string;
    payload: Record<string, any>;
  }
) {
  const { table, reportId, userId, kind, stage, appointmentDateISO, payload } = opts;
  const targetTime = parseAppointmentTime(payload.appointment_time);
  if (!targetTime) {
    throw new Error('appointment_time is required to sync appointment');
  }
  const row: Record<string, any> = {
    ...payload,
    source_medical_report_id: reportId,
    source_kind: kind,
    medical_stage: stage || null,
    appointment_time: targetTime,
    updated_at: new Date().toISOString(),
  };

  const { data: linked } = await supabase
    .from(table)
    .select('id')
    .eq('source_medical_report_id', reportId)
    .eq('source_kind', kind)
    .maybeSingle();

  const { data: sameDateRaw } = await supabase
    .from(table)
    .select('id, source_medical_report_id, source_kind, status, appointment_time, notes')
    .eq('user_id', userId)
    .eq('appointment_date', appointmentDateISO)
    .neq('status', 'cancelled')
    .order('updated_at', { ascending: false });

  const reportIds = [
    ...new Set(
      (sameDateRaw || [])
        .map((r: any) => r.source_medical_report_id)
        .filter(Boolean)
    ),
  ];
  const stageByReportId: Record<string, string> = {};
  if (reportIds.length) {
    const { data: reports } = await supabase
      .from('medical_reports')
      .select('id, stage')
      .in('id', reportIds);
    (reports || []).forEach((rep: any) => {
      if (rep?.id) stageByReportId[rep.id] = rep.stage;
    });
  }

  const resolveCandidateStage = (r: any) => {
    if (r.medical_stage) return r.medical_stage;
    if (r.source_medical_report_id && stageByReportId[r.source_medical_report_id]) {
      return stageByReportId[r.source_medical_report_id];
    }
    return stageFromAppointmentNotes(r.notes);
  };

  const sameSlotRows = (sameDateRaw || []).filter((r: any) => {
    const rowTime = parseAppointmentTime(r.appointment_time);
    if (!rowTime || rowTime !== targetTime) return false;

    const candidateStage = resolveCandidateStage(r);
    if (stage && candidateStage && candidateStage !== stage) return false;

    if (kind === 'visit') {
      if (r.source_medical_report_id === reportId && r.source_kind === 'next') return false;
      return true;
    }
    if (r.source_kind === 'visit') return false;
    if (r.status === 'scheduled') return true;
    if (r.source_medical_report_id === reportId && r.source_kind === 'next') return true;
    return false;
  });

  let targetId: string | null = null;
  if (sameSlotRows.length) {
    const linkedSame = sameSlotRows.find((r: any) => r.id === linked?.id);
    targetId = linkedSame?.id || sameSlotRows[0].id;
    const extras = sameSlotRows.filter((r: any) => r.id !== targetId).map((r: any) => r.id);
    if (extras.length) {
      await supabase.from(table).delete().in('id', extras);
    }
  } else if (linked?.id) {
    targetId = linked.id;
  }

  if (linked?.id && targetId && linked.id !== targetId) {
    await supabase.from(table).delete().eq('id', linked.id);
  }

  return writeAppointmentRow(supabase, table, targetId, row);
}

export async function syncAppointmentFromMedicalReport(
  supabase: any,
  opts: {
    reportId: string;
    userId: string;
    stage: string;
    providerName?: string | null;
    reportData?: Record<string, any> | null;
    visitDate?: string | null;
    visitTime?: string | null;
  }
) {
  const { reportId, userId, stage } = opts;
  let providerName = opts.providerName || null;
  const reportData = opts.reportData || {};

  if (!reportId || !userId || !stage) {
    return { ok: false, skipped: true as const, reason: 'missing_args' };
  }

  const nextDateISO = parseNextCheckDateToISO(reportData.next_appointment_date);
  const visitDateISO = parseNextCheckDateToISO(opts.visitDate);
  const targetTable = appointmentTableForMedicalStage(stage);
  const otherTable = otherAppointmentTableForMedicalStage(stage);

  await supabase.from(otherTable).delete().eq('source_medical_report_id', reportId);

  const { data: matchRow } = await supabase
    .from('surrogate_matches')
    .select('id')
    .eq('surrogate_id', userId)
    .in('status', ['active', 'matched'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let clinicPhone: string | null = EMPTY_PROVIDER_CONTACT;
  let clinicEmail: string | null = null;

  const { data: medInfo } = await supabase
    .from('surrogate_medical_info')
    .select(
      'ivf_clinic_name, ivf_clinic_address, ivf_clinic_phone, ivf_clinic_email, obgyn_clinic_name, obgyn_clinic_address, obgyn_clinic_phone, obgyn_clinic_email, obgyn_doctor_name'
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (stage === 'OBGYN') {
    clinicPhone = resolveProviderContact(medInfo?.obgyn_clinic_phone);
    clinicEmail = String(medInfo?.obgyn_clinic_email || '').trim() || null;
    if (!providerName && medInfo?.obgyn_doctor_name) {
      providerName = medInfo.obgyn_doctor_name;
    }
  } else {
    clinicPhone = resolveProviderContact(medInfo?.ivf_clinic_phone);
    clinicEmail = String(medInfo?.ivf_clinic_email || '').trim() || null;
  }

  const location = resolveAppointmentLocationFromTestSite(
    reportData?.test_site,
    medInfo,
    stage
  );
  const clinicName = location.clinicName;
  const clinicAddress = location.clinicAddress;

  const fromReport = splitProviderContact(reportData.provider_contact);
  if (fromReport.phone) clinicPhone = fromReport.phone;
  if (fromReport.email) clinicEmail = fromReport.email;

  const basePayload = {
    user_id: userId,
    match_id: matchRow?.id || null,
    provider_name: providerName || null,
    clinic_name: clinicName || null,
    clinic_address: clinicAddress || null,
    clinic_phone: clinicPhone || EMPTY_PROVIDER_CONTACT,
    clinic_email: clinicEmail,
    medical_stage: stage,
  };

  let visitAppointmentId: string | null = null;
  if (visitDateISO) {
    const visitTimeNorm = parseAppointmentTime(opts.visitTime || reportData.visit_time);
    if (visitTimeNorm) {
      visitAppointmentId = await upsertAppointmentByKind(supabase, {
        table: targetTable,
        reportId,
        userId,
        kind: 'visit',
        stage,
        appointmentDateISO: visitDateISO,
        payload: {
          ...basePayload,
          appointment_date: visitDateISO,
          appointment_time: visitTimeNorm,
          notes: String(reportData?.notes || '').trim()
            ? String(reportData.notes).trim()
            : `Medical check-in visit (${stage})`,
          status: 'completed',
        },
      });
    }
  } else {
    await supabase
      .from(targetTable)
      .delete()
      .eq('source_medical_report_id', reportId)
      .eq('source_kind', 'visit');
  }

  let nextAppointmentId: string | null = null;
  let appointmentTime: string | null = null;
  if (nextDateISO) {
    // Time optional: default to 09:00 when date is set without a time
    appointmentTime =
      parseAppointmentTime(reportData.next_appointment_time) || '09:00:00';
    nextAppointmentId = await upsertAppointmentByKind(supabase, {
      table: targetTable,
      reportId,
      userId,
      kind: 'next',
      stage,
      appointmentDateISO: nextDateISO,
      payload: {
        ...basePayload,
        appointment_date: nextDateISO,
        appointment_time: appointmentTime,
        notes: String(reportData?.notes || '').trim()
          ? String(reportData.notes).trim()
          : `From medical check-in next check (${stage})`,
        status: 'scheduled',
      },
    });
  } else {
    await supabase
      .from(targetTable)
      .delete()
      .eq('source_medical_report_id', reportId)
      .eq('source_kind', 'next');
  }

  return {
    ok: true,
    table: targetTable,
    visitAppointmentId,
    appointmentId: nextAppointmentId,
    appointmentDate: nextDateISO,
    appointmentTime,
    clinicName,
    providerName,
    cleared: !nextDateISO && !visitDateISO,
  };
}
