import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAdminSession } from '@/lib/adminSession';
import { deleteAppUser } from '@/lib/deleteAppUser';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/** Admin-only: permanently delete an app user (profile + auth + related rows). */
export async function DELETE(_req: NextRequest, context: RouteContext) {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 });
  }

  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'Only administrators can delete users.' }, { status: 403 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, name')
      .eq('id', id)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) {
      // Still try auth delete in case profile is already gone
      const { error: authOnlyError } = await supabase.auth.admin.deleteUser(id);
      if (authOnlyError) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, warnings: ['profile already missing'] });
    }

    const result = await deleteAppUser(supabase, id);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || 'Failed to delete user', warnings: result.warnings },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedId: id,
      name: profile.name,
      warnings: result.warnings,
    });
  } catch (error: any) {
    console.error('[profiles/:id] DELETE error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete user' },
      { status: 500 }
    );
  }
}
