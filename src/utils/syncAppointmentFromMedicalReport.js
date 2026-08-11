import { supabase } from '../lib/supabase';
import {
  EMPTY_PROVIDER_CONTACT,
  splitProviderContact,
} from './contactDisplay';

export { EMPTY_PROVIDER_CONTACT };

/**
 * Convert MM-DD-YYYY or YYYY-MM-DD to YYYY-MM-DD.
 */
export function parseNextCheckDateToISO(value) {
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

/**
 * True when YYYY-MM-DD is strictly before today's local calendar date.
 */
export function isDateOnlyBeforeToday(isoDate) {
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
 * (Do NOT invent 09:00 — that created phantom morning appointments.)
 */
export function parseAppointmentTime(value) {
  if (value == null || !String(value).trim()) return null;
  const s = String(value).trim();
  const m24 = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (m24) {
    const h = Math.min(23, Math.max(0, parseInt(m24[1], 10)));
    const min = Math.min(59, Math.max(0, parseInt(m24[2], 10)));
    const sec = m24[3] != null ? Math.min(59, Math.max(0, parseInt(m24[3], 10))) : 0;
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

/**
 * Normalize time to HH:MM:SS for display / past-due checks.
 * Falls back only when a stored appointment row has no usable time.
 */
export function normalizeAppointmentTime(value) {
  return parseAppointmentTime(value) || '09:00:00';
}

export function appointmentTableForMedicalStage(stage) {
  return stage === 'OBGYN' ? 'ob_appointments' : 'ivf_appointments';
}

export function otherAppointmentTableForMedicalStage(stage) {
  return stage === 'OBGYN' ? 'ivf_appointments' : 'ob_appointments';
}

export function resolveProviderContact(value) {
  const trimmed = value == null ? '' : String(value).trim();
  return trimmed || EMPTY_PROVIDER_CONTACT;
}

/** Normalize medical check-in test_site checkbox values to a string array. */
export function normalizeTestSites(testSite) {
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
 * 2) selected sites → store keys (UI translates); legacy "others" maps to local_monitor_clinic
 * No medical-info clinic name fallback.
 */
export function resolveAppointmentLocationFromTestSite(testSite) {
  const sites = normalizeTestSites(testSite).map((s) =>
    s === 'others' ? 'local_monitor_clinic' : s
  );
  // de-dupe while preserving order
  const unique = [];
  for (const s of sites) {
    if (!unique.includes(s)) unique.push(s);
  }
  if (unique.length === 0) {
    return { clinicName: null, clinicAddress: null };
  }
  return {
    clinicName: unique.join(','),
    clinicAddress: null,
  };
}

const TEST_SITE_KEYS = new Set(['labcorp', 'ivf_clinic', 'local_monitor_clinic', 'others']);

/** True when clinic_name is only check-in test_site key(s). */
export function isTestSiteClinicName(clinicName) {
  const raw = String(clinicName || '').trim();
  if (!raw) return false;
  const parts = raw.split(',').map((p) => p.trim().toLowerCase()).filter(Boolean);
  if (parts.length === 0) return false;
  return parts.every((p) => TEST_SITE_KEYS.has(p));
}

/**
 * Translate a single test_site key (or pass-through unknown values).
 */
export function translateTestSiteKey(key, t) {
  const k = String(key || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (k === 'labcorp') return t?.('medicalReport.labcorp') || 'Labcorp';
  if (k === 'ivf_clinic') return t?.('medicalReport.ivfClinic') || 'IVF clinic';
  if (k === 'local_monitor_clinic' || k === 'others') {
    return t?.('medicalReport.localMonitorClinic') || 'Local monitor clinic';
  }
  return String(key || '').trim();
}

/**
 * Human-readable appointment location. Returns null when the row should hide location.
 */
export function formatAppointmentLocationLabel(clinicName, t) {
  const raw = String(clinicName || '').trim();
  if (!raw) return null;
  // Legacy sync defaults when test_site was ignored
  if (raw === 'IVF Clinic' || raw === 'OB Clinic') return null;

  return raw
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => translateTestSiteKey(p, t))
    .join(', ');
}

/**
 * Contact + location for appointments come only from check-in fields
 * (test_site, provider_name, provider_contact) — never medical info.
 */
function loadCheckInClinicContext(providerName, reportData) {
  const location = resolveAppointmentLocationFromTestSite(reportData?.test_site);
  const fromReport = splitProviderContact(reportData?.provider_contact);
  return {
    clinicName: location.clinicName,
    clinicAddress: null,
    clinicPhone: fromReport.phone || EMPTY_PROVIDER_CONTACT,
    clinicEmail: fromReport.email || null,
    providerName: providerName || null,
  };
}

async function writeAppointmentRow(table, existingId, row) {
  const attempt = async (data) => {
    if (existingId) {
      const { data: updated, error } = await supabase
        .from(table)
        .update(data)
        .eq('id', existingId)
        .select('id')
        .single();
      if (error) throw error;
      return updated.id;
    }
    const { data: inserted, error } = await supabase
      .from(table)
      .insert(data)
      .select('id')
      .single();
    if (error) throw error;
    return inserted.id;
  };

  const stripMissingColumn = (err, data) => {
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
  } catch (err) {
    const stripped = stripMissingColumn(err, row);
    if (stripped) {
      try {
        return await attempt(stripped);
      } catch (err2) {
        const stripped2 = stripMissingColumn(err2, stripped);
        if (stripped2) return await attempt(stripped2);
        throw err2;
      }
    }
    throw err;
  }
}

function stageFromAppointmentNotes(notes) {
  const m = String(notes || '').match(/\((Pre-Transfer|Post-Transfer|OBGYN)\)/i);
  return m ? m[1] : null;
}

/**
 * Upsert appointment for a report kind, merging only when date, time, AND
 * medical stage match. Post-Transfer must not overwrite Pre-Transfer.
 */
async function upsertAppointmentByKind({
  table,
  reportId,
  userId,
  kind,
  stage,
  appointmentDateISO,
  payload,
}) {
  const row = {
    ...payload,
    source_medical_report_id: reportId,
    source_kind: kind,
    medical_stage: stage || null,
    updated_at: new Date().toISOString(),
  };
  const targetTime = parseAppointmentTime(payload.appointment_time);
  if (!targetTime) {
    throw new Error('appointment_time is required to sync appointment');
  }
  row.appointment_time = targetTime;

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
        .map((r) => r.source_medical_report_id)
        .filter(Boolean)
    ),
  ];
  const stageByReportId = {};
  if (reportIds.length) {
    const { data: reports } = await supabase
      .from('medical_reports')
      .select('id, stage')
      .in('id', reportIds);
    (reports || []).forEach((rep) => {
      if (rep?.id) stageByReportId[rep.id] = rep.stage;
    });
  }

  const resolveCandidateStage = (r) => {
    if (r.medical_stage) return r.medical_stage;
    if (r.source_medical_report_id && stageByReportId[r.source_medical_report_id]) {
      return stageByReportId[r.source_medical_report_id];
    }
    return stageFromAppointmentNotes(r.notes);
  };

  const sameSlotRows = (sameDateRaw || []).filter((r) => {
    const rowTime = parseAppointmentTime(r.appointment_time);
    if (!rowTime || rowTime !== targetTime) return false;

    const candidateStage = resolveCandidateStage(r);
    // Require same medical stage when candidate stage is known
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

  let targetId = null;
  if (sameSlotRows.length) {
    const linkedSame = sameSlotRows.find((r) => r.id === linked?.id);
    targetId = linkedSame?.id || sameSlotRows[0].id;

    const extras = sameSlotRows.filter((r) => r.id !== targetId).map((r) => r.id);
    if (extras.length) {
      await supabase.from(table).delete().in('id', extras);
    }
  } else if (linked?.id) {
    targetId = linked.id;
  }

  if (linked?.id && targetId && linked.id !== targetId) {
    await supabase.from(table).delete().eq('id', linked.id);
  }

  return writeAppointmentRow(table, targetId, row);
}

/**
 * Upsert OB/IVF appointments from a medical check-in:
 * - visit date → completed appointment (source_kind=visit)
 * - next check date → scheduled appointment (source_kind=next)
 */
export async function syncAppointmentFromMedicalReport({
  reportId,
  userId,
  stage,
  providerName,
  reportData,
  visitDate,
  visitTime,
}) {
  if (!reportId || !userId || !stage) {
    return { ok: false, skipped: true, reason: 'missing_args' };
  }

  const nextDateISO = parseNextCheckDateToISO(reportData?.next_appointment_date);
  const visitDateISO = parseNextCheckDateToISO(visitDate);
  const targetTable = appointmentTableForMedicalStage(stage);
  const otherTable = otherAppointmentTableForMedicalStage(stage);

  // Clear any appointment wrongly linked on the other table (stage change)
  await supabase.from(otherTable).delete().eq('source_medical_report_id', reportId);

  const { data: matchRow } = await supabase
    .from('surrogate_matches')
    .select('id')
    .eq('surrogate_id', userId)
    .in('status', ['active', 'matched'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const clinic = loadCheckInClinicContext(providerName, reportData);

  const basePayload = {
    user_id: userId,
    match_id: matchRow?.id || null,
    provider_name: clinic.providerName || null,
    clinic_name: clinic.clinicName || null,
    clinic_address: null,
    clinic_phone: clinic.clinicPhone,
    clinic_email: clinic.clinicEmail,
    medical_stage: stage,
  };

  let visitAppointmentId = null;
  if (visitDateISO) {
    const visitTimeNorm = parseAppointmentTime(visitTime || reportData?.visit_time);
    if (visitTimeNorm) {
      visitAppointmentId = await upsertAppointmentByKind({
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

  let nextAppointmentId = null;
  let appointmentTime = null;
  if (nextDateISO) {
    // Time optional: default to 09:00 when date is set without a time
    appointmentTime =
      parseAppointmentTime(reportData?.next_appointment_time) || '09:00:00';
    nextAppointmentId = await upsertAppointmentByKind({
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
    clinicName: clinic.clinicName,
    providerName: clinic.providerName,
    cleared: !nextDateISO && !visitDateISO,
  };
}
