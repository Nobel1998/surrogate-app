import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

type AppProfile = {
  id: string;
  name: string | null;
  phone: string | null;
  role: string | null;
  created_at: string | null;
  updated_at: string | null;
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
    const [profilesRes, surrogateAppsRes, parentAppsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, name, phone, role, created_at, updated_at')
        .order('created_at', { ascending: false }),
      supabase.from('applications').select('user_id'),
      supabase.from('intended_parent_applications').select('user_id'),
    ]);

    if (profilesRes.error) throw profilesRes.error;
    if (surrogateAppsRes.error) throw surrogateAppsRes.error;
    if (parentAppsRes.error) throw parentAppsRes.error;

    const surrogateApplicantIds = new Set(
      ((surrogateAppsRes.data || []) as SurrogateApplication[])
        .map((row) => row.user_id)
        .filter((id): id is string => !!id)
    );
    const parentApplicantIds = new Set(
      ((parentAppsRes.data || []) as ParentApplication[])
        .map((row) => row.user_id)
        .filter((id): id is string => !!id)
    );

    const users = ((profilesRes.data || []) as AppProfile[]).map((profile) => {
      const hasSurrogateApplication = surrogateApplicantIds.has(profile.id);
      const hasParentApplication = parentApplicantIds.has(profile.id);

      return {
        ...profile,
        email: null,
        hasSurrogateApplication,
        hasParentApplication,
        hasAnyApplication: hasSurrogateApplication || hasParentApplication,
        registrationSource:
          hasSurrogateApplication || hasParentApplication ? 'Sign Up + Application' : 'Sign Up Only',
      };
    });

    return NextResponse.json({ users });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load profiles';
    console.error('[profiles] GET error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
