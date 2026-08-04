import { supabase } from '../lib/supabase';
import { formatPhoneForDisplay, parseParentPhoneParts } from './parentPhone';
import { parseApplicationFormData } from './parseApplicationFormData';

function splitFullName(fullName) {
  const parts = String(fullName || '')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean);
  if (parts.length === 0) return { firstName: '', middleName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], middleName: '', lastName: '' };
  if (parts.length === 2) return { firstName: parts[0], middleName: '', lastName: parts[1] };
  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(' '),
    lastName: parts[parts.length - 1],
  };
}

/** ISO YYYY-MM-DD → { month, day, year } and MM/DD/YYYY */
function dobPartsFromIso(iso) {
  const s = String(iso || '').trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return { month: '', day: '', year: '', formatted: '' };
  return {
    year: m[1],
    month: m[2],
    day: m[3],
    formatted: `${m[2]}/${m[3]}/${m[1]}`,
  };
}

/**
 * After My Info (profiles) is saved, push overlapping fields into the user's
 * latest application so the admin dashboard stays in sync.
 */
export async function syncMyInfoToApplication(userId, profile, roleHint) {
  if (!userId || !profile) return { error: null, synced: false };

  let role = String(roleHint || '').toLowerCase();
  if (!role) {
    const { data: row } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    role = String(row?.role || '').toLowerCase();
  }

  const name = String(profile.name || '').trim();
  const phoneDisplay =
    role === 'surrogate'
      ? formatPhoneForDisplay(profile.phone, { defaultCountryCode: '' }) ||
        String(profile.phone || '').trim() ||
        ''
      : formatPhoneForDisplay(profile.phone) || String(profile.phone || '').trim() || '';
  const dobIso = profile.date_of_birth || null;
  const race = String(profile.race || '').trim();
  const location = String(profile.location || '').trim();
  const email = String(profile.email || '').trim();
  const nameParts = splitFullName(name);
  const dob = dobPartsFromIso(dobIso);

  try {
    if (role === 'surrogate') {
      const { data: latest, error: fetchError } = await supabase
        .from('applications')
        .select('id, form_data, full_name, phone')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        return { error: fetchError, synced: false };
      }
      if (!latest?.id) return { error: null, synced: false };

      const form = parseApplicationFormData(latest.form_data);
      const nextForm = {
        ...form,
        ...(name
          ? {
              fullName: name,
              firstName: nameParts.firstName,
              middleName: nameParts.middleName,
              lastName: nameParts.lastName,
            }
          : {}),
        ...(phoneDisplay ? { phoneNumber: phoneDisplay } : {}),
        ...(dob.formatted
          ? {
              dateOfBirth: dob.formatted,
              dateOfBirthMonth: dob.month,
              dateOfBirthDay: dob.day,
              dateOfBirthYear: dob.year,
            }
          : {}),
        ...(race ? { race } : {}),
        ...(location ? { address: location } : {}),
        ...(email ? { email } : {}),
      };

      const { error } = await supabase
        .from('applications')
        .update({
          full_name: name || latest.full_name,
          phone: phoneDisplay || latest.phone,
          // Keep same wire format as SurrogateApplicationScreen (stringified JSON)
          form_data: JSON.stringify(nextForm),
        })
        .eq('id', latest.id);

      return { error: error || null, synced: !error };
    }

    if (role === 'parent') {
      const { data: latest, error: fetchError } = await supabase
        .from('intended_parent_applications')
        .select('id, form_data')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        return { error: fetchError, synced: false };
      }
      if (!latest?.id) return { error: null, synced: false };

      const form = parseApplicationFormData(latest.form_data);
      const parentName = splitFullName(name);
      const parentLast = [parentName.middleName, parentName.lastName].filter(Boolean).join(' ').trim();
      const phoneParts = parseParentPhoneParts({ raw: phoneDisplay || profile.phone });
      const nextForm = {
        ...form,
        ...(parentName.firstName ? { parent1FirstName: parentName.firstName } : {}),
        ...(name ? { parent1LastName: parentLast } : {}),
        ...(email ? { parent1Email: email } : {}),
        ...(phoneParts.phoneNumber
          ? {
              parent1PhoneCountryCode: phoneParts.countryCode || '1',
              parent1PhoneAreaCode: phoneParts.areaCode || '',
              parent1PhoneNumber: phoneParts.phoneNumber || '',
            }
          : {}),
        ...(dob.year
          ? {
              parent1DateOfBirthYear: dob.year,
              parent1DateOfBirthMonth: dob.month,
              parent1DateOfBirthDay: dob.day,
            }
          : {}),
        ...(race ? { parent1Race: race } : {}),
        ...(location ? { parent1AddressCity: location } : {}),
      };

      const { error } = await supabase
        .from('intended_parent_applications')
        .update({
          // JSONB column — pass object (avoid double-encoded JSON string)
          form_data: nextForm,
          updated_at: new Date().toISOString(),
        })
        .eq('id', latest.id);

      return { error: error || null, synced: !error };
    }

    return { error: null, synced: false };
  } catch (error) {
    return { error, synced: false };
  }
}
