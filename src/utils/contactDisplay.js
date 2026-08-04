export const EMPTY_PROVIDER_CONTACT = '888888';

export function looksLikeEmail(value) {
  const s = String(value || '').trim();
  if (!s || s === EMPTY_PROVIDER_CONTACT) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

/** Split a free-text provider contact into phone vs email. */
export function splitProviderContact(value) {
  const trimmed = value == null ? '' : String(value).trim();
  if (!trimmed || trimmed === EMPTY_PROVIDER_CONTACT) {
    return { phone: null, email: null };
  }
  if (looksLikeEmail(trimmed)) return { phone: null, email: trimmed };
  return { phone: trimmed, email: null };
}

/**
 * Normalize appointment contact fields for UI.
 * Supports legacy rows where an email was stored in clinic_phone.
 */
export function getAppointmentContacts(appointment) {
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
