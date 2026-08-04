import { supabase } from '../lib/supabase';

export const EMPTY_PROVIDER_CONTACT = '888888';

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
 * Normalize time to HH:MM:SS. Default 09:00:00 when empty.
 */
export function normalizeAppointmentTime(value) {
  if (value == null || !String(value).trim()) return '09:00:00';
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
  return '09:00:00';
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

async function loadClinicContext(userId, stage, providerName) {
  let clinicName = stage === 'OBGYN' ? 'OB Clinic' : 'IVF Clinic';
  let clinicAddress = null;
  let clinicPhone = EMPTY_PROVIDER_CONTACT;
  let resolvedProvider = providerName || null;

  try {
    const { data: medInfo } = await supabase
      .from('surrogate_medical_info')
      .select(
        'ivf_clinic_name, ivf_clinic_address, ivf_clinic_phone, obgyn_clinic_name, obgyn_clinic_address, obgyn_clinic_phone, obgyn_doctor_name'
      )
      .eq('user_id', userId)
      .maybeSingle();
    if (stage === 'OBGYN') {
      clinicName = medInfo?.obgyn_clinic_name || 'OB Clinic';
      clinicAddress = medInfo?.obgyn_clinic_address || null;
      clinicPhone = resolveProviderContact(medInfo?.obgyn_clinic_phone);
      if (!resolvedProvider && medInfo?.obgyn_doctor_name) {
        resolvedProvider = medInfo.obgyn_doctor_name;
      }
    } else {
      clinicName = medInfo?.ivf_clinic_name || 'IVF Clinic';
      clinicAddress = medInfo?.ivf_clinic_address || null;
      clinicPhone = resolveProviderContact(medInfo?.ivf_clinic_phone);
    }
  } catch {
    clinicName = stage === 'OBGYN' ? 'OB Clinic' : 'IVF Clinic';
    clinicPhone = EMPTY_PROVIDER_CONTACT;
  }

  return { clinicName, clinicAddress, clinicPhone, providerName: resolvedProvider };
}

async function upsertAppointmentByKind({
  table,
  reportId,
  kind,
  payload,
}) {
  const { data: existing } = await supabase
    .from(table)
    .select('id')
    .eq('source_medical_report_id', reportId)
    .eq('source_kind', kind)
    .maybeSingle();

  const row = {
    ...payload,
    source_medical_report_id: reportId,
    source_kind: kind,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { data: updated, error } = await supabase
      .from(table)
      .update(row)
      .eq('id', existing.id)
      .select('id')
      .single();
    if (error) throw error;
    return updated.id;
  }

  const { data: inserted, error } = await supabase
    .from(table)
    .insert(row)
    .select('id')
    .single();
  if (error) throw error;
  return inserted.id;
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

  const clinic = await loadClinicContext(userId, stage, providerName);
  const contactFromReport = resolveProviderContact(reportData?.provider_contact);
  const clinicPhone =
    contactFromReport !== EMPTY_PROVIDER_CONTACT
      ? contactFromReport
      : clinic.clinicPhone || EMPTY_PROVIDER_CONTACT;

  const basePayload = {
    user_id: userId,
    match_id: matchRow?.id || null,
    provider_name: clinic.providerName || null,
    clinic_name: clinic.clinicName,
    clinic_address: clinic.clinicAddress,
    clinic_phone: clinicPhone,
  };

  let visitAppointmentId = null;
  if (visitDateISO) {
    visitAppointmentId = await upsertAppointmentByKind({
      table: targetTable,
      reportId,
      kind: 'visit',
      payload: {
        ...basePayload,
        appointment_date: visitDateISO,
        appointment_time: '09:00:00',
        notes: `Medical check-in visit (${stage})`,
        status: 'completed',
      },
    });
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
    appointmentTime = normalizeAppointmentTime(reportData?.next_appointment_time);
    nextAppointmentId = await upsertAppointmentByKind({
      table: targetTable,
      reportId,
      kind: 'next',
      payload: {
        ...basePayload,
        appointment_date: nextDateISO,
        appointment_time: appointmentTime,
        notes: `From medical check-in next check (${stage})`,
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
