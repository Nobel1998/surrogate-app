import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

type AppProfile = {
  id: string;
  name: string | null;
  email?: string | null;
  phone: string | null;
  role: string | null;
  created_at: string | null;
};

type SurrogateApplication = {
  user_id: string | null;
};

type ParentApplication = {
  user_id: string | null;
};

export async function GET() {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const profilesWithEmailRes = await supabase
      .from('profiles')
      .select('id, name, email, phone, role, created_at')
      .order('created_at', { ascending: false });

    let profilesData: AppProfile[] = [];
    if (!profilesWithEmailRes.error) {
      profilesData = (profilesWithEmailRes.data || []) as AppProfile[];
    } else {
      const message = String(profilesWithEmailRes.error.message || '').toLowerCase();
      const missingEmailColumn =
        message.includes('email') && (message.includes('does not exist') || message.includes('column'));

      if (!missingEmailColumn) {
        throw profilesWithEmailRes.error;
      }

      // Fallback for environments where profiles.email doesn't exist
      const profilesWithoutEmailRes = await supabase
        .from('profiles')
        .select('id, name, phone, role, created_at')
        .order('created_at', { ascending: false });

      if (profilesWithoutEmailRes.error) throw profilesWithoutEmailRes.error;
      profilesData = ((profilesWithoutEmailRes.data || []) as AppProfile[]).map((profile) => ({
        ...profile,
        email: null,
      }));
    }

    const [surrogateAppsRes, parentAppsRes] = await Promise.all([
      supabase.from('applications').select('user_id'),
      supabase.from('intended_parent_applications').select('user_id'),
    ]);

    const surrogateApplicantIds = new Set(
      ((surrogateAppsRes.error ? [] : surrogateAppsRes.data || []) as SurrogateApplication[])
        .map((row) => row.user_id)
        .filter((id): id is string => !!id)
    );
    const parentApplicantIds = new Set(
      ((parentAppsRes.error ? [] : parentAppsRes.data || []) as ParentApplication[])
        .map((row) => row.user_id)
        .filter((id): id is string => !!id)
    );

    const warnings: string[] = [];
    if (surrogateAppsRes.error) {
      warnings.push(`applications lookup failed: ${surrogateAppsRes.error.message}`);
    }
    if (parentAppsRes.error) {
      warnings.push(`intended_parent_applications lookup failed: ${parentAppsRes.error.message}`);
    }

    const users = profilesData.map((profile) => {
      const hasSurrogateApplication = surrogateApplicantIds.has(profile.id);
      const hasParentApplication = parentApplicantIds.has(profile.id);

      return {
        ...profile,
        email: profile.email || null,
        hasSurrogateApplication,
        hasParentApplication,
        hasAnyApplication: hasSurrogateApplication || hasParentApplication,
        registrationSource:
          hasSurrogateApplication || hasParentApplication ? 'Sign Up + Application' : 'Sign Up Only',
      };
    });

    return NextResponse.json({ users, warnings });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: unknown }).message || 'Failed to load profiles')
        : `Failed to load profiles: ${String(error)}`;
    console.error('[profiles] GET error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
