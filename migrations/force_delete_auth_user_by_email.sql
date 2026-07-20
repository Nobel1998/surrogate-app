-- Diagnose + force-delete one auth user (run in Supabase SQL Editor)
-- 1) Set the email of the account you want to delete:
-- 2) Run the whole script

DO $$
DECLARE
  target_email text := 'REPLACE_WITH_YOUR_EMAIL@example.com'; -- <-- change this
  uid uuid;
  r record;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = lower(target_email);
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No auth.users row for email %', target_email;
  END IF;

  RAISE NOTICE 'Deleting user id=% email=%', uid, target_email;

  -- Show FKs pointing at auth.users (for debugging)
  FOR r IN
    SELECT
      c.conname,
      c.conrelid::regclass AS referencing_table,
      a.attname AS referencing_column,
      CASE c.confdeltype
        WHEN 'a' THEN 'NO ACTION'
        WHEN 'r' THEN 'RESTRICT'
        WHEN 'c' THEN 'CASCADE'
        WHEN 'n' THEN 'SET NULL'
        WHEN 'd' THEN 'SET DEFAULT'
      END AS on_delete
    FROM pg_constraint c
    JOIN pg_attribute a
      ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE c.contype = 'f'
      AND c.confrelid = 'auth.users'::regclass
    ORDER BY 2, 3
  LOOP
    RAISE NOTICE 'FK % on %.% ON DELETE %', r.conname, r.referencing_table, r.referencing_column, r.on_delete;
  END LOOP;

  -- Soft-null known non-cascade columns
  BEGIN UPDATE public.events SET created_by = NULL WHERE created_by = uid; EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL; END;
  BEGIN UPDATE public.reward_requests SET processed_by = NULL WHERE processed_by = uid; EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL; END;

  -- Delete common app data (ignore missing tables)
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
  BEGIN DELETE FROM public.referral_submissions WHERE referrer_user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL; END;

  BEGIN DELETE FROM public.surrogate_matches WHERE surrogate_id = uid OR parent_id = uid OR first_parent_id = uid OR second_parent_id = uid;
  EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL; END;

  BEGIN DELETE FROM public.profiles WHERE id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- Storage objects owned by this user (common blocker)
  BEGIN
    DELETE FROM storage.objects WHERE owner = uid;
  EXCEPTION WHEN undefined_table THEN NULL; WHEN insufficient_privilege THEN
    RAISE NOTICE 'Could not delete storage.objects (permission); delete files in Storage UI if needed';
  END;

  DELETE FROM auth.users WHERE id = uid;
  RAISE NOTICE 'Deleted auth.users %', uid;
END $$;
