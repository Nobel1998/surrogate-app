/**
 * Sync OB/IVF appointments from medical check-in (service role).
 * - visit date → completed (source_kind=visit)
 * - next check → scheduled (source_kind=next)
 */

export const EMPTY_PROVIDER_CONTACT = '888888';

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

export function normalizeAppointmentTime(value: unknown): string {
  if (value == null || !String(value).trim()) return '09:00:00';
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
  return '09:00:00';
}

export function appointmentTableForMedicalStage(stage: string): 'ob_appointments' | 'ivf_appointments' {
  return stage === 'OBGYN' ? 'ob_appointments' : 'ivf_appointments';
}

export function otherAppointmentTableForMedicalStage(
  stage: string
): 'ob_appointments' | 'ivf_appointments' {
  return stage === 'OBGYN' ? 'ivf_appointments' : 'ob_appointments';
}

export function resolveProviderContact(value: unknown): string {
  const trimmed = value == null ? '' : String(value).trim();
  return trimmed || EMPTY_PROVIDER_CONTACT;
}

async function upsertAppointmentByKind(
  supabase: any,
  opts: {
    table: 'ob_appointments' | 'ivf_appointments';
    reportId: string;
    kind: 'visit' | 'next';
    payload: Record<string, any>;
  }
) {
  const { table, reportId, kind, payload } = opts;
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
    const { error } = await supabase.from(table).update(row).eq('id', existing.id);
    if (error) throw error;
    return existing.id as string;
  }

  const { data: inserted, error } = await supabase.from(table).insert(row).select('id').single();
  if (error) throw error;
  return inserted.id as string;
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

  let clinicName: string | null = stage === 'OBGYN' ? 'OB Clinic' : 'IVF Clinic';
  let clinicAddress: string | null = null;
  let clinicPhone: string | null = EMPTY_PROVIDER_CONTACT;

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
    if (!providerName && medInfo?.obgyn_doctor_name) {
      providerName = medInfo.obgyn_doctor_name;
    }
  } else {
    clinicName = medInfo?.ivf_clinic_name || 'IVF Clinic';
    clinicAddress = medInfo?.ivf_clinic_address || null;
    clinicPhone = resolveProviderContact(medInfo?.ivf_clinic_phone);
  }

  const contactFromReport = resolveProviderContact(reportData.provider_contact);
  if (contactFromReport !== EMPTY_PROVIDER_CONTACT) {
    clinicPhone = contactFromReport;
  }

  const basePayload = {
    user_id: userId,
    match_id: matchRow?.id || null,
    provider_name: providerName || null,
    clinic_name: clinicName,
    clinic_address: clinicAddress,
    clinic_phone: clinicPhone || EMPTY_PROVIDER_CONTACT,
  };

  let visitAppointmentId: string | null = null;
  if (visitDateISO) {
    visitAppointmentId = await upsertAppointmentByKind(supabase, {
      table: targetTable,
      reportId,
      kind: 'visit',
      payload: {
        ...basePayload,
        appointment_date: visitDateISO,
        appointment_time: normalizeAppointmentTime(opts.visitTime || reportData.visit_time),
        notes: String(reportData?.notes || '').trim()
          ? String(reportData.notes).trim()
          : `Medical check-in visit (${stage})`,
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

  let nextAppointmentId: string | null = null;
  let appointmentTime: string | null = null;
  if (nextDateISO) {
    appointmentTime = normalizeAppointmentTime(reportData.next_appointment_time);
    nextAppointmentId = await upsertAppointmentByKind(supabase, {
      table: targetTable,
      reportId,
      kind: 'next',
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
