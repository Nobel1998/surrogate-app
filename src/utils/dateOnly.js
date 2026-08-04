/**
 * Calendar date helpers for DATE / YYYY-MM-DD values.
 * Never use `new Date('YYYY-MM-DD')` for display — that is UTC midnight and
 * shifts the calendar day in US timezones (e.g. Aug 10 → Aug 9 in New York).
 */

/**
 * Parse YYYY-MM-DD (or prefix of an ISO datetime) into a local Date at midnight.
 */
export function parseDateOnlyToLocalDate(value) {
  if (value == null) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0, 0);
  }

  const s = String(value).trim();
  if (!s) return null;

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]);
    const d = Number(iso[3]);
    const local = new Date(y, m - 1, d, 0, 0, 0, 0);
    if (
      Number.isNaN(local.getTime()) ||
      local.getFullYear() !== y ||
      local.getMonth() !== m - 1 ||
      local.getDate() !== d
    ) {
      return null;
    }
    return local;
  }

  const mdy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mdy) {
    const m = Number(mdy[1]);
    const d = Number(mdy[2]);
    const y = Number(mdy[3]);
    const local = new Date(y, m - 1, d, 0, 0, 0, 0);
    if (
      Number.isNaN(local.getTime()) ||
      local.getFullYear() !== y ||
      local.getMonth() !== m - 1 ||
      local.getDate() !== d
    ) {
      return null;
    }
    return local;
  }

  return null;
}

/**
 * Format a date-only DB value for UI without timezone day-shift.
 * Default (en-US): "Aug 10, 2026"
 * zh-CN: "2026年8月10日"
 */
export function formatDateOnlyDisplay(
  value,
  options = { month: 'short', day: 'numeric', year: 'numeric' },
  locale = 'en-US'
) {
  const d = parseDateOnlyToLocalDate(value);
  if (!d) return value ? String(value) : '';
  return d.toLocaleDateString(locale, options);
}

/**
 * Format as MM/DD/YYYY from a date-only value.
 */
export function formatDateOnlyMDY(value) {
  const d = parseDateOnlyToLocalDate(value);
  if (!d) return value ? String(value) : '';
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
}
