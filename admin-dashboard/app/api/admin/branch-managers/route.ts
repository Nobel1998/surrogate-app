import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

// GET all branch managers
export async function GET(req: NextRequest) {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase env vars' },
      { status: 500 }
    );
  }

  // Check if user is admin
  const sessionCookie = req.cookies.get('admin_session');
  if (!sessionCookie) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // Verify session and check if user is admin
    const { data: sessionData, error: sessionError } = await supabase
      .from('admin_users')
      .select('id, role')
      .eq('id', sessionCookie.value)
      .single();

    if (sessionError || !sessionData || sessionData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins can access this resource.' },
        { status: 403 }
      );
    }

    // Fetch all branch managers with branch info
    const { data: branchManagers, error: fetchError } = await supabase
      .from('admin_users')
      .select(`
        id,
        name,
        username,
        email,
        role,
        branch_id,
        created_at,
        updated_at,
        branches:branch_id (
          id,
          name,
          code
        )
      `)
      .eq('role', 'branch_manager')
      .order('name', { ascending: true });

    if (fetchError) throw fetchError;

    return NextResponse.json({ branchManagers: branchManagers || [] });
  } catch (error: any) {
    console.error('[admin/branch-managers] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load branch managers' },
      { status: 500 }
    );
  }
}

// POST - Create new branch manager
export async function POST(req: NextRequest) {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase env vars' },
      { status: 500 }
    );
  }

  // Check if user is admin
  const sessionCookie = req.cookies.get('admin_session');
  if (!sessionCookie) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // Verify session and check if user is admin
    const { data: sessionData, error: sessionError } = await supabase
      .from('admin_users')
      .select('id, role')
      .eq('id', sessionCookie.value)
      .single();

    if (sessionError || !sessionData || sessionData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins can create branch managers.' },
        { status: 403 }
      );
    }

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

    // Validate email format if provided
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
      console.error('[admin/branch-managers] Error checking username:', checkError);
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

    // Insert new branch manager
    const { data: newManager, error: insertError } = await supabase
      .from('admin_users')
      .insert({
        name: name,
        username: username,
        email: email || null,
        password_hash: passwordHash,
        role: 'branch_manager',
        branch_id: branch_id,
      })
      .select('id, name, username, email, role, branch_id, created_at')
      .single();

    if (insertError) {
      console.error('[admin/branch-managers] Error creating branch manager:', insertError);
      return NextResponse.json(
        { error: insertError.message || 'Failed to create branch manager' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Branch manager created successfully',
      branchManager: {
        ...newManager,
        branch: branch,
      },
    });
  } catch (error: any) {
    console.error('[admin/branch-managers] POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create branch manager' },
      { status: 500 }
    );
  }
}

