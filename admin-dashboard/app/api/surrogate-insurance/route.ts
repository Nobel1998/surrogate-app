import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { isReadOnlyBranchManager } from '@/lib/checkReadOnly';
import {
  buildMatchOrNullSurrogateOrFilter,
  getAccessibleMatchIds,
  getPartyUserIdsForMatches,
  getSurrogateIdsForMatches,
  rowAllowedForScopedManager,
} from '@/lib/managerMatchScope';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

type AuthOk = { isAdmin: true; adminUser: { id: string; role: string | null } };
type AuthFail = { isAdmin: false; error: string };

// Helper function to check admin authentication
async function checkAdminAuth(): Promise<AuthOk | AuthFail> {
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

// GET - Fetch insurance records
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
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');
    const matchId = searchParams.get('match_id');

    const role = (authCheck.adminUser.role || '').toLowerCase();
    const accessible = await getAccessibleMatchIds(supabase, authCheck.adminUser.id, role);

    if (accessible !== null) {
      if (accessible.length === 0) {
        return NextResponse.json({ insurance: [] });
      }
      if (matchId && !accessible.includes(matchId)) {
        return NextResponse.json({ insurance: [] });
      }
      if (userId) {
        const party = await getPartyUserIdsForMatches(supabase, accessible);
        if (!party.has(userId)) {
          return NextResponse.json({ insurance: [] });
        }
      }
    }

    let query = supabase
      .from('surrogate_insurance')
      .select('*')
      .order('active_date', { ascending: false });

    if (accessible !== null) {
      const sur = await getSurrogateIdsForMatches(supabase, accessible);
      query = query.or(buildMatchOrNullSurrogateOrFilter(accessible, sur));
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (matchId) {
      query = query.eq('match_id', matchId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ insurance: data || [] });
  } catch (error: any) {
    console.error('[surrogate-insurance] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch insurance records' },
      { status: 500 }
    );
  }
}

// POST - Create insurance record
export async function POST(req: NextRequest) {
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
    if (await isReadOnlyBranchManager(supabase, (await cookies()).get('admin_user_id')?.value)) {
      return NextResponse.json(
        { error: 'View-only access. You cannot modify data.' },
        { status: 403 }
      );
    }

    const role = (authCheck.adminUser.role || '').toLowerCase();
    const accessible = await getAccessibleMatchIds(supabase, authCheck.adminUser.id, role);

    const body = await req.json();
    const {
      user_id,
      match_id,
      insurance_company,
      premium,
      active_date,
      agent,
      purchased_by,
      policy_number,
      date_of_birth,
      zip_code,
      notes,
    } = body;

    if (!user_id || !insurance_company || !active_date || !purchased_by) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, insurance_company, active_date, purchased_by' },
        { status: 400 }
      );
    }

    if (!['agency', 'own', 'employer'].includes(purchased_by)) {
      return NextResponse.json(
        { error: 'purchased_by must be one of: agency, own, employer' },
        { status: 400 }
      );
    }

    if (accessible !== null) {
      const ok = await rowAllowedForScopedManager(supabase, accessible, {
        match_id: match_id || null,
        user_id: user_id,
      });
      if (!ok) {
        return NextResponse.json({ error: 'Not allowed for this match or user' }, { status: 403 });
      }
    }

    const { data, error } = await supabase
      .from('surrogate_insurance')
      .insert({
        user_id,
        match_id: match_id || null,
        insurance_company: insurance_company.trim(),
        premium: premium ? parseFloat(premium) : null,
        active_date,
        agent: agent?.trim() || null,
        purchased_by,
        policy_number: policy_number?.trim() || null,
        date_of_birth: date_of_birth || null,
        zip_code: zip_code?.trim() || null,
        notes: notes?.trim() || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ insurance: data });
  } catch (error: any) {
    console.error('[surrogate-insurance] POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create insurance record' },
      { status: 500 }
    );
  }
}

// PUT - Update insurance record
export async function PUT(req: NextRequest) {
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
    if (await isReadOnlyBranchManager(supabase, (await cookies()).get('admin_user_id')?.value)) {
      return NextResponse.json(
        { error: 'View-only access. You cannot modify data.' },
        { status: 403 }
      );
    }

    const role = (authCheck.adminUser.role || '').toLowerCase();
    const accessible = await getAccessibleMatchIds(supabase, authCheck.adminUser.id, role);

    const body = await req.json();
    const {
      id,
      insurance_company,
      premium,
      active_date,
      agent,
      purchased_by,
      policy_number,
      date_of_birth,
      zip_code,
      notes,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing insurance record ID' },
        { status: 400 }
      );
    }

    if (purchased_by && !['agency', 'own', 'employer'].includes(purchased_by)) {
      return NextResponse.json(
        { error: 'purchased_by must be one of: agency, own, employer' },
        { status: 400 }
      );
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };
    if (insurance_company !== undefined) updateData.insurance_company = insurance_company.trim();
    if (premium !== undefined) updateData.premium = premium ? parseFloat(premium) : null;
    if (active_date !== undefined) updateData.active_date = active_date;
    if (agent !== undefined) updateData.agent = agent?.trim() || null;
    if (purchased_by !== undefined) updateData.purchased_by = purchased_by;
    if (policy_number !== undefined) updateData.policy_number = policy_number?.trim() || null;
    if (date_of_birth !== undefined) updateData.date_of_birth = date_of_birth || null;
    if (zip_code !== undefined) updateData.zip_code = zip_code?.trim() || null;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;

    const { data: existing, error: fetchErr } = await supabase
      .from('surrogate_insurance')
      .select('id, match_id, user_id')
      .eq('id', id)
      .single();
    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    if (accessible !== null) {
      const ok = await rowAllowedForScopedManager(supabase, accessible, {
        match_id: existing.match_id,
        user_id: existing.user_id,
      });
      if (!ok) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const { data, error } = await supabase
      .from('surrogate_insurance')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ insurance: data });
  } catch (error: any) {
    console.error('[surrogate-insurance] PUT error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update insurance record' },
      { status: 500 }
    );
  }
}

// DELETE - Delete insurance record
export async function DELETE(req: NextRequest) {
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
    if (await isReadOnlyBranchManager(supabase, (await cookies()).get('admin_user_id')?.value)) {
      return NextResponse.json(
        { error: 'View-only access. You cannot modify data.' },
        { status: 403 }
      );
    }

    const role = (authCheck.adminUser.role || '').toLowerCase();
    const accessible = await getAccessibleMatchIds(supabase, authCheck.adminUser.id, role);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing insurance record ID' },
        { status: 400 }
      );
    }

    const { data: existing, error: fetchErr } = await supabase
      .from('surrogate_insurance')
      .select('id, match_id, user_id')
      .eq('id', id)
      .single();
    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    if (accessible !== null) {
      const ok = await rowAllowedForScopedManager(supabase, accessible, {
        match_id: existing.match_id,
        user_id: existing.user_id,
      });
      if (!ok) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const { error } = await supabase
      .from('surrogate_insurance')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[surrogate-insurance] DELETE error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete insurance record' },
      { status: 500 }
    );
  }
}

