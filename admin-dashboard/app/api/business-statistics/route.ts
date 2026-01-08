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
    // First, get all matches to see what we have
    // Use service role key to bypass RLS and get all matches
    const { data: allMatches, error: allMatchesError } = await supabase
      .from('surrogate_matches')
      .select('id, transfer_date, beta_confirm_date, embryos, parent_id, first_parent_id, second_parent_id, status')
      .limit(1000); // Add limit to prevent timeout

    if (allMatchesError) throw allMatchesError;

    // For business statistics, we want comprehensive data
    // Filter matches with transfer_date
    let matches = allMatches?.filter(m => m.transfer_date !== null) || [];

    // Get parent profiles for age calculation
    const parentIds = new Set<string>();
    matches?.forEach(match => {
      if (match.parent_id) parentIds.add(match.parent_id);
      if (match.first_parent_id) parentIds.add(match.first_parent_id);
      if (match.second_parent_id) parentIds.add(match.second_parent_id);
    });

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

    const result = {
      statistics: {
        transplantSuccessRate: {
          total: totalTransfers,
          successful: successfulTransfers,
          rate: Math.round(successRate * 100) / 100,
        },
        clientAgeRanges: ageRanges,
        embryoGrades,
        transferCounts: {
          total: totalTransfers,
          breakdown: transferCounts,
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

