import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const cookieStore = await cookies();
    const adminUserId = cookieStore.get('admin_user_id')?.value;
    if (!adminUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id, role')
      .eq('id', adminUserId)
      .single();

    if (adminError || !adminUser || (adminUser.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden. Only admins can access signup details.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const [{ data: profile, error: profileError }, authUserRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, name, email, phone, role, created_at')
        .eq('id', id)
        .maybeSingle(),
      supabase.auth.admin.getUserById(id),
    ]);

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message || 'Failed to load profile' },
        { status: 500 }
      );
    }

    if (authUserRes.error) {
      return NextResponse.json(
        { error: authUserRes.error.message || 'Failed to load signup metadata' },
        { status: 500 }
      );
    }

    const metadata = (authUserRes.data.user?.user_metadata || {}) as Record<string, any>;

    return NextResponse.json({
      profile: profile || null,
      signupMetadata: {
        name: metadata.name ?? null,
        phone: metadata.phone ?? null,
        role: metadata.role ?? null,
        date_of_birth: metadata.date_of_birth ?? null,
        race: metadata.race ?? null,
        location: metadata.location ?? null,
        referral_code: metadata.referral_code ?? null,
      },
    });
  } catch (error: any) {
    console.error('[profiles/signup-detail] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load signup detail' },
      { status: 500 }
    );
  }
}

