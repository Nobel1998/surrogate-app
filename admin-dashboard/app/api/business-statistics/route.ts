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

  const url = new URL(req.url);
  const searchParams = url.searchParams;

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
    const legalClearanceDateFrom = searchParams.get('legal_clearance_date_from');
    const legalClearanceDateTo = searchParams.get('legal_clearance_date_to');
    const medicationStartDateFrom = searchParams.get('medication_start_date_from');
    const medicationStartDateTo = searchParams.get('medication_start_date_to');
    const pregnancyTestDateFrom = searchParams.get('pregnancy_test_date_from');
    const pregnancyTestDateTo = searchParams.get('pregnancy_test_date_to');
    const pregnancyTestDate2From = searchParams.get('pregnancy_test_date_2_from');
    const pregnancyTestDate2To = searchParams.get('pregnancy_test_date_2_to');
    const transferDateFrom = searchParams.get('transfer_date_from');
    const transferDateTo = searchParams.get('transfer_date_to');
    const fetalHeartbeatCount = searchParams.get('fetal_heartbeat_count'); // exact number
    const clientName = searchParams.get('client_name'); // text search
    const surrogateName = searchParams.get('surrogate_name'); // text search
    const medicalExamResult = searchParams.get('medical_exam_result'); // text search in report_data
    const embryoCount = searchParams.get('embryo_count'); // Number of embryos transferred

    // First, get all matches with surrogate and parent info
    const { data: allMatches, error: allMatchesError } = await supabase
      .from('surrogate_matches')
      .select('id, claim_id, transfer_date, beta_confirm_date, embryos, parent_id, first_parent_id, second_parent_id, status, surrogate_id, clinic, egg_donation, sperm_donation, sign_date, fetal_beat_confirm, fetal_heartbeat_count, due_date, number_of_fetuses, surrogate_bmi, legal_clearance_date, transfer_hotel, medication_start_date, pregnancy_test_date, pregnancy_test_date_2')
      .limit(1000);

    if (allMatchesError) throw allMatchesError;

    // Get filter parameters early to determine if we should filter by transfer_date
    const medicalExamDateFrom = searchParams.get('medical_exam_date_from');
    const medicalExamDateTo = searchParams.get('medical_exam_date_to');
    
    // Filter matches with transfer_date
    // BUT: If user is filtering by medical exam date, include ALL matches (even without transfer_date)
    // because they might have a medical exam date but no transfer date yet
    // Only filter by transfer_date if NOT filtering by medical exam date
    // This allows matches with medical exam dates but no transfer_date to be included
    let matches = (medicalExamDateFrom || medicalExamDateTo) 
      ? (allMatches || [])  // Include all matches when filtering by medical exam date
      : (allMatches?.filter(m => m.transfer_date !== null) || []);  // Otherwise, only matches with transfer_date

    // Get surrogate profiles for filtering
    const surrogateIds = new Set<string>();
    matches.forEach(match => {
      if (match.surrogate_id) surrogateIds.add(match.surrogate_id);
    });

    const { data: surrogateProfiles, error: surrogateProfilesError } = await supabase
      .from('profiles')
      .select('id, date_of_birth, location, race, name')
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

    // Get medical reports for examination dates
    // Query ALL medical reports first, prioritize Pre-Transfer but include all stages
    // This ensures we get all reports even if RLS might filter some
    const { data: allMedicalReports, error: allMedicalReportsError } = await supabase
      .from('medical_reports')
      .select('user_id, visit_date, stage, report_data')
      .in('user_id', Array.from(surrogateIds));

    if (allMedicalReportsError) {
      console.error('[business-statistics] Error loading all medical reports:', allMedicalReportsError);
      // Don't throw, just continue without medical reports
    }

    // Filter to Pre-Transfer stage (medical check-in is typically Pre-Transfer)
    const preTransferReports = allMedicalReports?.filter(r => r.stage === 'Pre-Transfer') || [];
    // Also get all reports for debugging
    const allReports = allMedicalReports || [];


    // Create medical exam date map
    // Use Pre-Transfer reports first, but if none exist, use the earliest report of any stage
    const surrogateMedicalExamMap = new Map();
    
    // First, add Pre-Transfer reports (these are the medical check-ins)
    preTransferReports?.forEach(report => {
      const existing = surrogateMedicalExamMap.get(report.user_id);
      if (!existing || new Date(report.visit_date) < new Date(existing)) {
        surrogateMedicalExamMap.set(report.user_id, report.visit_date);
      }
    });
    
    // If a surrogate has no Pre-Transfer report but has other reports, use the earliest one
    allReports?.forEach(report => {
      if (!surrogateMedicalExamMap.has(report.user_id)) {
        surrogateMedicalExamMap.set(report.user_id, report.visit_date);
      } else {
        const existing = surrogateMedicalExamMap.get(report.user_id);
        if (new Date(report.visit_date) < new Date(existing)) {
          surrogateMedicalExamMap.set(report.user_id, report.visit_date);
        }
      }
    });


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
      .select('id, location, name')
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
    const transferHotel = searchParams.get('transfer_hotel');
    // medicalExamDateFrom and medicalExamDateTo are already defined above (line 115-116)


    // Apply filters
    if (surrogateAgeRange || clientAgeRange || embryoGrade || surrogateLocation || surrogateRace || ivfClinic || eggDonation || spermDonation || clientLocation || 
        signDateFrom || signDateTo || betaConfirmDateFrom || betaConfirmDateTo || fetalBeatDateFrom || fetalBeatDateTo || 
        deliveryDateFrom || deliveryDateTo || legalClearanceDateFrom || legalClearanceDateTo || medicationStartDateFrom || medicationStartDateTo || pregnancyTestDateFrom || pregnancyTestDateTo || pregnancyTestDate2From || pregnancyTestDate2To ||
        transferDateFrom || transferDateTo || fetalHeartbeatCount || clientName || surrogateName || medicalExamResult ||
        embryoCount || surrogateBMI || surrogateBloodType || surrogateMaritalStatus || 
        surrogateDeliveryHistory || surrogateMiscarriageHistory || previousSurrogacyExperience || clientMaritalStatus || clientBloodType || applicationStatus ||
        obgynDoctor || deliveryHospital || transferHotel || medicalExamDateFrom || medicalExamDateTo) {
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

        // Filter by embryo quality (PGS): pgs_tested | untested
        if (embryoGrade) {
          const embryoStr = (match.embryos && match.embryos.toString().toUpperCase()) || '';
          const hasPgs = embryoStr.includes('PGS');
          if (embryoGrade === 'pgs_tested' && !hasPgs) return false;
          if (embryoGrade === 'untested' && hasPgs) return false;
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

        // Filter by transfer hotel
        if (transferHotel) {
          if (!match.transfer_hotel || !match.transfer_hotel.toLowerCase().includes(transferHotel.toLowerCase())) {
            return false;
          }
        }

        // Filter by medical examination date range (Pre-Transfer exam)
        if (medicalExamDateFrom || medicalExamDateTo) {
          const examDate = match.surrogate_id ? surrogateMedicalExamMap.get(match.surrogate_id) : null;
          
          if (!examDate) return false; // No exam date, exclude
          
          // Compare dates by date only (ignore time) to avoid timezone issues
          // Parse examDate as date string (YYYY-MM-DD) to avoid timezone conversion
          const examDateMatch = String(examDate).match(/^(\d{4})-(\d{2})-(\d{2})/);
          let examDateOnly: Date;
          if (examDateMatch) {
            const [, year, month, day] = examDateMatch;
            examDateOnly = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          } else {
            examDateOnly = new Date(examDate);
            examDateOnly.setHours(0, 0, 0, 0);
          }
          
          const fromDate = medicalExamDateFrom ? new Date(medicalExamDateFrom + 'T00:00:00') : null;
          const toDate = medicalExamDateTo ? new Date(medicalExamDateTo + 'T23:59:59') : null;
          
          if (fromDate && examDateOnly < fromDate) {
            return false;
          }
          if (toDate && examDateOnly > toDate) {
            return false;
          }
        }

        // Filter by legal clearance date range
        if (legalClearanceDateFrom || legalClearanceDateTo) {
          if (!match.legal_clearance_date) return false; // No legal clearance date, exclude
          
          // Compare dates by date only (ignore time) to avoid timezone issues
          const clearanceDateMatch = String(match.legal_clearance_date).match(/^(\d{4})-(\d{2})-(\d{2})/);
          let clearanceDateOnly: Date;
          if (clearanceDateMatch) {
            const [, year, month, day] = clearanceDateMatch;
            clearanceDateOnly = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          } else {
            clearanceDateOnly = new Date(match.legal_clearance_date);
            clearanceDateOnly.setHours(0, 0, 0, 0);
          }
          
          const fromDate = legalClearanceDateFrom ? new Date(legalClearanceDateFrom + 'T00:00:00') : null;
          const toDate = legalClearanceDateTo ? new Date(legalClearanceDateTo + 'T23:59:59') : null;
          
          if (fromDate && clearanceDateOnly < fromDate) {
            return false;
          }
          if (toDate && clearanceDateOnly > toDate) {
            return false;
          }
        }

        // Filter by medication start date range
        if (medicationStartDateFrom || medicationStartDateTo) {
          if (!match.medication_start_date) return false; // No medication start date, exclude
          
          // Compare dates by date only (ignore time) to avoid timezone issues
          const medicationDateMatch = String(match.medication_start_date).match(/^(\d{4})-(\d{2})-(\d{2})/);
          let medicationDateOnly: Date;
          if (medicationDateMatch) {
            const [, year, month, day] = medicationDateMatch;
            medicationDateOnly = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          } else {
            medicationDateOnly = new Date(match.medication_start_date);
            medicationDateOnly.setHours(0, 0, 0, 0);
          }
          
          const fromDate = medicationStartDateFrom ? new Date(medicationStartDateFrom + 'T00:00:00') : null;
          const toDate = medicationStartDateTo ? new Date(medicationStartDateTo + 'T23:59:59') : null;
          
          if (fromDate && medicationDateOnly < fromDate) {
            return false;
          }
          if (toDate && medicationDateOnly > toDate) {
            return false;
          }
        }

        // Filter by pregnancy test date range
        if (pregnancyTestDateFrom || pregnancyTestDateTo) {
          if (!match.pregnancy_test_date) return false; // No pregnancy test date, exclude
          
          // Compare dates by date only (ignore time) to avoid timezone issues
          const pregnancyTestDateMatch = String(match.pregnancy_test_date).match(/^(\d{4})-(\d{2})-(\d{2})/);
          let pregnancyTestDateOnly: Date;
          if (pregnancyTestDateMatch) {
            const [, year, month, day] = pregnancyTestDateMatch;
            pregnancyTestDateOnly = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          } else {
            pregnancyTestDateOnly = new Date(match.pregnancy_test_date);
            pregnancyTestDateOnly.setHours(0, 0, 0, 0);
          }
          
          const fromDate = pregnancyTestDateFrom ? new Date(pregnancyTestDateFrom + 'T00:00:00') : null;
          const toDate = pregnancyTestDateTo ? new Date(pregnancyTestDateTo + 'T23:59:59') : null;
          
          if (fromDate && pregnancyTestDateOnly < fromDate) {
            return false;
          }
          if (toDate && pregnancyTestDateOnly > toDate) {
            return false;
          }
        }

        // Filter by transfer date range
        if (transferDateFrom || transferDateTo) {
          if (!match.transfer_date) return false;
          const transferDate = new Date(match.transfer_date);
          if (transferDateFrom && transferDate < new Date(transferDateFrom + 'T00:00:00')) return false;
          if (transferDateTo && transferDate > new Date(transferDateTo + 'T23:59:59')) return false;
        }

        // Filter by second pregnancy test date range
        const matchAny = match as { pregnancy_test_date_2?: string | null };
        if (pregnancyTestDate2From || pregnancyTestDate2To) {
          if (!matchAny.pregnancy_test_date_2) return false;
          const d2Match = String(matchAny.pregnancy_test_date_2).match(/^(\d{4})-(\d{2})-(\d{2})/);
          let d2Only: Date;
          if (d2Match) {
            const [, y, m, d] = d2Match;
            d2Only = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
          } else {
            d2Only = new Date(matchAny.pregnancy_test_date_2);
            d2Only.setHours(0, 0, 0, 0);
          }
          if (pregnancyTestDate2From && d2Only < new Date(pregnancyTestDate2From + 'T00:00:00')) return false;
          if (pregnancyTestDate2To && d2Only > new Date(pregnancyTestDate2To + 'T23:59:59')) return false;
        }

        // Filter by fetal heartbeat count
        const matchFhb = match as { fetal_heartbeat_count?: number | null };
        if (fetalHeartbeatCount !== null && fetalHeartbeatCount !== '') {
          const wanted = parseInt(fetalHeartbeatCount, 10);
          if (matchFhb.fetal_heartbeat_count == null || matchFhb.fetal_heartbeat_count !== wanted) return false;
        }

        // Filter by client name
        if (clientName && clientName.trim()) {
          const parentId = match.parent_id || match.first_parent_id;
          const parent = parentId ? parentProfilesMap.get(parentId) : null;
          const pName = (parent as { name?: string } | null)?.name || '';
          if (!pName.toLowerCase().includes(clientName.trim().toLowerCase())) return false;
        }

        // Filter by surrogate name
        if (surrogateName && surrogateName.trim()) {
          const surrogate = match.surrogate_id ? surrogateProfilesMap.get(match.surrogate_id) : null;
          const sName = (surrogate as { name?: string } | null)?.name || '';
          if (!sName.toLowerCase().includes(surrogateName.trim().toLowerCase())) return false;
        }

        // Filter by medical exam result - search in Pre-Transfer report_data
        if (medicalExamResult && medicalExamResult.trim()) {
          const key = medicalExamResult.trim().toLowerCase();
          const reportsForUser = allMedicalReports?.filter(r => r.user_id === match.surrogate_id) || [];
          const reportDataStr = reportsForUser.map(r => JSON.stringify((r as { report_data?: unknown }).report_data || {})).join(' ').toLowerCase();
          if (!reportDataStr.includes(key)) return false;
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

    // Extract embryo quality (PGS): two categories
    const embryoGrades: Record<string, number> = { 'PGS-tested': 0, 'Untested': 0 };
    matches?.forEach(match => {
      const embryoStr = (match.embryos && match.embryos.toString().toUpperCase()) || '';
      if (embryoStr.includes('PGS')) {
        embryoGrades['PGS-tested'] = (embryoGrades['PGS-tested'] || 0) + 1;
      } else {
        embryoGrades['Untested'] = (embryoGrades['Untested'] || 0) + 1;
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
    const transferHotels = new Set<string>();
    
    surrogateProfiles?.forEach(profile => {
      if (profile.location) surrogateLocations.add(profile.location);
      if (profile.race) surrogateRaces.add(profile.race);
    });
    
    // Collect IVF clinics and transfer hotels from matches table
    allMatches?.forEach(match => {
      if (match.clinic) ivfClinics.add(match.clinic);
      if (match.transfer_hotel) transferHotels.add(match.transfer_hotel);
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
          transferHotel: transferHotel || null,
          transferNumber: transferNumber || null,
          medicalExamDateFrom: medicalExamDateFrom || null,
          medicalExamDateTo: medicalExamDateTo || null,
          legalClearanceDateFrom: legalClearanceDateFrom || null,
          legalClearanceDateTo: legalClearanceDateTo || null,
          medicationStartDateFrom: medicationStartDateFrom || null,
          medicationStartDateTo: medicationStartDateTo || null,
          pregnancyTestDateFrom: pregnancyTestDateFrom || null,
          pregnancyTestDateTo: pregnancyTestDateTo || null,
          transferDateFrom: transferDateFrom || null,
          transferDateTo: transferDateTo || null,
          pregnancyTestDate2From: pregnancyTestDate2From || null,
          pregnancyTestDate2To: pregnancyTestDate2To || null,
          fetalHeartbeatCount: fetalHeartbeatCount || null,
          clientName: clientName || null,
          surrogateName: surrogateName || null,
          medicalExamResult: medicalExamResult || null,
        },
        available: {
          surrogateAgeRanges: ['20-25', '26-30', '31-35', '36-40', '41-45', '46+'],
          embryoGrades: ['PGS-tested', 'Untested'],
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
          transferHotels: Array.from(transferHotels).sort(),
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

