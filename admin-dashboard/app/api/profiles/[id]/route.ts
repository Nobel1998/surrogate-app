import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAdminSession } from '@/lib/adminSession';
import { deleteAppUser } from '@/lib/deleteAppUser';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/** Admin-only: permanently delete an app user (profile + auth + related rows).
 *  Supports ?email= for orphaned auth users whose profile was already removed.
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
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

  const { id: idParam } = await context.params;
  const emailParam = new URL(req.url).searchParams.get('email')?.trim().toLowerCase() || null;
  let id = idParam === 'by-email' ? '' : idParam;

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    if ((!id || id === 'pending') && emailParam) {
      const { data: listed, error: listError } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      if (listError) throw listError;
      const found = (listed?.users || []).find(
        (u) => (u.email || '').toLowerCase() === emailParam
      );
      if (!found) {
        return NextResponse.json({ error: 'Auth user not found for email' }, { status: 404 });
      }
      id = found.id;
    }

    if (!id) {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, name')
      .eq('id', id)
      .maybeSingle();

    if (profileError) throw profileError;

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
      name: profile?.name || null,
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
