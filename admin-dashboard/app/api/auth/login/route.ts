import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
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
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Find admin user by username
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, role, branch_id, admin_username, admin_password_hash')
      .eq('admin_username', username)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Check if user is admin or branch_manager
    const role = (profile.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'branch_manager') {
      return NextResponse.json(
        { error: 'User is not authorized to access admin dashboard' },
        { status: 403 }
      );
    }

    // Verify password
    if (!profile.admin_password_hash) {
      return NextResponse.json(
        { error: 'Password not set for this user. Please contact administrator.' },
        { status: 401 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, profile.admin_password_hash);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Create session cookie
    const cookieStore = await cookies();
    cookieStore.set('admin_user_id', profile.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return NextResponse.json({
      success: true,
      user: {
        id: profile.id,
        name: profile.name,
        role: role,
        branch_id: profile.branch_id,
      },
    });
  } catch (error: any) {
    console.error('[auth/login] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Login failed' },
      { status: 500 }
    );
  }
}
