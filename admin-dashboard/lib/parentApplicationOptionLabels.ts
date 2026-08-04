/**
 * Maps intended-parent application option keys (snake_case / enums)
 * to English display labels used in the parent application form.
 */
export const PARENT_APPLICATION_OPTION_LABELS: Record<string, string> = {
  married: 'Married Heterosexual couple',
  domestic_partners: 'Domestic partners (unmarried couple living together)',
  same_sex_couple: 'Same-sex couple',
  single_father: 'Single Father',
  single_mother: 'Single Mother',

  google_search: 'Google Search',
  youtube: 'Youtube',
  online_resources: 'Online resources, etc',
  facebook: 'Facebook, X',
  friend: 'Friend',
  other_agency: 'Other Agency',
  ai: 'AI',
  clinic_referral: 'Clinic Referral',

  male: 'Male',
  female: 'Female',

  infertility_diagnosis: 'Infertility diagnosis',
  medical_condition: 'Medical condition',
  single_parent: 'Single parent',

  day_3: 'Day 3',
  day_5: 'Day 5 (blastocyst)',
  day_6: 'Day 6 (blastocyst)',

  california: 'California',
  nationwide: 'Nationwide',
  specific_states: 'Specific states',
  no_preference: 'No preference',

  weekly_updates: 'Weekly updates',
  monthly_updates: 'Monthly updates',
  major_medical_only: 'Only major medical updates',
  prefer_text: 'Prefer text messages',
  prefer_video: 'Prefer video calls',

  close_relationship: 'Close relationship (frequent communication)',
  moderate_relationship: 'Moderate relationship (regular updates)',
  minimal_contact: 'Prefer minimal contact',
};

/**
 * Resolve a stored option value (or array / comma list) to an English label.
 */
export function labelParentApplicationOption(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';

  if (Array.isArray(value)) {
    return value
      .map((item) => labelParentApplicationOption(item))
      .filter(Boolean)
      .join(', ');
  }

  const raw = String(value).trim();
  if (!raw) return '';

  if (raw.includes(',') && !/\s/.test(raw.replace(/,/g, ''))) {
    return raw
      .split(',')
      .map((part) => labelParentApplicationOption(part.trim()))
      .filter(Boolean)
      .join(', ');
  }

  if (PARENT_APPLICATION_OPTION_LABELS[raw]) {
    return PARENT_APPLICATION_OPTION_LABELS[raw];
  }

  // Already human-readable — keep as-is
  if (!/^[a-z0-9]+(?:_[a-z0-9]+)+$/i.test(raw)) {
    return raw;
  }

  return raw
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
