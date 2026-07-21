import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAdminSession, canListAllApplicationsOrProfiles } from '@/lib/adminSession';
import { notifyApplicationStatusChange } from '@/lib/appNotifications';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

/**
 * POST: write a lightweight in-app notification after application approve/reject.
 * Body: { userId, status, applicationId, applicationType? }
 */
export async function POST(req: NextRequest) {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 });
  }

  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }
  if (!canListAllApplicationsOrProfiles(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { userId, status, applicationId, applicationType } = body || {};

    if (!userId || !status || applicationId == null) {
      return NextResponse.json(
        { error: 'userId, status, and applicationId are required' },
        { status: 400 }
      );
    }

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    await notifyApplicationStatusChange(supabase, {
      userId,
      status,
      applicationId,
      applicationType: applicationType === 'intended_parent' ? 'intended_parent' : 'surrogate',
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[notifications/application-status] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create notification' },
      { status: 500 }
    );
  }
}
