export const EMPTY_PROVIDER_CONTACT = '888888';

export function looksLikeEmail(value: unknown): boolean {
  const s = String(value ?? '').trim();
  if (!s || s === EMPTY_PROVIDER_CONTACT) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export function splitProviderContact(value: unknown): { phone: string | null; email: string | null } {
  const trimmed = value == null ? '' : String(value).trim();
  if (!trimmed || trimmed === EMPTY_PROVIDER_CONTACT) {
    return { phone: null, email: null };
  }
  if (looksLikeEmail(trimmed)) return { phone: null, email: trimmed };
  return { phone: trimmed, email: null };
}

export function getAppointmentContacts(appointment: {
  clinic_phone?: string | null;
  clinic_email?: string | null;
}): { phone: string | null; email: string | null; showPlaceholder: boolean } {
  let phone = String(appointment?.clinic_phone || '').trim();
  let email = String(appointment?.clinic_email || '').trim();

  if (looksLikeEmail(phone)) {
    if (!email) email = phone;
    phone = '';
  }

  if (phone === EMPTY_PROVIDER_CONTACT) phone = '';

  return {
    phone: phone || null,
    email: email || null,
    showPlaceholder: !phone && !email,
  };
}
