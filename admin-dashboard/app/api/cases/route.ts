import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

// GET all cases with filters
export async function GET(req: NextRequest) {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase env vars' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const url = new URL(req.url);
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || '';
    const branchId = url.searchParams.get('branch_id') || '';
    
    // Get admin user for branch and manager filtering
    const cookieStore = await cookies();
    const adminUserId = cookieStore.get('admin_user_id')?.value;
    let effectiveBranchId = branchId;
    let isSuperAdmin = false;
    let isBranchManager = false;
    let isCaseManager = false;

    if (adminUserId && !branchId) {
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('role, branch_id')
        .eq('id', adminUserId)
        .single();

      if (adminUser) {
        const role = (adminUser.role || '').toLowerCase();
        if (role === 'admin') {
          isSuperAdmin = true;
        } else if (role === 'branch_manager') {
          isBranchManager = true;
          if (adminUser.branch_id) {
            effectiveBranchId = adminUser.branch_id;
          }
        } else {
          // Other roles (like case_manager, or any non-admin, non-branch_manager role)
          // should see cases assigned to them via case_managers table
          isCaseManager = true;
        }
      }
      
      console.log('[cases] Admin user role check:', {
        adminUserId,
        role: adminUser?.role,
        isSuperAdmin,
        isBranchManager,
        isCaseManager,
        effectiveBranchId,
      });
    }

    let query = supabase
      .from('cases')
      .select(`
        id,
        claim_id,
        surrogate_id,
        first_parent_id,
        first_parent_name,
        second_parent_id,
        second_parent_name,
        case_type,
        manager_id,
        branch_id,
        current_step,
        weeks_pregnant,
        estimated_due_date,
        number_of_fetuses,
        fetal_beat_confirm,
        sign_date,
        transfer_date,
        beta_confirm_date,
        due_date,
        clinic,
        embryos,
        lawyer,
        company,
        files,
        status,
        created_at,
        updated_at
      `);

    // Get cases assigned to this manager (regardless of role)
    // This allows any manager to see cases assigned to them via case_managers table
    const { data: assignedCaseIds, error: assignedError } = await supabase
      .from('case_managers')
      .select('case_id')
      .eq('manager_id', adminUserId);
    
    if (assignedError) {
      console.error('[cases] Error fetching case_managers:', assignedError);
    }
    
    const caseIdsFromTable = assignedCaseIds?.map(c => c.case_id).filter(Boolean) || [];
    
    // Also get cases with legacy manager_id
    const { data: legacyCases, error: legacyError } = await supabase
      .from('cases')
      .select('id')
      .eq('manager_id', adminUserId);
    
    if (legacyError) {
      console.error('[cases] Error fetching legacy cases:', legacyError);
    }
    
    const legacyCaseIds = legacyCases?.map(c => c.id).filter(Boolean) || [];
    
    // Combine all case IDs assigned to this manager
    const assignedCaseIdsList = [...new Set([...caseIdsFromTable, ...legacyCaseIds])];
    
    console.log('[cases] Manager assigned cases:', {
      adminUserId,
      role: adminUser?.role,
      caseIdsFromTable: caseIdsFromTable.length,
      legacyCaseIds: legacyCaseIds.length,
      assignedCaseIdsList: assignedCaseIdsList.length,
      assignedCaseIdsList,
    });
    
    // Apply filters based on role
    if (isSuperAdmin) {
      // Super admin can see all cases - no filter needed
    } else if (isBranchManager && effectiveBranchId) {
      // Branch manager can see:
      // 1. Cases in their branch
      // 2. Cases assigned to them (even if not in their branch)
      if (assignedCaseIdsList.length > 0) {
        // Use .or() to combine branch filter with assigned cases
        const caseIdsStr = assignedCaseIdsList.map(id => `"${id}"`).join(',');
        query = query.or(`branch_id.eq."${effectiveBranchId}",id.in.(${caseIdsStr})`);
      } else {
        query = query.eq('branch_id', effectiveBranchId);
      }
    } else if (assignedCaseIdsList.length > 0) {
      // Any other manager (or if adminUserId exists but role is not admin/branch_manager)
      // can only see cases assigned to them
      query = query.in('id', assignedCaseIdsList);
    } else if (effectiveBranchId) {
      // Fallback: filter by branch if specified
      query = query.eq('branch_id', effectiveBranchId);
    } else if (adminUserId && !isSuperAdmin && !isBranchManager) {
      // If manager has no assigned cases and is not super admin or branch manager, return empty
      query = query.eq('id', '00000000-0000-0000-0000-000000000000');
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`claim_id.ilike.%${search}%,case_type.ilike.%${search}%`);
    }

    const { data: cases, error: casesError } = await query
      .order('created_at', { ascending: false });

    if (casesError) throw casesError;

    // Fetch related profiles for surrogate and parents
    const surrogateIds = [...new Set(cases?.map(c => c.surrogate_id).filter(Boolean) || [])];
    const parentIds = [...new Set([
      ...(cases?.map(c => c.first_parent_id).filter(Boolean) || []),
      ...(cases?.map(c => c.second_parent_id).filter(Boolean) || [])
    ])];

    const profiles: Record<string, any> = {};
    
    if (surrogateIds.length > 0 || parentIds.length > 0) {
      const allIds = [...surrogateIds, ...parentIds];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name, phone')
        .in('id', allIds);

      if (profilesData) {
        profilesData.forEach(p => {
          profiles[p.id] = p;
        });
      }
    }

    // Fetch case managers (multiple managers per case)
    const caseIds = cases?.map(c => c.id).filter(Boolean) || [];
    const caseManagers: Record<string, any[]> = {};
    
    if (caseIds.length > 0) {
      const { data: caseManagersData } = await supabase
        .from('case_managers')
        .select(`
          case_id,
          manager_id,
          manager:admin_users!case_managers_manager_id_fkey(id, name, role)
        `)
        .in('case_id', caseIds);

      if (caseManagersData) {
        caseManagersData.forEach(cm => {
          if (!caseManagers[cm.case_id]) {
            caseManagers[cm.case_id] = [];
          }
          if (cm.manager) {
            caseManagers[cm.case_id].push(cm.manager);
          }
        });
      }
    }

    // Also fetch legacy manager_id for backward compatibility
    const managerIds = [...new Set(cases?.map(c => c.manager_id).filter(Boolean) || [])];
    const managers: Record<string, any> = {};

    if (managerIds.length > 0) {
      const { data: managersData } = await supabase
        .from('admin_users')
        .select('id, name')
        .in('id', managerIds);

      if (managersData) {
        managersData.forEach(m => {
          managers[m.id] = m;
        });
      }
    }

    // Enrich cases with profile and manager names
    const enrichedCases = cases?.map(c => {
      const managersList = caseManagers[c.id] || [];
      // If no managers from case_managers table, fall back to legacy manager_id
      if (managersList.length === 0 && c.manager_id && managers[c.manager_id]) {
        managersList.push(managers[c.manager_id]);
      }
      
      // Use manually entered name if available, otherwise use linked profile name
      const firstParentName = c.first_parent_name || (c.first_parent_id ? profiles[c.first_parent_id]?.name : null);
      const secondParentName = c.second_parent_name || (c.second_parent_id ? profiles[c.second_parent_id]?.name : null);
      
      return {
        ...c,
        surrogate_name: c.surrogate_id ? profiles[c.surrogate_id]?.name : null,
        first_parent_name: firstParentName,
        second_parent_name: secondParentName,
        manager_name: managersList.length > 0 ? managersList.map(m => m.name).join(', ') : null,
        managers: managersList,
        manager_ids: managersList.map(m => m.id),
      };
    }) || [];

    return NextResponse.json({ cases: enrichedCases });
  } catch (error: any) {
    console.error('[cases] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load cases' },
      { status: 500 }
    );
  }
}

// POST create new case
export async function POST(req: NextRequest) {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase env vars' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const cookieStore = await cookies();
    const adminUserId = cookieStore.get('admin_user_id')?.value;

    const body = await req.json();
    const {
      claim_id,
      surrogate_id,
      first_parent_id,
      first_parent_name,
      second_parent_id,
      second_parent_name,
      case_type,
      manager_id,
      branch_id,
      current_step,
      weeks_pregnant,
      estimated_due_date,
      number_of_fetuses,
      fetal_beat_confirm,
      sign_date,
      transfer_date,
      beta_confirm_date,
      due_date,
      clinic,
      embryos,
      lawyer,
      company,
      files,
      status,
    } = body;

    if (!claim_id) {
      return NextResponse.json(
        { error: 'claim_id is required' },
        { status: 400 }
      );
    }

    // Get branch_id from admin user if not provided
    let effectiveBranchId = branch_id;
    if (!effectiveBranchId && adminUserId) {
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('branch_id')
        .eq('id', adminUserId)
        .single();

      if (adminUser?.branch_id) {
        effectiveBranchId = adminUser.branch_id;
      }
    }

    const { data: newCase, error: insertError } = await supabase
      .from('cases')
      .insert({
        claim_id,
        surrogate_id: surrogate_id || null,
        first_parent_id: first_parent_id || null,
        first_parent_name: first_parent_name || null,
        second_parent_id: second_parent_id || null,
        second_parent_name: second_parent_name || null,
        case_type: case_type || 'Surrogacy',
        manager_id: manager_id || null,
        branch_id: effectiveBranchId || null,
        current_step: current_step || null,
        weeks_pregnant: weeks_pregnant || 0,
        estimated_due_date: estimated_due_date || null,
        number_of_fetuses: number_of_fetuses || 0,
        fetal_beat_confirm: fetal_beat_confirm || 'None',
        sign_date: sign_date || null,
        transfer_date: transfer_date || null,
        beta_confirm_date: beta_confirm_date || null,
        due_date: due_date || null,
        clinic: clinic || null,
        embryos: embryos || null,
        lawyer: lawyer || null,
        company: company || null,
        files: files || {},
        status: status || 'active',
        created_by: adminUserId || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[cases] POST error:', insertError);
      return NextResponse.json(
        { error: insertError.message || 'Failed to create case' },
        { status: 500 }
      );
    }

    return NextResponse.json({ case: newCase });
  } catch (error: any) {
    console.error('[cases] POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create case' },
      { status: 500 }
    );
  }
}
