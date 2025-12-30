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

    console.log('[auth/login] Login attempt for username/email:', username);

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username/Email and password are required' },
        { status: 400 }
      );
    }

    // Try to find admin user by username first
    let { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id, name, role, branch_id, username, email, password_hash')
      .eq('username', username)
      .maybeSingle();

    console.log('[auth/login] Username query result:', { 
      hasUser: !!adminUser, 
      error: adminError?.message,
      errorCode: adminError?.code 
    });

    // If not found by username, try email
    if (!adminUser && !adminError) {
      // Check if input looks like an email
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username);
      
      if (isEmail) {
        console.log('[auth/login] Trying email lookup for:', username);
        const emailResult = await supabase
          .from('admin_users')
          .select('id, name, role, branch_id, username, email, password_hash')
          .eq('email', username)
          .maybeSingle();
        
        adminUser = emailResult.data;
        adminError = emailResult.error;
        
        console.log('[auth/login] Email query result:', { 
          hasUser: !!adminUser, 
          error: adminError?.message,
          errorCode: adminError?.code 
        });
      }
    }

    if (adminError && adminError.code !== 'PGRST116') {
      console.error('[auth/login] Database error:', adminError);
      return NextResponse.json(
        { error: `Database error: ${adminError.message}` },
        { status: 500 }
      );
    }

    if (!adminUser) {
      console.log('[auth/login] No admin user found for username/email:', username);
      return NextResponse.json(
        { error: 'Invalid username/email or password' },
        { status: 401 }
      );
    }

    // Verify password
    if (!adminUser.password_hash) {
      return NextResponse.json(
        { error: 'Password not set for this user. Please contact administrator.' },
        { status: 401 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, adminUser.password_hash);
    console.log('[auth/login] Password match:', passwordMatch);
    
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid username/email or password' },
        { status: 401 }
      );
    }

    // Create session cookie
    const cookieStore = await cookies();
    cookieStore.set('admin_user_id', adminUser.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    console.log('[auth/login] Login successful, cookie set for user:', adminUser.id);

    return NextResponse.json({
      success: true,
      user: {
        id: adminUser.id,
        name: adminUser.name,
        role: adminUser.role,
        branch_id: adminUser.branch_id,
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
