/**
 * Unwrap applications / intended_parent_applications form_data.
 * Handles object, JSON string, and accidental double-encoded JSON strings.
 */
export function parseApplicationFormData(raw) {
  if (raw == null || raw === '') return {};

  let data = raw;
  for (let i = 0; i < 3; i += 1) {
    if (typeof data !== 'string') break;
    try {
      data = JSON.parse(data);
    } catch {
      return {};
    }
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  return { ...data };
}
