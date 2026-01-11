import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

// Helper function to check admin authentication
async function checkAdminAuth() {
  const cookieStore = await cookies();
  const adminUserId = cookieStore.get('admin_user_id')?.value;
  
  if (!adminUserId) {
    return { isAdmin: false, error: 'Not authenticated' };
  }

  if (!supabaseUrl || !serviceKey) {
    return { isAdmin: false, error: 'Missing Supabase env vars' };
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: adminUser, error } = await supabase
    .from('admin_users')
    .select('id, role')
    .eq('id', adminUserId)
    .single();

  if (error || !adminUser) {
    return { isAdmin: false, error: 'Invalid admin session' };
  }

  return { isAdmin: true, adminUser };
}

// GET - Fetch business statistics
export async function GET(req: NextRequest) {
  const authCheck = await checkAdminAuth();
  if (!authCheck.isAdmin) {
    return NextResponse.json(
      { error: authCheck.error || 'Unauthorized' },
      { status: 401 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // Get filter parameters from query string
    const { searchParams } = new URL(req.url);
    const surrogateAgeRange = searchParams.get('surrogate_age_range');
    const clientAgeRange = searchParams.get('client_age_range');
    const embryoGrade = searchParams.get('embryo_grade');
    const surrogateLocation = searchParams.get('surrogate_location');
    const surrogateRace = searchParams.get('surrogate_race');
    const ivfClinic = searchParams.get('ivf_clinic');
    const eggDonation = searchParams.get('egg_donation'); // 'yes', 'no', or null
    const spermDonation = searchParams.get('sperm_donation'); // 'yes', 'no', or null
    const clientLocation = searchParams.get('client_location');
    const transferNumber = searchParams.get('transfer_number'); // e.g., "1", "2", "3", etc. (for future use)

    // Additional filter parameters
    const signDateFrom = searchParams.get('sign_date_from');
    const signDateTo = searchParams.get('sign_date_to');
    const betaConfirmDateFrom = searchParams.get('beta_confirm_date_from');
    const betaConfirmDateTo = searchParams.get('beta_confirm_date_to');
    const fetalBeatDateFrom = searchParams.get('fetal_beat_date_from');
    const fetalBeatDateTo = searchParams.get('fetal_beat_date_to');
    const deliveryDateFrom = searchParams.get('delivery_date_from');
    const deliveryDateTo = searchParams.get('delivery_date_to');
    const embryoCount = searchParams.get('embryo_count'); // Number of embryos transferred

    // First, get all matches with surrogate and parent info
    const { data: allMatches, error: allMatchesError } = await supabase
      .from('surrogate_matches')
      .select('id, transfer_date, beta_confirm_date, embryos, parent_id, first_parent_id, second_parent_id, status, surrogate_id, clinic, egg_donation, sperm_donation, sign_date, fetal_beat_confirm, due_date, number_of_fetuses, surrogate_bmi')
      .limit(1000);

    if (allMatchesError) throw allMatchesError;

    // Filter matches with transfer_date
    let matches = allMatches?.filter(m => m.transfer_date !== null) || [];

    // Get surrogate profiles for filtering
    const surrogateIds = new Set<string>();
    matches.forEach(match => {
      if (match.surrogate_id) surrogateIds.add(match.surrogate_id);
    });

    const { data: surrogateProfiles, error: surrogateProfilesError } = await supabase
      .from('profiles')
      .select('id, date_of_birth, location, race')
      .in('id', Array.from(surrogateIds));

    if (surrogateProfilesError) throw surrogateProfilesError;

    const surrogateProfilesMap = new Map(surrogateProfiles?.map(p => [p.id, p]) || []);

    // Get surrogate applications for additional data (BMI, blood type, delivery history, etc.)
    const { data: surrogateApplications, error: applicationsError } = await supabase
      .from('applications')
      .select('user_id, form_data, status')
      .in('user_id', Array.from(surrogateIds));

    if (applicationsError) {
      console.error('[business-statistics] Error loading applications:', applicationsError);
      // Don't throw, just continue without application data
    }

    // Get surrogate medical info (OB doctor, delivery hospital, IVF clinic)
    const { data: surrogateMedicalInfo, error: medicalInfoError } = await supabase
      .from('surrogate_medical_info')
      .select('user_id, obgyn_doctor_name, delivery_hospital_name, ivf_clinic_name')
      .in('user_id', Array.from(surrogateIds));

    if (medicalInfoError) {
      console.error('[business-statistics] Error loading medical info:', medicalInfoError);
      // Don't throw, just continue without medical info
    }

    // Parse application form_data and create a map
    const surrogateApplicationMap = new Map();
    surrogateApplications?.forEach(app => {
      if (app.form_data) {
        try {
          const formData = typeof app.form_data === 'string' ? JSON.parse(app.form_data) : app.form_data;
          surrogateApplicationMap.set(app.user_id, {
            ...formData,
            applicationStatus: app.status,
          });
        } catch (e) {
          console.error('[business-statistics] Error parsing form_data for user:', app.user_id, e);
        }
      }
    });

    // Create medical info map
    const surrogateMedicalInfoMap = new Map();
    surrogateMedicalInfo?.forEach(info => {
      surrogateMedicalInfoMap.set(info.user_id, {
        obgynDoctor: info.obgyn_doctor_name,
        deliveryHospital: info.delivery_hospital_name,
        ivfClinic: info.ivf_clinic_name,
      });
    });

    // Get parent profiles for filtering
    const parentIds = new Set<string>();
    matches.forEach(match => {
      if (match.parent_id) parentIds.add(match.parent_id);
      if (match.first_parent_id) parentIds.add(match.first_parent_id);
      if (match.second_parent_id) parentIds.add(match.second_parent_id);
    });

    const { data: parentProfilesForFilter, error: parentProfilesError } = await supabase
      .from('profiles')
      .select('id, location')
      .in('id', Array.from(parentIds));

    if (parentProfilesError) throw parentProfilesError;

    const parentProfilesMap = new Map(parentProfilesForFilter?.map(p => [p.id, p]) || []);

    // Get parent profiles for age filtering (need date_of_birth)
    const { data: parentProfilesForAge, error: parentProfilesForAgeError } = await supabase
      .from('profiles')
      .select('id, date_of_birth')
      .in('id', Array.from(parentIds));

    if (parentProfilesForAgeError) {
      console.error('[business-statistics] Error loading parent profiles for age:', parentProfilesForAgeError);
      // Don't throw, just continue without age filtering
    }

    const parentProfilesForAgeMap = new Map(parentProfilesForAge?.map(p => [p.id, p]) || []);

    // Additional filter parameters from query
    const surrogateBMI = searchParams.get('surrogate_bmi'); // e.g., "18-25", "25-30", etc.
    const surrogateBloodType = searchParams.get('surrogate_blood_type');
    const surrogateMaritalStatus = searchParams.get('surrogate_marital_status');
    const surrogateDeliveryHistory = searchParams.get('surrogate_delivery_history'); // e.g., "0", "1", "2+"
    const surrogateMiscarriageHistory = searchParams.get('surrogate_miscarriage_history'); // 'yes', 'no'
    const previousSurrogacyExperience = searchParams.get('previous_surrogacy_experience'); // 'yes', 'no'
    const clientMaritalStatus = searchParams.get('client_marital_status');
    const clientBloodType = searchParams.get('client_blood_type');
    const applicationStatus = searchParams.get('application_status'); // Initial review result
    const obgynDoctor = searchParams.get('obgyn_doctor');
    const deliveryHospital = searchParams.get('delivery_hospital');

    // Apply filters
    if (surrogateAgeRange || clientAgeRange || embryoGrade || surrogateLocation || surrogateRace || ivfClinic || eggDonation || spermDonation || clientLocation || 
        signDateFrom || signDateTo || betaConfirmDateFrom || betaConfirmDateTo || fetalBeatDateFrom || fetalBeatDateTo || 
        deliveryDateFrom || deliveryDateTo || embryoCount || surrogateBMI || surrogateBloodType || surrogateMaritalStatus || 
        surrogateDeliveryHistory || surrogateMiscarriageHistory || previousSurrogacyExperience || clientMaritalStatus || clientBloodType || applicationStatus ||
        obgynDoctor || deliveryHospital) {
      matches = matches.filter(match => {
        // Filter by surrogate age
        if (surrogateAgeRange) {
          const surrogate = match.surrogate_id ? surrogateProfilesMap.get(match.surrogate_id) : null;
          if (surrogate?.date_of_birth) {
            const birthDate = new Date(surrogate.date_of_birth);
            const age = new Date().getFullYear() - birthDate.getFullYear();
            const monthDiff = new Date().getMonth() - birthDate.getMonth();
            const actualAge = monthDiff < 0 || (monthDiff === 0 && new Date().getDate() < birthDate.getDate()) ? age - 1 : age;
            
            const [minAge, maxAge] = surrogateAgeRange.split('-').map(Number);
            if (maxAge) {
              if (actualAge < minAge || actualAge > maxAge) return false;
            } else {
              // 46+ case
              if (actualAge < 46) return false;
            }
          } else {
            return false; // No age data, exclude
          }
        }

        // Filter by client age
        if (clientAgeRange) {
          const parentId = match.parent_id || match.first_parent_id;
          if (parentId) {
            const parent = parentProfilesForAgeMap.get(parentId);
            if (parent?.date_of_birth) {
              const birthDate = new Date(parent.date_of_birth);
              const age = new Date().getFullYear() - birthDate.getFullYear();
              const monthDiff = new Date().getMonth() - birthDate.getMonth();
              const actualAge = monthDiff < 0 || (monthDiff === 0 && new Date().getDate() < birthDate.getDate()) ? age - 1 : age;
              
              const [minAge, maxAge] = clientAgeRange.split('-').map(Number);
              if (maxAge) {
                if (actualAge < minAge || actualAge > maxAge) return false;
              } else {
                // 46+ case
                if (actualAge < 46) return false;
              }
            } else {
              return false; // No age data, exclude
            }
          } else {
            return false; // No parent ID, exclude
          }
        }

        // Filter by embryo grade
        if (embryoGrade) {
          if (!match.embryos) return false;
          const embryoStr = match.embryos.toString().toUpperCase();
          let matchesGrade = false;
          
          if (embryoGrade === 'AA' && embryoStr.includes('AA')) matchesGrade = true;
          else if (embryoGrade === 'AB/BA' && (embryoStr.includes('AB') || embryoStr.includes('BA'))) matchesGrade = true;
          else if (embryoGrade === 'BB' && embryoStr.includes('BB')) matchesGrade = true;
          else if (embryoGrade === 'AC/CA' && (embryoStr.includes('AC') || embryoStr.includes('CA'))) matchesGrade = true;
          else if (embryoGrade === 'BC/CB' && (embryoStr.includes('BC') || embryoStr.includes('CB'))) matchesGrade = true;
          else if (embryoGrade === 'CC' && embryoStr.includes('CC')) matchesGrade = true;
          else if (embryoGrade === 'Other' && !embryoStr.match(/AA|AB|BA|BB|AC|CA|BC|CB|CC/)) matchesGrade = true;
          
          if (!matchesGrade) return false;
        }

        // Filter by surrogate location
        if (surrogateLocation) {
          const surrogate = match.surrogate_id ? surrogateProfilesMap.get(match.surrogate_id) : null;
          if (!surrogate?.location || !surrogate.location.toLowerCase().includes(surrogateLocation.toLowerCase())) {
            return false;
          }
        }

        // Filter by surrogate race
        if (surrogateRace) {
          const surrogate = match.surrogate_id ? surrogateProfilesMap.get(match.surrogate_id) : null;
          if (!surrogate?.race || !surrogate.race.toLowerCase().includes(surrogateRace.toLowerCase())) {
            return false;
          }
        }

        // Filter by IVF clinic (check both match.clinic and medical_info.ivf_clinic_name)
        if (ivfClinic) {
          const matchClinic = match.clinic?.toLowerCase() || '';
          const medicalInfo = match.surrogate_id ? surrogateMedicalInfoMap.get(match.surrogate_id) : null;
          const medicalClinic = medicalInfo?.ivfClinic?.toLowerCase() || '';
          const searchClinic = ivfClinic.toLowerCase();
          
          // Match if either source contains the search term
          if (!matchClinic.includes(searchClinic) && !medicalClinic.includes(searchClinic)) {
            return false;
          }
        }

        // Filter by egg donation
        if (eggDonation) {
          const hasEggDonation = match.egg_donation && match.egg_donation.trim().length > 0;
          if (eggDonation === 'yes' && !hasEggDonation) return false;
          if (eggDonation === 'no' && hasEggDonation) return false;
        }

        // Filter by sperm donation
        if (spermDonation) {
          const hasSpermDonation = match.sperm_donation && match.sperm_donation.trim().length > 0;
          if (spermDonation === 'yes' && !hasSpermDonation) return false;
          if (spermDonation === 'no' && hasSpermDonation) return false;
        }

        // Filter by client location
        if (clientLocation) {
          const parentId = match.parent_id || match.first_parent_id;
          const parent = parentId ? parentProfilesMap.get(parentId) : null;
          if (!parent?.location || !parent.location.toLowerCase().includes(clientLocation.toLowerCase())) {
            return false;
          }
        }

        // Filter by sign date range
        if (signDateFrom || signDateTo) {
          if (!match.sign_date) return false;
          const signDate = new Date(match.sign_date);
          if (signDateFrom && signDate < new Date(signDateFrom)) return false;
          if (signDateTo && signDate > new Date(signDateTo)) return false;
        }

        // Filter by beta confirm date range
        if (betaConfirmDateFrom || betaConfirmDateTo) {
          if (!match.beta_confirm_date) return false;
          const betaDate = new Date(match.beta_confirm_date);
          if (betaConfirmDateFrom && betaDate < new Date(betaConfirmDateFrom)) return false;
          if (betaConfirmDateTo && betaDate > new Date(betaConfirmDateTo)) return false;
        }

        // Filter by fetal beat date range (fetal_beat_confirm is a text field, need to parse)
        if (fetalBeatDateFrom || fetalBeatDateTo) {
          // fetal_beat_confirm might be a date string or "None"
          if (!match.fetal_beat_confirm || match.fetal_beat_confirm === 'None') return false;
          try {
            const fetalBeatDate = new Date(match.fetal_beat_confirm);
            if (isNaN(fetalBeatDate.getTime())) return false;
            if (fetalBeatDateFrom && fetalBeatDate < new Date(fetalBeatDateFrom)) return false;
            if (fetalBeatDateTo && fetalBeatDate > new Date(fetalBeatDateTo)) return false;
          } catch (e) {
            return false;
          }
        }

        // Filter by delivery date range
        if (deliveryDateFrom || deliveryDateTo) {
          if (!match.due_date) return false;
          const deliveryDate = new Date(match.due_date);
          if (deliveryDateFrom && deliveryDate < new Date(deliveryDateFrom)) return false;
          if (deliveryDateTo && deliveryDate > new Date(deliveryDateTo)) return false;
        }

        // Filter by embryo count (parse from embryos field)
        if (embryoCount) {
          const count = parseInt(embryoCount);
          if (match.embryos) {
            // Try to extract number from embryos field
            const matchCount = parseInt(match.embryos.toString().match(/\d+/)?.[0] || '0');
            if (matchCount !== count) return false;
          } else {
            return false;
          }
        }

        // Filter by surrogate BMI (prefer surrogate_bmi from matches table, fallback to calculated from form_data)
        if (surrogateBMI) {
          let bmi: number | null = null;
          
          // First, try to use surrogate_bmi from matches table
          if (match.surrogate_bmi !== null && match.surrogate_bmi !== undefined) {
            bmi = parseFloat(match.surrogate_bmi.toString());
          } else {
            // Fallback: calculate from application form_data
            const appData = match.surrogate_id ? surrogateApplicationMap.get(match.surrogate_id) : null;
            if (appData?.height && appData?.weight) {
              const heightInMeters = parseFloat(appData.height) / 100; // Assuming height is in cm
              const weightInKg = parseFloat(appData.weight);
              if (heightInMeters > 0 && weightInKg > 0) {
                bmi = weightInKg / (heightInMeters * heightInMeters);
              }
            }
          }
          
          if (bmi === null || isNaN(bmi)) {
            return false; // No BMI data available
          }
          
          const [minBMI, maxBMI] = surrogateBMI.split('-').map(Number);
          if (bmi < minBMI || bmi > maxBMI) return false;
        }

        // Filter by surrogate blood type
        if (surrogateBloodType) {
          const appData = match.surrogate_id ? surrogateApplicationMap.get(match.surrogate_id) : null;
          if (!appData?.bloodType || !appData.bloodType.toLowerCase().includes(surrogateBloodType.toLowerCase())) {
            return false;
          }
        }

        // Filter by surrogate marital status
        if (surrogateMaritalStatus) {
          const appData = match.surrogate_id ? surrogateApplicationMap.get(match.surrogate_id) : null;
          if (!appData) return false;
          
          // Check if married based on isMarried flag or maritalStatus field
          const isMarried = appData.isMarried === true || appData.maritalStatus === 'married';
          const isSingle = appData.isSingle === true || appData.maritalStatus === 'single';
          const isWidowed = appData.isWidowed === true || appData.maritalStatus === 'widowed';
          const isDivorced = appData.divorced === true || appData.maritalStatus === 'divorced';
          const isSeparated = appData.legallySeparated === true || appData.maritalStatus === 'separated';
          const isLifePartner = appData.lifePartner === true || appData.maritalStatus === 'lifePartner';
          const isEngaged = appData.engaged === true || appData.maritalStatus === 'engaged';
          
          const statusLower = surrogateMaritalStatus.toLowerCase();
          // Handle both "Married" (from dropdown) and "married" (from form_data)
          if ((statusLower === 'married' || statusLower === 'Married'.toLowerCase()) && !isMarried) return false;
          if ((statusLower === 'single' || statusLower === 'Single'.toLowerCase()) && !isSingle) return false;
          if ((statusLower === 'widowed' || statusLower === 'Widowed'.toLowerCase()) && !isWidowed) return false;
          if ((statusLower === 'divorced' || statusLower === 'Divorced'.toLowerCase()) && !isDivorced) return false;
          if ((statusLower === 'separated' || statusLower === 'Separated'.toLowerCase()) && !isSeparated) return false;
          if ((statusLower === 'life partner' || statusLower === 'Life Partner'.toLowerCase()) && !isLifePartner) return false;
          if ((statusLower === 'engaged' || statusLower === 'Engaged'.toLowerCase()) && !isEngaged) return false;
          // If it's a specific status that doesn't match, exclude
          const knownStatuses = ['married', 'single', 'widowed', 'divorced', 'separated', 'life partner', 'engaged'];
          if (!knownStatuses.includes(statusLower)) {
            // For other status values, check maritalStatus field directly (case-insensitive)
            if (!appData.maritalStatus || appData.maritalStatus.toLowerCase() !== statusLower) {
              return false;
            }
          }
        }

        // Filter by surrogate delivery history
        if (surrogateDeliveryHistory) {
          const appData = match.surrogate_id ? surrogateApplicationMap.get(match.surrogate_id) : null;
          const totalDeliveries = parseInt(appData?.totalDeliveries || '0');
          if (surrogateDeliveryHistory === '0' && totalDeliveries !== 0) return false;
          if (surrogateDeliveryHistory === '1' && totalDeliveries !== 1) return false;
          if (surrogateDeliveryHistory === '2+' && totalDeliveries < 2) return false;
        }

        // Filter by surrogate miscarriage history
        if (surrogateMiscarriageHistory) {
          const appData = match.surrogate_id ? surrogateApplicationMap.get(match.surrogate_id) : null;
          const hasMiscarriage = appData?.miscarriageHistory || appData?.previousMiscarriages || false;
          if (surrogateMiscarriageHistory === 'yes' && !hasMiscarriage) return false;
          if (surrogateMiscarriageHistory === 'no' && hasMiscarriage) return false;
        }

        // Filter by previous surrogacy experience
        if (previousSurrogacyExperience) {
          const appData = match.surrogate_id ? surrogateApplicationMap.get(match.surrogate_id) : null;
          const hasPreviousSurrogacy = appData?.previousSurrogacy || false;
          if (previousSurrogacyExperience === 'yes' && !hasPreviousSurrogacy) return false;
          if (previousSurrogacyExperience === 'no' && hasPreviousSurrogacy) return false;
        }

        // Filter by client marital status (need to get from parent application)
        if (clientMaritalStatus) {
          const parentId = match.parent_id || match.first_parent_id;
          // Would need to query parent applications, for now skip this filter
          // TODO: Implement parent application lookup
        }

        // Filter by client blood type (need to get from parent application)
        if (clientBloodType) {
          const parentId = match.parent_id || match.first_parent_id;
          // Would need to query parent applications, for now skip this filter
          // TODO: Implement parent application lookup
        }

        // Filter by application status (initial review result)
        if (applicationStatus) {
          const appData = match.surrogate_id ? surrogateApplicationMap.get(match.surrogate_id) : null;
          if (!appData?.applicationStatus || appData.applicationStatus.toLowerCase() !== applicationStatus.toLowerCase()) {
            return false;
          }
        }

        // Filter by OB/GYN doctor
        if (obgynDoctor) {
          const medicalInfo = match.surrogate_id ? surrogateMedicalInfoMap.get(match.surrogate_id) : null;
          if (!medicalInfo?.obgynDoctor || !medicalInfo.obgynDoctor.toLowerCase().includes(obgynDoctor.toLowerCase())) {
            return false;
          }
        }

        // Filter by delivery hospital
        if (deliveryHospital) {
          const medicalInfo = match.surrogate_id ? surrogateMedicalInfoMap.get(match.surrogate_id) : null;
          if (!medicalInfo?.deliveryHospital || !medicalInfo.deliveryHospital.toLowerCase().includes(deliveryHospital.toLowerCase())) {
            return false;
          }
        }

        return true;
      });
    }

    // Get parent profiles for age calculation (reuse the set we already have)
    const { data: parentProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, date_of_birth')
      .in('id', Array.from(parentIds));

    if (profilesError) throw profilesError;

    // Calculate statistics
    const totalTransfers = matches?.length || 0;
    const successfulTransfers = matches?.filter(m => m.beta_confirm_date !== null).length || 0;
    const successRate = totalTransfers > 0 ? (successfulTransfers / totalTransfers) * 100 : 0;

    // Calculate age ranges
    const ageRanges: Record<string, number> = {
      '20-25': 0,
      '26-30': 0,
      '31-35': 0,
      '36-40': 0,
      '41-45': 0,
      '46+': 0,
    };

    const profilesMap = new Map(parentProfiles?.map(p => [p.id, p]) || []);
    matches?.forEach(match => {
      const parentId = match.parent_id || match.first_parent_id;
      if (parentId) {
        const profile = profilesMap.get(parentId);
        if (profile?.date_of_birth) {
          const birthDate = new Date(profile.date_of_birth);
          const age = new Date().getFullYear() - birthDate.getFullYear();
          const monthDiff = new Date().getMonth() - birthDate.getMonth();
          const actualAge = monthDiff < 0 || (monthDiff === 0 && new Date().getDate() < birthDate.getDate()) ? age - 1 : age;
          
          if (actualAge >= 20 && actualAge <= 25) ageRanges['20-25']++;
          else if (actualAge >= 26 && actualAge <= 30) ageRanges['26-30']++;
          else if (actualAge >= 31 && actualAge <= 35) ageRanges['31-35']++;
          else if (actualAge >= 36 && actualAge <= 40) ageRanges['36-40']++;
          else if (actualAge >= 41 && actualAge <= 45) ageRanges['41-45']++;
          else if (actualAge >= 46) ageRanges['46+']++;
        }
      }
    });

    // Extract embryo grades
    const embryoGrades: Record<string, number> = {};
    matches?.forEach(match => {
      if (match.embryos) {
        // Try to extract grade from embryos field (could be "Grade 5AA", "5AA", "AA", etc.)
        const embryoStr = match.embryos.toString().toUpperCase();
        // Look for common patterns
        if (embryoStr.includes('AA')) {
          embryoGrades['AA'] = (embryoGrades['AA'] || 0) + 1;
        } else if (embryoStr.includes('AB') || embryoStr.includes('BA')) {
          embryoGrades['AB/BA'] = (embryoGrades['AB/BA'] || 0) + 1;
        } else if (embryoStr.includes('BB')) {
          embryoGrades['BB'] = (embryoGrades['BB'] || 0) + 1;
        } else if (embryoStr.includes('AC') || embryoStr.includes('CA')) {
          embryoGrades['AC/CA'] = (embryoGrades['AC/CA'] || 0) + 1;
        } else if (embryoStr.includes('BC') || embryoStr.includes('CB')) {
          embryoGrades['BC/CB'] = (embryoGrades['BC/CB'] || 0) + 1;
        } else if (embryoStr.includes('CC')) {
          embryoGrades['CC'] = (embryoGrades['CC'] || 0) + 1;
        } else {
          embryoGrades['Other'] = (embryoGrades['Other'] || 0) + 1;
        }
      }
    });


    // Count transfers by number
    const transferCounts: Record<number, number> = {};
    matches?.forEach(match => {
      // Count how many transfers this match has (for now, we'll count each match as 1 transfer)
      // In the future, if we track multiple transfers per match, we'd need a separate table
      const count = 1;
      transferCounts[count] = (transferCounts[count] || 0) + 1;
    });

    // Also calculate surrogate age ranges for filtered data
    const surrogateAgeRanges: Record<string, number> = {
      '20-25': 0,
      '26-30': 0,
      '31-35': 0,
      '36-40': 0,
      '41-45': 0,
      '46+': 0,
    };

    matches.forEach(match => {
      const surrogate = match.surrogate_id ? surrogateProfilesMap.get(match.surrogate_id) : null;
      if (surrogate?.date_of_birth) {
        const birthDate = new Date(surrogate.date_of_birth);
        const age = new Date().getFullYear() - birthDate.getFullYear();
        const monthDiff = new Date().getMonth() - birthDate.getMonth();
        const actualAge = monthDiff < 0 || (monthDiff === 0 && new Date().getDate() < birthDate.getDate()) ? age - 1 : age;
        
        if (actualAge >= 20 && actualAge <= 25) surrogateAgeRanges['20-25']++;
        else if (actualAge >= 26 && actualAge <= 30) surrogateAgeRanges['26-30']++;
        else if (actualAge >= 31 && actualAge <= 35) surrogateAgeRanges['31-35']++;
        else if (actualAge >= 36 && actualAge <= 40) surrogateAgeRanges['36-40']++;
        else if (actualAge >= 41 && actualAge <= 45) surrogateAgeRanges['41-45']++;
        else if (actualAge >= 46) surrogateAgeRanges['46+']++;
      }
    });

    // Get unique values for filter options
    const surrogateLocations = new Set<string>();
    const surrogateRaces = new Set<string>();
    const ivfClinics = new Set<string>();
    const clientLocations = new Set<string>();
    const surrogateBloodTypes = new Set<string>();
    const surrogateMaritalStatuses = new Set<string>();
    const applicationStatuses = new Set<string>();
    const obgynDoctors = new Set<string>();
    const deliveryHospitals = new Set<string>();
    
    surrogateProfiles?.forEach(profile => {
      if (profile.location) surrogateLocations.add(profile.location);
      if (profile.race) surrogateRaces.add(profile.race);
    });
    
    // Collect IVF clinics from both matches table and medical_info table
    allMatches?.forEach(match => {
      if (match.clinic) ivfClinics.add(match.clinic);
    });
    
    surrogateMedicalInfo?.forEach(info => {
      if (info.ivf_clinic_name) ivfClinics.add(info.ivf_clinic_name);
    });
    
    parentProfilesForFilter?.forEach(profile => {
      if (profile.location) clientLocations.add(profile.location);
    });

    // Extract unique values from application form_data
    surrogateApplicationMap.forEach((appData, userId) => {
      if (appData.bloodType) surrogateBloodTypes.add(appData.bloodType);
      
      // Determine marital status from form data
      if (appData.isMarried === true || appData.maritalStatus === 'married') {
        surrogateMaritalStatuses.add('Married');
      } else if (appData.isSingle === true || appData.maritalStatus === 'single') {
        surrogateMaritalStatuses.add('Single');
      } else if (appData.isWidowed === true || appData.maritalStatus === 'widowed') {
        surrogateMaritalStatuses.add('Widowed');
      } else if (appData.divorced === true || appData.maritalStatus === 'divorced') {
        surrogateMaritalStatuses.add('Divorced');
      } else if (appData.legallySeparated === true || appData.maritalStatus === 'separated') {
        surrogateMaritalStatuses.add('Separated');
      } else if (appData.lifePartner === true || appData.maritalStatus === 'lifePartner') {
        surrogateMaritalStatuses.add('Life Partner');
      } else if (appData.engaged === true || appData.maritalStatus === 'engaged') {
        surrogateMaritalStatuses.add('Engaged');
      } else if (appData.maritalStatus) {
        // Fallback to raw maritalStatus value if it exists
        const status = appData.maritalStatus.charAt(0).toUpperCase() + appData.maritalStatus.slice(1);
        surrogateMaritalStatuses.add(status);
      }
      
      if (appData.applicationStatus) applicationStatuses.add(appData.applicationStatus);
    });

    // Extract unique values from medical info
    surrogateMedicalInfoMap.forEach((medicalInfo, userId) => {
      if (medicalInfo.obgynDoctor) obgynDoctors.add(medicalInfo.obgynDoctor);
      if (medicalInfo.deliveryHospital) deliveryHospitals.add(medicalInfo.deliveryHospital);
    });

    const result = {
      statistics: {
        transplantSuccessRate: {
          total: totalTransfers,
          successful: successfulTransfers,
          rate: Math.round(successRate * 100) / 100,
        },
        clientAgeRanges: ageRanges,
        surrogateAgeRanges: surrogateAgeRanges,
        embryoGrades,
        transferCounts: {
          total: totalTransfers,
          breakdown: transferCounts,
        },
      },
      filters: {
        applied: {
          surrogateAgeRange: surrogateAgeRange || null,
          embryoGrade: embryoGrade || null,
          surrogateLocation: surrogateLocation || null,
          surrogateRace: surrogateRace || null,
          ivfClinic: ivfClinic || null,
          eggDonation: eggDonation || null,
          spermDonation: spermDonation || null,
          clientLocation: clientLocation || null,
          signDateFrom: signDateFrom || null,
          signDateTo: signDateTo || null,
          betaConfirmDateFrom: betaConfirmDateFrom || null,
          betaConfirmDateTo: betaConfirmDateTo || null,
          fetalBeatDateFrom: fetalBeatDateFrom || null,
          fetalBeatDateTo: fetalBeatDateTo || null,
          deliveryDateFrom: deliveryDateFrom || null,
          deliveryDateTo: deliveryDateTo || null,
          embryoCount: embryoCount || null,
          surrogateBMI: surrogateBMI || null,
          surrogateBloodType: surrogateBloodType || null,
          surrogateMaritalStatus: surrogateMaritalStatus || null,
          surrogateDeliveryHistory: surrogateDeliveryHistory || null,
          surrogateMiscarriageHistory: surrogateMiscarriageHistory || null,
          previousSurrogacyExperience: previousSurrogacyExperience || null,
          clientMaritalStatus: clientMaritalStatus || null,
          clientBloodType: clientBloodType || null,
          applicationStatus: applicationStatus || null,
          obgynDoctor: obgynDoctor || null,
          deliveryHospital: deliveryHospital || null,
          transferNumber: transferNumber || null,
        },
        available: {
          surrogateAgeRanges: ['20-25', '26-30', '31-35', '36-40', '41-45', '46+'],
          embryoGrades: ['AA', 'AB/BA', 'BB', 'AC/CA', 'BC/CB', 'CC', 'Other'],
          surrogateLocations: Array.from(surrogateLocations).sort(),
          surrogateRaces: Array.from(surrogateRaces).sort(),
          ivfClinics: Array.from(ivfClinics).sort(),
          clientLocations: Array.from(clientLocations).sort(),
          surrogateBloodTypes: Array.from(surrogateBloodTypes).sort(),
          surrogateMaritalStatuses: Array.from(surrogateMaritalStatuses).sort(),
          applicationStatuses: Array.from(applicationStatuses).sort(),
          bmiRanges: ['18-25', '25-30', '30-35', '35+'],
          deliveryHistoryOptions: ['0', '1', '2+'],
          obgynDoctors: Array.from(obgynDoctors).sort(),
          deliveryHospitals: Array.from(deliveryHospitals).sort(),
        },
      },
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[business-statistics] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch business statistics' },
      { status: 500 }
    );
  }
}

