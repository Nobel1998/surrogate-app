import type { SupabaseClient } from '@supabase/supabase-js';

type ApplicationReviewStatus = 'approved' | 'rejected' | 'pending';

const COPY: Record<
  ApplicationReviewStatus,
  { title: string; message: string }
> = {
  approved: {
    title: 'Application Approved',
    message: 'Your application was approved. Matching can begin.',
  },
  rejected: {
    title: 'Application Rejected',
    message: 'Your application was rejected. Open the app for details.',
  },
  pending: {
    title: 'Application Pending',
    message: 'Your application is pending review again.',
  },
};

/**
 * Insert a lightweight in-app notification the mobile app can poll / subscribe to.
 * Failures are logged but do not throw — status updates should still succeed.
 */
export async function notifyApplicationStatusChange(
  supabase: SupabaseClient,
  params: {
    userId: string | null | undefined;
    status: ApplicationReviewStatus;
    applicationId: string | number;
    applicationType?: 'surrogate' | 'intended_parent';
  }
): Promise<void> {
  const { userId, status, applicationId, applicationType = 'surrogate' } = params;
  if (!userId) {
    console.warn('[appNotifications] skip: missing userId');
    return;
  }

  const copy = COPY[status] || COPY.pending;

  try {
    const { error } = await supabase.from('app_notifications').insert({
      user_id: userId,
      type: 'status_update',
      title: copy.title,
      message: copy.message,
      data: {
        status,
        applicationId,
        applicationType,
        screen: 'ViewApplication',
      },
      read: false,
    });

    if (error) {
      console.error('[appNotifications] insert failed:', error);
    }
  } catch (err) {
    console.error('[appNotifications] unexpected error:', err);
  }
}
