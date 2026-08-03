import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAdminSession, canListAllApplicationsOrProfiles } from '@/lib/adminSession';

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

  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }
  if (!canListAllApplicationsOrProfiles(session.role)) {
    return NextResponse.json(
      { error: 'Only admins and finance managers can access the Sign Up user list.' },
      { status: 403 }
    );
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

    // Some signups only persist name/phone in auth user_metadata (profile upsert may fail).
    // Enrich list display from auth so the table matches Sign Up Details.
    const needsAuthEnrichment = profilesData.some(
      (profile) => !profile.name || !profile.phone || !profile.email || !profile.role
    );
    const authMetaById = new Map<
      string,
      { name?: string | null; phone?: string | null; email?: string | null; role?: string | null }
    >();

    if (needsAuthEnrichment) {
      try {
        let page = 1;
        const perPage = 1000;
        while (page <= 20) {
          const { data: listed, error: listError } = await supabase.auth.admin.listUsers({
            page,
            perPage,
          });
          if (listError) {
            warnings.push(`auth users enrichment failed: ${listError.message}`);
            break;
          }
          const batch = listed?.users || [];
          for (const authUser of batch) {
            const meta = (authUser.user_metadata || {}) as Record<string, unknown>;
            authMetaById.set(authUser.id, {
              name: typeof meta.name === 'string' ? meta.name : null,
              phone: typeof meta.phone === 'string' ? meta.phone : null,
              email: authUser.email || (typeof meta.email === 'string' ? meta.email : null),
              role: typeof meta.role === 'string' ? meta.role : null,
            });
          }
          if (batch.length < perPage) break;
          page += 1;
        }
      } catch (enrichError: unknown) {
        const message =
          enrichError instanceof Error ? enrichError.message : 'auth users enrichment failed';
        warnings.push(message);
      }
    }

    const users = profilesData.map((profile) => {
      const hasSurrogateApplication = surrogateApplicantIds.has(profile.id);
      const hasParentApplication = parentApplicantIds.has(profile.id);
      const authMeta = authMetaById.get(profile.id);

      const name = profile.name || authMeta?.name || null;
      const phone = profile.phone || authMeta?.phone || null;
      const email = profile.email || authMeta?.email || null;
      const role = profile.role || authMeta?.role || null;

      // Best-effort backfill so Applications / future list loads stay consistent.
      if (authMeta && ((!profile.name && name) || (!profile.phone && phone))) {
        void supabase
          .from('profiles')
          .update({
            ...( !profile.name && name ? { name } : {}),
            ...( !profile.phone && phone ? { phone } : {}),
            ...( !profile.email && email ? { email } : {}),
            ...( !profile.role && role ? { role } : {}),
          })
          .eq('id', profile.id)
          .then(({ error }) => {
            if (error) {
              console.warn('[profiles] backfill name/phone failed:', profile.id, error.message);
            }
          });
      }

      return {
        ...profile,
        name,
        phone,
        email,
        role,
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
