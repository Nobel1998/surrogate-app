import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

// Helper function to check if user is admin
async function checkAdminAccess(sessionCookie: string | undefined) {
  if (!sessionCookie) {
    return { authorized: false, error: 'Unauthorized' };
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: sessionData, error: sessionError } = await supabase
    .from('admin_users')
    .select('id, role')
    .eq('id', sessionCookie)
    .single();

  if (sessionError || !sessionData || sessionData.role !== 'admin') {
    return { authorized: false, error: 'Unauthorized. Only admins can access this resource.' };
  }

  return { authorized: true, supabase };
}

// PUT - Update branch manager
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase env vars' },
      { status: 500 }
    );
  }

  const sessionCookie = req.cookies.get('admin_session')?.value;
  const authCheck = await checkAdminAccess(sessionCookie);
  
  if (!authCheck.authorized) {
    return NextResponse.json(
      { error: authCheck.error },
      { status: authCheck.error?.includes('403') ? 403 : 401 }
    );
  }

  const supabase = authCheck.supabase!;

  try {
    const { id } = params;
    const body = await req.json();
    const { name, username, email, password, branch_id } = body;

    // Check if branch manager exists
    const { data: existingManager, error: fetchError } = await supabase
      .from('admin_users')
      .select('id, role')
      .eq('id', id)
      .eq('role', 'branch_manager')
      .single();

    if (fetchError || !existingManager) {
      return NextResponse.json(
        { error: 'Branch manager not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) {
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }
      updateData.email = email || null;
    }
    if (branch_id !== undefined) {
      // Verify branch exists
      const { data: branch, error: branchError } = await supabase
        .from('branches')
        .select('id')
        .eq('id', branch_id)
        .single();

      if (branchError || !branch) {
        return NextResponse.json(
          { error: 'Invalid branch selected' },
          { status: 400 }
        );
      }
      updateData.branch_id = branch_id;
    }

    // Check username uniqueness if changed
    if (username !== undefined && username !== null) {
      const { data: existingUser, error: checkError } = await supabase
        .from('admin_users')
        .select('id')
        .eq('username', username)
        .neq('id', id)
        .maybeSingle();

      if (checkError) {
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

      updateData.username = username;
    }

    // Hash password if provided
    if (password !== undefined && password !== null && password !== '') {
      if (password.length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters' },
          { status: 400 }
        );
      }
      updateData.password_hash = await bcrypt.hash(password, 10);
    }

    // Update branch manager
    const { data: updatedManager, error: updateError } = await supabase
      .from('admin_users')
      .update(updateData)
      .eq('id', id)
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
      .single();

    if (updateError) {
      console.error('[admin/branch-managers] Update error:', updateError);
      return NextResponse.json(
        { error: updateError.message || 'Failed to update branch manager' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Branch manager updated successfully',
      branchManager: updatedManager,
    });
  } catch (error: any) {
    console.error('[admin/branch-managers] PUT error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update branch manager' },
      { status: 500 }
    );
  }
}

// DELETE - Delete branch manager
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase env vars' },
      { status: 500 }
    );
  }

  const sessionCookie = req.cookies.get('admin_session')?.value;
  const authCheck = await checkAdminAccess(sessionCookie);
  
  if (!authCheck.authorized) {
    return NextResponse.json(
      { error: authCheck.error },
      { status: authCheck.error?.includes('403') ? 403 : 401 }
    );
  }

  const supabase = authCheck.supabase!;

  try {
    const { id } = params;

    // Check if branch manager exists
    const { data: existingManager, error: fetchError } = await supabase
      .from('admin_users')
      .select('id, role')
      .eq('id', id)
      .eq('role', 'branch_manager')
      .single();

    if (fetchError || !existingManager) {
      return NextResponse.json(
        { error: 'Branch manager not found' },
        { status: 404 }
      );
    }

    // Delete branch manager
    const { error: deleteError } = await supabase
      .from('admin_users')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[admin/branch-managers] Delete error:', deleteError);
      return NextResponse.json(
        { error: deleteError.message || 'Failed to delete branch manager' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Branch manager deleted successfully',
    });
  } catch (error: any) {
    console.error('[admin/branch-managers] DELETE error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete branch manager' },
      { status: 500 }
    );
  }
}

