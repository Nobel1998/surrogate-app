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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'business-statistics/route.ts:58',message:'Starting statistics calculation',data:{timestamp:new Date().toISOString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // First, get all matches to see what we have
    const { data: allMatches, error: allMatchesError } = await supabase
      .from('surrogate_matches')
      .select('id, transfer_date, beta_confirm_date, embryos, parent_id, first_parent_id, second_parent_id, status');

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'business-statistics/route.ts:59',message:'All matches query result',data:{allMatchesCount:allMatches?.length||0,error:allMatchesError?.message||null,matchesWithTransferDate:allMatches?.filter(m=>m.transfer_date).length||0,matchesActive:allMatches?.filter(m=>m.status==='active').length||0,matchesActiveWithTransfer:allMatches?.filter(m=>m.status==='active'&&m.transfer_date).length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    if (allMatchesError) throw allMatchesError;

    // Filter matches with transfer dates and active status
    const matches = allMatches?.filter(m => m.transfer_date !== null && m.status === 'active') || [];

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'business-statistics/route.ts:72',message:'Filtered matches result',data:{filteredMatchesCount:matches.length,sampleMatches:matches.slice(0,3).map(m=>({id:m.id,transfer_date:m.transfer_date,beta_confirm_date:m.beta_confirm_date,status:m.status}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Get parent profiles for age calculation
    const parentIds = new Set<string>();
    matches?.forEach(match => {
      if (match.parent_id) parentIds.add(match.parent_id);
      if (match.first_parent_id) parentIds.add(match.first_parent_id);
      if (match.second_parent_id) parentIds.add(match.second_parent_id);
    });

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'business-statistics/route.ts:75',message:'Parent IDs collected',data:{parentIdsCount:parentIds.size,parentIdsArray:Array.from(parentIds).slice(0,5)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    const { data: parentProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, date_of_birth')
      .in('id', Array.from(parentIds));

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'business-statistics/route.ts:82',message:'Parent profiles query result',data:{profilesCount:parentProfiles?.length||0,error:profilesError?.message||null,firstProfile:parentProfiles?.[0]||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    if (profilesError) throw profilesError;

    // Calculate statistics
    const totalTransfers = matches?.length || 0;
    const successfulTransfers = matches?.filter(m => m.beta_confirm_date !== null).length || 0;
    const successRate = totalTransfers > 0 ? (successfulTransfers / totalTransfers) * 100 : 0;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'business-statistics/route.ts:88',message:'Transfer statistics calculated',data:{totalTransfers,successfulTransfers,successRate,matchesWithBeta:matches?.filter(m=>m.beta_confirm_date).map(m=>({id:m.id,beta:m.beta_confirm_date}))||[]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'business-statistics/route.ts:105',message:'Processing embryo grade',data:{matchId:match.id,embryosRaw:match.embryos,embryosStr:embryoStr},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
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

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'business-statistics/route.ts:123',message:'Embryo grades calculated',data:{embryoGrades,matchesWithEmbryos:matches?.filter(m=>m.embryos).length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

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

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'business-statistics/route.ts:150',message:'Final statistics result',data:result,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[business-statistics] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch business statistics' },
      { status: 500 }
    );
  }
}

