import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

// PATCH: Update available status for a profile
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;
    const body = await req.json();
    const { available } = body;

    if (typeof available !== 'boolean') {
      return NextResponse.json(
        { error: 'available must be a boolean' },
        { status: 400 }
      );
    }

    // Verify admin authentication
    const cookieStore = await cookies();
    const adminUserId = cookieStore.get('admin_user_id')?.value;
    
    if (!adminUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify the profile exists and is a surrogate
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    if (profile.role?.toLowerCase() !== 'surrogate') {
      return NextResponse.json(
        { error: 'Only surrogates can have available status updated' },
        { status: 400 }
      );
    }

    // Update the available status
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ available })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true, available });
  } catch (error: any) {
    console.error('Error updating available status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update available status' },
      { status: 500 }
    );
  }
}

