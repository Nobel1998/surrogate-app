import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

// GET all branches
export async function GET() {
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
    const { data: branches, error: branchesError } = await supabase
      .from('branches')
      .select('id, name, code, address, phone, email, created_at, updated_at')
      .order('name', { ascending: true });

    if (branchesError) throw branchesError;

    return NextResponse.json({ branches: branches || [] });
  } catch (error: any) {
    console.error('[branches] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load branches' },
      { status: 500 }
    );
  }
}

// POST: Create a new branch
export async function POST(req: NextRequest) {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase env vars' },
      { status: 500 }
    );
  }

  // Check if user is admin
  const adminUserId = req.cookies.get('admin_user_id')?.value;
  if (!adminUserId) {
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
      .eq('id', adminUserId)
      .single();

    if (sessionError || !sessionData || sessionData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins can create branches.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, code, address, phone, email } = body;

    if (!name || !code) {
      return NextResponse.json(
        { error: 'Missing required fields: name, code' },
        { status: 400 }
      );
    }

    // Validate code format (should be lowercase with underscores)
    const codePattern = /^[a-z0-9_]+$/;
    if (!codePattern.test(code)) {
      return NextResponse.json(
        { error: 'Code must be lowercase alphanumeric with underscores only (e.g., main, high_desert)' },
        { status: 400 }
      );
    }

    const { data: insertedData, error } = await supabase
      .from('branches')
      .insert({
        name,
        code,
        address: address || null,
        phone: phone || null,
        email: email || null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      // Handle unique constraint violations
      if (error.code === '23505') {
        if (error.message.includes('name')) {
          return NextResponse.json(
            { error: 'A branch with this name already exists' },
            { status: 400 }
          );
        }
        if (error.message.includes('code')) {
          return NextResponse.json(
            { error: 'A branch with this code already exists' },
            { status: 400 }
          );
        }
      }
      throw error;
    }

    return NextResponse.json({ data: insertedData, success: true });
  } catch (error: any) {
    console.error('[branches] POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create branch' },
      { status: 500 }
    );
  }
}

// PATCH: Update a branch
export async function PATCH(req: NextRequest) {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase env vars' },
      { status: 500 }
    );
  }

  // Check if user is admin
  const adminUserId = req.cookies.get('admin_user_id')?.value;
  if (!adminUserId) {
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
      .eq('id', adminUserId)
      .single();

    if (sessionError || !sessionData || sessionData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins can update branches.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing branch id' },
        { status: 400 }
      );
    }

    // Validate code format if provided
    if (updates.code) {
      const codePattern = /^[a-z0-9_]+$/;
      if (!codePattern.test(updates.code)) {
        return NextResponse.json(
          { error: 'Code must be lowercase alphanumeric with underscores only (e.g., main, high_desert)' },
          { status: 400 }
        );
      }
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('branches')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      // Handle unique constraint violations
      if (error.code === '23505') {
        if (error.message.includes('name')) {
          return NextResponse.json(
            { error: 'A branch with this name already exists' },
            { status: 400 }
          );
        }
        if (error.message.includes('code')) {
          return NextResponse.json(
            { error: 'A branch with this code already exists' },
            { status: 400 }
          );
        }
      }
      throw error;
    }

    return NextResponse.json({ data, success: true });
  } catch (error: any) {
    console.error('[branches] PATCH error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update branch' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a branch
export async function DELETE(req: NextRequest) {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase env vars' },
      { status: 500 }
    );
  }

  // Check if user is admin
  const adminUserId = req.cookies.get('admin_user_id')?.value;
  if (!adminUserId) {
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
      .eq('id', adminUserId)
      .single();

    if (sessionError || !sessionData || sessionData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins can delete branches.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing branch id' },
        { status: 400 }
      );
    }

    // Check if branch is being used by any profiles or matches
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .eq('branch_id', id)
      .limit(1);

    if (profilesError) throw profilesError;

    const { data: matches, error: matchesError } = await supabase
      .from('surrogate_matches')
      .select('id')
      .eq('branch_id', id)
      .limit(1);

    if (matchesError) throw matchesError;

    if (profiles && profiles.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete branch. It is assigned to one or more profiles.' },
        { status: 400 }
      );
    }

    if (matches && matches.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete branch. It is assigned to one or more matches.' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('branches')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[branches] DELETE error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete branch' },
      { status: 500 }
    );
  }
}
