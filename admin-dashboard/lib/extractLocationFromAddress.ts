/**
 * Derive a short "City, ST" location from a free-form US address.
 *
 * Handles:
 * - "123 Main St, San Francisco, CA 94102" → "San Francisco, CA"
 * - "6243 Avenida de las vistas #1 SAN DIEGO, ca 92154" → "San Diego, CA"
 * - "419 Greenfield Drive El Cajon California 92021" → "El Cajon, CA"
 */

const US_STATE_BY_NAME: Record<string, string> = {
  alabama: 'AL',
  alaska: 'AK',
  arizona: 'AZ',
  arkansas: 'AR',
  california: 'CA',
  colorado: 'CO',
  connecticut: 'CT',
  delaware: 'DE',
  florida: 'FL',
  georgia: 'GA',
  hawaii: 'HI',
  idaho: 'ID',
  illinois: 'IL',
  indiana: 'IN',
  iowa: 'IA',
  kansas: 'KS',
  kentucky: 'KY',
  louisiana: 'LA',
  maine: 'ME',
  maryland: 'MD',
  massachusetts: 'MA',
  michigan: 'MI',
  minnesota: 'MN',
  mississippi: 'MS',
  missouri: 'MO',
  montana: 'MT',
  nebraska: 'NE',
  nevada: 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  ohio: 'OH',
  oklahoma: 'OK',
  oregon: 'OR',
  pennsylvania: 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  tennessee: 'TN',
  texas: 'TX',
  utah: 'UT',
  vermont: 'VT',
  virginia: 'VA',
  washington: 'WA',
  'west virginia': 'WV',
  wisconsin: 'WI',
  wyoming: 'WY',
  'district of columbia': 'DC',
};

const US_STATE_ABBR = new Set(Object.values(US_STATE_BY_NAME));

/** Multi-word city starters (take 2+ words before state). */
const CITY_PREFIXES = new Set([
  'san',
  'los',
  'las',
  'la',
  'el',
  'new',
  'north',
  'south',
  'east',
  'west',
  'fort',
  'mount',
  'mt',
  'santa',
  'saint',
  'st',
  'lake',
  'desert',
  'rancho',
  'chula',
  'marina',
  'pacific',
  'rolling',
  'huntington',
  'newport',
  'redondo',
  'manhattan',
  'beverly',
  'culver',
  'studio',
  'valley',
  'palm',
  'moreno',
  'jurupa',
  'terra',
  'buena',
  'casa',
  'rio',
  'dos',
  'port',
  'grand',
  'little',
  'upper',
  'lower',
]);

function toTitleCase(text: string) {
  return String(text || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (/^(mc|mac)[a-z]/i.test(word) && word.length > 3) {
        return word.charAt(0).toUpperCase() + word.charAt(1).toLowerCase() + word.charAt(2).toUpperCase() + word.slice(3);
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function matchStateAtEnd(text: string): { abbr: string; before: string } | null {
  const raw = String(text || '').trim().replace(/[,\s]+$/g, '');
  if (!raw) return null;

  const lower = raw.toLowerCase();

  // Full state names (longest first)
  const names = Object.keys(US_STATE_BY_NAME).sort((a, b) => b.length - a.length);
  for (const name of names) {
    if (lower === name || lower.endsWith(` ${name}`) || lower.endsWith(`, ${name}`)) {
      const before = raw.slice(0, raw.length - name.length).replace(/[,\s]+$/g, '');
      return { abbr: US_STATE_BY_NAME[name], before };
    }
  }

  // 2-letter abbreviation
  const abbrMatch = raw.match(/[,\s]+([A-Za-z]{2})$/);
  if (abbrMatch) {
    const abbr = abbrMatch[1].toUpperCase();
    if (US_STATE_ABBR.has(abbr)) {
      const before = raw.slice(0, abbrMatch.index).replace(/[,\s]+$/g, '');
      return { abbr, before };
    }
  }

  // Entire token is abbreviation (e.g. leftover "CA")
  if (/^[A-Za-z]{2}$/.test(raw)) {
    const abbr = raw.toUpperCase();
    if (US_STATE_ABBR.has(abbr)) {
      return { abbr, before: '' };
    }
  }

  return null;
}

function stripUnitTokens(text: string) {
  return String(text || '')
    .replace(/#\s*[\w-]+/gi, ' ')
    .replace(/\b(?:apt|apartment|unit|suite|ste)\.?\s*[\w-]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cityFromBeforeState(beforeState: string) {
  const cleaned = stripUnitTokens(String(beforeState || '').replace(/,/g, ' '));
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';

  // Prefer words immediately before the state (city), not the street.
  let take = 1;
  const w2 = words[words.length - 2]?.toLowerCase();
  const w3 = words[words.length - 3]?.toLowerCase();

  if (words.length >= 2 && CITY_PREFIXES.has(w2)) {
    take = 2;
  }
  // San Luis Obispo / Los Altos Hills-style
  if (
    words.length >= 3 &&
    (w3 === 'san' || w3 === 'los') &&
    /^(luis|altos|gatos|angeles)/i.test(words[words.length - 2])
  ) {
    take = 3;
  }

  return toTitleCase(words.slice(-take).join(' '));
}

/** @returns e.g. "El Cajon, CA" or "" */
export function extractLocationFromAddress(address: string | null | undefined): string {
  if (!address || typeof address !== 'string') return '';

  const original = address.trim().replace(/\s+/g, ' ');
  if (!original) return '';

  // Classic "Street, City, ST ZIP"
  const commaParts = original.split(',').map((p) => p.trim()).filter(Boolean);
  if (commaParts.length >= 3) {
    const cityPart = commaParts[commaParts.length - 2];
    const stateZipPart = commaParts[commaParts.length - 1];
    const withoutZip = stateZipPart.replace(/\b\d{5}(?:-\d{4})?\b/, '').trim();
    const stateInfo = matchStateAtEnd(withoutZip) || matchStateAtEnd(stateZipPart.replace(/\b\d{5}(?:-\d{4})?\b/, '').trim());
    if (cityPart && stateInfo?.abbr) {
      return `${toTitleCase(cityPart)}, ${stateInfo.abbr}`;
    }
    if (cityPart && withoutZip) {
      const abbr = withoutZip.length === 2 ? withoutZip.toUpperCase() : withoutZip;
      return `${toTitleCase(cityPart)}, ${abbr}`;
    }
    if (cityPart) return toTitleCase(cityPart);
  }

  // Strip trailing ZIP, then find state, then city immediately before state
  let working = original;
  const zipMatch = working.match(/\b\d{5}(?:-\d{4})?\s*$/);
  if (zipMatch) {
    working = working.slice(0, zipMatch.index).trim().replace(/[,\s]+$/g, '');
  }

  const stateInfo = matchStateAtEnd(working);
  if (stateInfo?.abbr) {
    const city = cityFromBeforeState(stateInfo.before);
    if (city) return `${city}, ${stateInfo.abbr}`;
    return stateInfo.abbr;
  }

  // "Street, City" with no state
  if (commaParts.length === 2) {
    const after = commaParts[1].replace(/\b\d{5}(?:-\d{4})?\b/, '').trim();
    const afterState = matchStateAtEnd(after);
    if (afterState?.abbr) {
      // City may still be in the street segment (e.g. "... SAN DIEGO, ca 92154")
      const city =
        cityFromBeforeState(commaParts[0]) ||
        cityFromBeforeState(afterState.before) ||
        '';
      if (city) return `${city}, ${afterState.abbr}`;
      return afterState.abbr;
    }
    if (after) return toTitleCase(after);
  }

  return '';
}

/**
 * Prefer a stored location; if missing/incomplete, derive from address.
 * Treats bare "CA 92154"-style values as incomplete when address can yield a city.
 */
export function resolveDisplayLocation(
  location: string | null | undefined,
  address: string | null | undefined
): string {
  const stored = String(location || '').trim();
  const derived = extractLocationFromAddress(address);

  if (!stored) return derived || '';

  // Incomplete: only state/zip, no city
  const looksIncomplete =
    /^[A-Za-z]{2}\s*\d{5}(?:-\d{4})?$/i.test(stored) ||
    /^[A-Za-z]{2}$/i.test(stored) ||
    /^\d{5}(?:-\d{4})?$/.test(stored);

  if (looksIncomplete && derived) return derived;
  return stored;
}

export default extractLocationFromAddress;
