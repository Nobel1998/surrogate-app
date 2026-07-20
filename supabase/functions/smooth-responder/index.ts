/**
 * Deploy (requires Supabase CLI + login):
 *   npm run supabase:deploy-delete-account
 * App calls slug DELETE_ACCOUNT_EDGE_FN_SLUG (smooth-responder) — deploy that folder too if used in production.
 * Dashboard: if calls fail with 401, turn OFF "Verify JWT with legacy secret".
 */
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Clear rows / FKs that block auth.users delete (service role). */
async function cleanupUserData(admin: SupabaseClient, userId: string): Promise<string[]> {
  const warnings: string[] = [];

  const softNull: Array<{ table: string; column: string }> = [
    { table: 'events', column: 'created_by' },
    { table: 'reward_requests', column: 'processed_by' },
  ];

  for (const { table, column } of softNull) {
    const { error } = await admin.from(table).update({ [column]: null }).eq(column, userId);
    if (error) warnings.push(`${table}.${column}: ${error.message}`);
  }

  // Delete user-owned rows before auth.admin.deleteUser so CASCADE triggers
  // do not run as supabase_auth_admin (which lacks rights on public tables).
  const deleteByUserId = [
    'points_rewards',
    'reward_requests',
    'applications',
    'intended_parent_applications',
    'medical_reports',
    'surrogate_medical_info',
    'ob_appointments',
    'ivf_appointments',
    'psychological_evaluations',
    'surrogate_insurance',
    'online_claim_submissions',
    'monthly_assessments',
    'support_tickets',
    'event_registrations',
    'event_likes',
    'post_likes',
    'comment_likes',
    'comments',
    'posts',
  ];

  for (const table of deleteByUserId) {
    const { error } = await admin.from(table).delete().eq('user_id', userId);
    if (error) warnings.push(`${table}: ${error.message}`);
  }

  // Matches may reference profile id as surrogate/parent
  for (const col of ['surrogate_id', 'parent_id', 'first_parent_id', 'second_parent_id']) {
    const { error } = await admin.from('surrogate_matches').delete().eq(col, userId);
    if (error) warnings.push(`surrogate_matches.${col}: ${error.message}`);
  }

  const { error: profileError } = await admin.from('profiles').delete().eq('id', userId);
  if (profileError) warnings.push(`profiles: ${profileError.message}`);

  return warnings;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !/^Bearer\s+\S+/i.test(authHeader)) {
      return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseAnonKey || !serviceRoleKey) {
      console.error('[delete-account] Missing SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY');
      return new Response(JSON.stringify({ error: 'Server misconfiguration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(jwt);

    if (userError || !user) {
      console.error('[delete-account] getUser failed:', userError?.message ?? 'no user');
      return new Response(
        JSON.stringify({
          error: userError?.message || 'Unauthorized',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const cleanupWarnings = await cleanupUserData(adminClient, user.id);
    if (cleanupWarnings.length) {
      console.warn('[delete-account] cleanup warnings:', cleanupWarnings);
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('[delete-account]', deleteError, { cleanupWarnings });
      return new Response(
        JSON.stringify({
          error: deleteError.message,
          code: (deleteError as { code?: string }).code ?? null,
          cleanupWarnings,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify({ success: true, cleanupWarnings }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal error';
    console.error('[delete-account]', e);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
