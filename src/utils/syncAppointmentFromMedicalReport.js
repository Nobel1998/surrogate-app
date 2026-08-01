import { supabase } from '../lib/supabase';

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

/**
 * Upsert OB or IVF appointment from a medical check-in's next check fields.
 * Pre-Transfer / Post-Transfer → ivf_appointments
 * OBGYN → ob_appointments
 */
export async function syncAppointmentFromMedicalReport({
  reportId,
  userId,
  stage,
  providerName,
  reportData,
}) {
  if (!reportId || !userId || !stage) {
    return { ok: false, skipped: true, reason: 'missing_args' };
  }

  const nextDateISO = parseNextCheckDateToISO(reportData?.next_appointment_date);
  const targetTable = appointmentTableForMedicalStage(stage);
  const otherTable = otherAppointmentTableForMedicalStage(stage);

  // Clear any appointment wrongly linked on the other table (stage change)
  await supabase
    .from(otherTable)
    .delete()
    .eq('source_medical_report_id', reportId);

  if (!nextDateISO) {
    await supabase.from(targetTable).delete().eq('source_medical_report_id', reportId);
    return { ok: true, cleared: true, table: targetTable };
  }

  const appointmentTime = normalizeAppointmentTime(reportData?.next_appointment_time);

  const { data: matchRow } = await supabase
    .from('surrogate_matches')
    .select('id')
    .eq('surrogate_id', userId)
    .in('status', ['active', 'matched'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let clinicName = null;
  let clinicAddress = null;
  let clinicPhone = null;
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
      clinicPhone = medInfo?.obgyn_clinic_phone || null;
      if (!providerName && medInfo?.obgyn_doctor_name) {
        providerName = medInfo.obgyn_doctor_name;
      }
    } else {
      clinicName = medInfo?.ivf_clinic_name || 'IVF Clinic';
      clinicAddress = medInfo?.ivf_clinic_address || null;
      clinicPhone = medInfo?.ivf_clinic_phone || null;
    }
  } catch {
    clinicName = stage === 'OBGYN' ? 'OB Clinic' : 'IVF Clinic';
  }

  const payload = {
    user_id: userId,
    match_id: matchRow?.id || null,
    appointment_date: nextDateISO,
    appointment_time: appointmentTime,
    provider_name: providerName || null,
    clinic_name: clinicName,
    clinic_address: clinicAddress,
    clinic_phone: clinicPhone,
    notes: `From medical check-in (${stage})`,
    status: 'scheduled',
    source_medical_report_id: reportId,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from(targetTable)
    .select('id')
    .eq('source_medical_report_id', reportId)
    .maybeSingle();

  let appointmentId = existing?.id || null;
  if (existing?.id) {
    const { data: updated, error } = await supabase
      .from(targetTable)
      .update(payload)
      .eq('id', existing.id)
      .select('id')
      .single();
    if (error) throw error;
    appointmentId = updated.id;
  } else {
    const { data: inserted, error } = await supabase
      .from(targetTable)
      .insert(payload)
      .select('id')
      .single();
    if (error) throw error;
    appointmentId = inserted.id;
  }

  return {
    ok: true,
    table: targetTable,
    appointmentId,
    appointmentDate: nextDateISO,
    appointmentTime,
    clinicName,
    providerName: payload.provider_name,
  };
}
