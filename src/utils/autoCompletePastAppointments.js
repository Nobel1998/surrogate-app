import { supabase } from '../lib/supabase';
import { normalizeAppointmentTime } from './syncAppointmentFromMedicalReport';

/**
 * Build a local Date from appointment_date + appointment_time.
 * Returns null if date cannot be parsed.
 */
export function getAppointmentDateTime(appointment) {
  if (!appointment?.appointment_date) return null;

  const dateStr = String(appointment.appointment_date).trim();
  const isoDate = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!isoDate) return null;

  const year = parseInt(isoDate[1], 10);
  const month = parseInt(isoDate[2], 10) - 1;
  const day = parseInt(isoDate[3], 10);
  const timeStr = normalizeAppointmentTime(appointment.appointment_time);
  const [hh, mm, ss] = timeStr.split(':').map((n) => parseInt(n, 10));

  return new Date(year, month, day, hh || 0, mm || 0, ss || 0, 0);
}

/** True when scheduled appointment date+time is at or before now. */
export function isAppointmentPastDue(appointment, now = new Date()) {
  if (!appointment || appointment.status !== 'scheduled') return false;
  const dt = getAppointmentDateTime(appointment);
  if (!dt || Number.isNaN(dt.getTime())) return false;
  return dt.getTime() <= now.getTime();
}

/** Status for UI: past-due scheduled appointments display as completed. */
export function getEffectiveAppointmentStatus(appointment, now = new Date()) {
  if (isAppointmentPastDue(appointment, now)) return 'completed';
  return appointment?.status || 'scheduled';
}

/**
 * Persist scheduled → completed for appointments whose date/time has passed.
 * Only the appointment owner (surrogate) can UPDATE via RLS.
 * Returns the list with statuses updated locally.
 */
export async function autoCompletePastAppointments({
  table,
  appointments,
  cancelReminder,
  now = new Date(),
}) {
  if (!table || !Array.isArray(appointments) || appointments.length === 0) {
    return appointments || [];
  }

  const overdue = appointments.filter((a) => isAppointmentPastDue(a, now));
  if (overdue.length === 0) return appointments;

  const completedIds = [];
  await Promise.all(
    overdue.map(async (apt) => {
      try {
        const { error } = await supabase
          .from(table)
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('id', apt.id)
          .eq('status', 'scheduled');

        if (error) {
          // Parent viewers cannot update; still treat as completed in UI
          console.log(`autoComplete ${table} ${apt.id}:`, error.message);
        }
        completedIds.push(apt.id);
        if (typeof cancelReminder === 'function') {
          const prefix = table === 'ob_appointments' ? 'ob' : 'ivf';
          await cancelReminder(`${prefix}_${apt.id}`).catch(() => {});
        }
      } catch (e) {
        console.log(`autoComplete ${table} ${apt.id} failed:`, e?.message || e);
        completedIds.push(apt.id);
      }
    })
  );

  if (completedIds.length === 0) return appointments;

  const idSet = new Set(completedIds);
  return appointments.map((a) =>
    idSet.has(a.id) ? { ...a, status: 'completed' } : a
  );
}
