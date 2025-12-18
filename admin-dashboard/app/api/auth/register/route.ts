import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

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
    const body = await req.json();
    const { name, username, password, role, branch_id } = body;

    // Validation
    if (!name || !username || !password) {
      return NextResponse.json(
        { error: 'Name, username, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    if (role !== 'admin' && role !== 'branch_manager') {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin or branch_manager' },
        { status: 400 }
      );
    }

    if (role === 'branch_manager' && !branch_id) {
      return NextResponse.json(
        { error: 'Branch is required for branch manager' },
        { status: 400 }
      );
    }

    // Check if username already exists
    try {
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('admin_username', username)
        .maybeSingle();

      // maybeSingle() returns null data and no error when no rows found (which is fine)
      // It only returns an error for actual database errors
      if (checkError) {
        console.error('[auth/register] Error checking username:', checkError);
        return NextResponse.json(
          { error: `Failed to check username availability: ${checkError.message || 'Database error'}` },
          { status: 500 }
        );
      }

      // If user exists, return error
      if (existingUser) {
        return NextResponse.json(
          { error: 'Username already exists' },
          { status: 409 }
        );
      }
    } catch (err: any) {
      console.error('[auth/register] Exception checking username:', err);
      return NextResponse.json(
        { error: `Failed to check username availability: ${err.message || 'Unknown error'}` },
        { status: 500 }
      );
    }

    // Verify branch exists if branch_manager
    if (role === 'branch_manager' && branch_id) {
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
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate a new UUID for the profile
    // Note: In production, you might want to create a user in auth.users first
    // For now, we'll use Supabase's gen_random_uuid() function via RPC or generate client-side
    // Using crypto.randomUUID() which is available in Node.js 14.17.0+
    const userId = crypto.randomUUID();

    // Insert new profile
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        name: name,
        role: role,
        admin_username: username,
        admin_password_hash: passwordHash,
        branch_id: role === 'branch_manager' ? branch_id : null,
      })
      .select('id, name, role, branch_id, admin_username')
      .single();

    if (insertError) {
      console.error('[auth/register] Error creating profile:', insertError);
      return NextResponse.json(
        { error: insertError.message || 'Failed to create account' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: newProfile.id,
        name: newProfile.name,
        role: newProfile.role,
        username: newProfile.admin_username,
      },
    });
  } catch (error: any) {
    console.error('[auth/register] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Registration failed' },
      { status: 500 }
    );
  }
}
