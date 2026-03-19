import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

type AdminAccessDenied = { authorized: false; error: string };
type AdminAccessGranted = { authorized: true; supabase: SupabaseClient };
type AdminAccessResult = AdminAccessDenied | AdminAccessGranted;

async function checkAdminAccess(adminUserId: string | undefined): Promise<AdminAccessResult> {
  if (!adminUserId) {
    return { authorized: false, error: 'Unauthorized' };
  }

  if (!supabaseUrl || !serviceKey) {
    return { authorized: false, error: 'Missing Supabase env vars' };
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: sessionData, error: sessionError } = await supabase
    .from('admin_users')
    .select('id, role')
    .eq('id', adminUserId)
    .single();

  if (sessionError || !sessionData || sessionData.role !== 'admin') {
    return { authorized: false, error: 'Unauthorized. Only admins can access this resource.' };
  }

  return { authorized: true, supabase };
}

// GET - finance managers list
export async function GET(req: NextRequest) {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 });
  }

  const adminUserId = req.cookies.get('admin_user_id')?.value;
  const authCheck = await checkAdminAccess(adminUserId);
  if (!authCheck.authorized) {
    return NextResponse.json(
      { error: authCheck.error },
      { status: authCheck.error.includes('Only admins') ? 403 : 401 }
    );
  }

  try {
    const supabase = authCheck.supabase;
    const { data: financeManagers, error } = await supabase
      .from('admin_users')
      .select(`
        id,
        name,
        username,
        email,
        role,
        branch_id,
        read_only,
        created_at,
        updated_at,
        branches:branch_id (
          id,
          name,
          code
        )
      `)
      .eq('role', 'finance_manager')
      .order('name', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ financeManagers: financeManagers || [] });
  } catch (error: any) {
    console.error('[admin/finance-managers] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load finance managers' },
      { status: 500 }
    );
  }
}

// POST - create new finance manager
export async function POST(req: NextRequest) {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 });
  }

  const adminUserId = req.cookies.get('admin_user_id')?.value;
  const authCheck = await checkAdminAccess(adminUserId);
  if (!authCheck.authorized) {
    return NextResponse.json(
      { error: authCheck.error },
      { status: authCheck.error.includes('Only admins') ? 403 : 401 }
    );
  }

  try {
    const supabase = authCheck.supabase;
    const body = await req.json();
    const { name, username, email, password, branch_id } = body;

    // Validation
    if (!name || !username || !password || !branch_id) {
      return NextResponse.json(
        { error: 'Name, username, password, and branch are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('admin_users')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (checkError) {
      console.error('[admin/finance-managers] Error checking username:', checkError);
      return NextResponse.json(
        { error: 'Failed to check username availability' },
        { status: 500 }
      );
    }

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 409 }
      );
    }

    // Verify branch exists
    const { data: branch, error: branchError } = await supabase
      .from('branches')
      .select('id, name')
      .eq('id', branch_id)
      .single();

    if (branchError || !branch) {
      return NextResponse.json(
        { error: 'Invalid branch selected' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert new finance manager (read-only enforced)
    const { data: newManager, error: insertError } = await supabase
      .from('admin_users')
      .insert({
        name,
        username,
        email: email || null,
        password_hash: passwordHash,
        role: 'finance_manager',
        branch_id,
        read_only: true,
      })
      .select('id, name, username, email, role, branch_id, read_only, created_at, updated_at')
      .single();

    if (insertError) {
      console.error('[admin/finance-managers] Error creating finance manager:', insertError);
      return NextResponse.json(
        { error: insertError.message || 'Failed to create finance manager' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Finance manager created successfully',
      financeManager: {
        ...newManager,
        branch,
      },
    });
  } catch (error: any) {
    console.error('[admin/finance-managers] POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create finance manager' },
      { status: 500 }
    );
  }
}

