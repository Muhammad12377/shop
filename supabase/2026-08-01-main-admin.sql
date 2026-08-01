-- ============================================================
-- Main admin protection migration 2026-08-01
-- 1) add profiles.is_main_admin flag
-- 2) mark the owner as main admin
-- 3) harden admin_set_profile_privileges: no one can demote or
--    block the main admin (not even another admin)
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_main_admin boolean NOT NULL DEFAULT false;

UPDATE public.profiles
   SET is_main_admin = true
 WHERE id = 'affdaa06-a732-4255-86d1-d629f50a0279';

CREATE OR REPLACE FUNCTION public.admin_set_profile_privileges(target_user uuid, new_role text, new_blocked boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_main boolean;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF target_user IS NULL THEN
    RAISE EXCEPTION 'target_user is required';
  END IF;
  IF target_user = auth.uid() AND (new_role IS DISTINCT FROM 'admin' OR new_blocked) THEN
    RAISE EXCEPTION 'Cannot demote or block yourself';
  END IF;
  SELECT is_main_admin INTO v_target_main FROM public.profiles WHERE id = target_user;
  IF v_target_main AND (new_role IS DISTINCT FROM 'admin' OR new_blocked) THEN
    RAISE EXCEPTION 'Cannot demote or block the main admin';
  END IF;
  UPDATE public.profiles
     SET role = COALESCE(new_role, role),
         blocked = COALESCE(new_blocked, blocked),
         updated_at = now()
   WHERE id = target_user;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$$;
