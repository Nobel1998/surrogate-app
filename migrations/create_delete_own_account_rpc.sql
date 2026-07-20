-- In-app account deletion without Edge Function deploy.
-- Run in Supabase SQL Editor, then the app can call: supabase.rpc('delete_own_account')

CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, storage
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Soft-null non-cascade FKs
  BEGIN
    UPDATE public.events SET created_by = NULL WHERE created_by = uid;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;

  BEGIN
    UPDATE public.reward_requests SET processed_by = NULL WHERE processed_by = uid;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;

  -- Delete user-owned rows (ignore missing tables)
  BEGIN DELETE FROM public.points_rewards WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.reward_requests WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.applications WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.intended_parent_applications WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.medical_reports WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.surrogate_medical_info WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.ob_appointments WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.ivf_appointments WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.psychological_evaluations WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.surrogate_insurance WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.online_claim_submissions WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.monthly_assessments WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.support_tickets WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.event_registrations WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.event_likes WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.post_likes WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.comment_likes WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.comments WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.posts WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.documents WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN
    DELETE FROM public.referral_submissions WHERE referrer_user_id = uid;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;
  BEGIN
    DELETE FROM public.surrogate_matches
    WHERE surrogate_id = uid OR parent_id = uid
       OR first_parent_id = uid OR second_parent_id = uid;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;

  BEGIN
    DELETE FROM storage.objects WHERE owner = uid;
  EXCEPTION WHEN undefined_table OR insufficient_privilege THEN NULL;
  END;

  BEGIN
    DELETE FROM public.profiles WHERE id = uid;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  DELETE FROM auth.users WHERE id = uid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found in auth.users');
  END IF;

  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'sqlstate', SQLSTATE
    );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO service_role;

COMMENT ON FUNCTION public.delete_own_account() IS
  'Deletes the calling user (auth.uid) and related public/storage rows. Used by in-app Delete Account.';
