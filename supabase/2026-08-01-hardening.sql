-- ============================================================
-- Security hardening 2026-08-01
-- 1) profiles: guard is_main_admin against self-assignment +
--    add WITH CHECK to the self-update policy
-- 2) orders: admins get SELECT/UPDATE only (INSERT/DELETE go
--    through the create_order / admin RPC paths)
-- 3) reviews: enforce rating 1..5 and comment length at DB level
-- ============================================================

-- ============ 1) PROFILES ============
CREATE OR REPLACE FUNCTION public.prevent_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (
    (NEW.role IS DISTINCT FROM OLD.role
      OR NEW.blocked IS DISTINCT FROM OLD.blocked
      OR NEW.is_main_admin IS DISTINCT FROM OLD.is_main_admin)
    AND NOT public.is_admin()
  ) THEN
    RAISE EXCEPTION 'Not allowed to change role, blocked status, or main admin flag';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_privilege_escalation ON public.profiles;
CREATE TRIGGER prevent_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_privilege_escalation();

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============ 2) ORDERS ============
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders" ON public.orders
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;
CREATE POLICY "Admins can update all orders" ON public.orders
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

-- ============ 3) REVIEWS ============
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_rating_check;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_rating_check
  CHECK (rating BETWEEN 1 AND 5);

ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_comment_length;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_comment_length
  CHECK (comment IS NULL OR char_length(comment) <= 1000);
