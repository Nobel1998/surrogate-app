/**
 * Parent application phone helpers.
 * Parent form stores Country Code / Area Code / Local Number separately;
 * naive joins can produce "+1 (1) (234) 567-890" when country "1" is duplicated.
 */

export function digitsOnly(raw) {
  return String(raw || '').replace(/\D/g, '');
}

/**
 * Merge country/area/local (or a raw profile string) into normalized parts.
 * US/NANP display: +1(123)456-7890
 * US/NANP tel URI: +1-123-456-7890 (dashes help dialers that misread +1123...)
 */
export function parseParentPhoneParts({
  countryCode = '',
  areaCode = '',
  phoneNumber = '',
  raw = '',
} = {}) {
  const explicitCc = digitsOnly(countryCode);
  let all =
    digitsOnly(raw) ||
    digitsOnly(`${countryCode}${areaCode}${phoneNumber}`);

  if (!all) {
    return {
      countryCode: '',
      areaCode: '',
      phoneNumber: '',
      e164: '',
      tel: '',
      display: '',
    };
  }

  let cc = '';

  // 11+ digits starting with 1 → US country code + 10-digit national
  if (all.length >= 11 && all.startsWith('1')) {
    cc = '1';
    all = all.slice(1);
  } else if (
    explicitCc &&
    all.startsWith(explicitCc) &&
    all.length - explicitCc.length >= 10
  ) {
    cc = explicitCc;
    all = all.slice(explicitCc.length);
  } else if (all.length === 10) {
    // 10-digit national number; keep explicit country or default US
    cc = explicitCc || '1';
  } else {
    cc = explicitCc;
  }

  // If we still have 11 digits starting with 1 after the above, strip once more
  if (all.length >= 11 && all.startsWith('1')) {
    if (!cc) cc = '1';
    all = all.slice(1);
  }

  let area = '';
  let local = all;
  if (all.length === 10) {
    area = all.slice(0, 3);
    local = all.slice(3);
  } else if (all.length === 7) {
    const explicitArea = digitsOnly(areaCode);
    if (explicitArea.length === 3) {
      area = explicitArea;
      local = all;
    }
  }

  const e164 =
    cc && area && local.length === 7
      ? `+${cc}${area}${local}`
      : cc
        ? `+${cc}${area}${local}`
        : `${area}${local}`;

  // US/NANP: use national 10-digit dashed form (no +1). Many dialers (zh locale)
  // strip separators from +11234567890 and redisplay as +1(1)(234)567-890.
  const tel =
    cc === '1' && area.length === 3 && local.length === 7
      ? `${area}-${local.slice(0, 3)}-${local.slice(3)}`
      : e164;

  const display =
    cc === '1' && area.length === 3 && local.length === 7
      ? `+1(${area})${local.slice(0, 3)}-${local.slice(3)}`
      : cc && area && local
        ? `+${cc}(${area})${local}`
        : e164 || '';

  return {
    countryCode: cc,
    areaCode: area,
    phoneNumber: local,
    e164,
    tel,
    display,
  };
}

export function formatParentPhoneForProfile(data) {
  const parts = parseParentPhoneParts({
    countryCode: data?.parent1PhoneCountryCode,
    areaCode: data?.parent1PhoneAreaCode,
    phoneNumber: data?.parent1PhoneNumber,
  });
  return parts.display || parts.e164 || '';
}

/** Value for Linking.openURL(`tel:...`) — NANP uses dashed form for dialer clarity. */
export function formatPhoneForTel(rawOrParts) {
  const parts =
    rawOrParts && typeof rawOrParts === 'object' && !Array.isArray(rawOrParts)
      ? parseParentPhoneParts(rawOrParts)
      : parseParentPhoneParts({ raw: rawOrParts });
  return (
    parts.tel ||
    parts.e164 ||
    (digitsOnly(typeof rawOrParts === 'string' || typeof rawOrParts === 'number' ? rawOrParts : '')
      ? `+${digitsOnly(rawOrParts)}`
      : '')
  );
}

export function formatPhoneForDisplay(raw) {
  const parts = parseParentPhoneParts({ raw });
  return parts.display || String(raw || '').trim() || '';
}
