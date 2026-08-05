import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

async function checkAdminAccess(adminUserId: string | undefined) {
  if (!adminUserId) {
    return { authorized: false as const, error: 'Unauthorized' };
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
    return {
      authorized: false as const,
      error: 'Unauthorized. Only admins can access this resource.',
    };
  }

  return { authorized: true as const, supabase };
}

// PUT - Update finance manager
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const supabase = authCheck.supabase;

  try {
    const { id } = await params;
    const body = await req.json();
    const { name, username, email, password, branch_id } = body;

    const { data: existingManager, error: fetchError } = await supabase
      .from('admin_users')
      .select('id, role, username')
      .eq('id', id)
      .eq('role', 'finance_manager')
      .single();

    if (fetchError || !existingManager) {
      return NextResponse.json({ error: 'Finance manager not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {
      read_only: true,
    };

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) {
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
      }
      updateData.email = email || null;
    }

    if (username !== undefined && username !== existingManager.username) {
      const { data: taken } = await supabase
        .from('admin_users')
        .select('id')
        .eq('username', username)
        .neq('id', id)
        .maybeSingle();
      if (taken) {
        return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
      }
      updateData.username = username;
    }

    if (branch_id !== undefined) {
      const { data: branch, error: branchError } = await supabase
        .from('branches')
        .select('id')
        .eq('id', branch_id)
        .single();
      if (branchError || !branch) {
        return NextResponse.json({ error: 'Invalid branch selected' }, { status: 400 });
      }
      updateData.branch_id = branch_id;
    }

    if (password) {
      if (String(password).length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters' },
          { status: 400 }
        );
      }
      updateData.password_hash = await bcrypt.hash(String(password), 10);
    }

    const { data: updated, error: updateError } = await supabase
      .from('admin_users')
      .update(updateData)
      .eq('id', id)
      .eq('role', 'finance_manager')
      .select('id, name, username, email, role, branch_id, read_only, status, created_at, updated_at')
      .single();

    if (updateError) {
      console.error('[admin/finance-managers] Update error:', updateError);
      return NextResponse.json(
        { error: updateError.message || 'Failed to update finance manager' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Finance manager updated successfully',
      financeManager: updated,
    });
  } catch (error: any) {
    console.error('[admin/finance-managers] PUT error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update finance manager' },
      { status: 500 }
    );
  }
}

// DELETE - Delete finance manager
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const supabase = authCheck.supabase;

  try {
    const { id } = await params;

    const { data: existingManager, error: fetchError } = await supabase
      .from('admin_users')
      .select('id, role')
      .eq('id', id)
      .eq('role', 'finance_manager')
      .single();

    if (fetchError || !existingManager) {
      return NextResponse.json({ error: 'Finance manager not found' }, { status: 404 });
    }

    const { error: deleteError } = await supabase.from('admin_users').delete().eq('id', id);

    if (deleteError) {
      console.error('[admin/finance-managers] Delete error:', deleteError);
      return NextResponse.json(
        { error: deleteError.message || 'Failed to delete finance manager' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Finance manager deleted successfully',
    });
  } catch (error: any) {
    console.error('[admin/finance-managers] DELETE error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete finance manager' },
      { status: 500 }
    );
  }
}
