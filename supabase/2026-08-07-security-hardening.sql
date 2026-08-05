-- ============================================================
-- Security hardening 2026-08-07
--   1. rate_limits: enable RLS + revoke direct table access so
--      the table is ONLY reachable through the SECURITY DEFINER
--      consume_rate_limit() RPC (prevents rate-limit bypass by
--      deleting/resetting counters).
--   2. reviews: enforce owner writes + immutable product_id on
--      UPDATE (prevents relocating a review to another product).
--   3. profiles / orders: max lengths on customer-supplied text
--      to avoid DB bloat and abuse.
--
-- NOTE: NEW/OLD references in policy WITH CHECK clauses are rejected
-- by the Supabase Management SQL API, so product_id immutability is
-- enforced with a BEFORE UPDATE trigger instead.
-- ============================================================

-- ---------- 1. rate_limits ----------
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.rate_limits FROM anon, authenticated, public;

-- The SECURITY DEFINER function runs as the table owner, so it still
-- works after the revokes above; no RLS policy is added on purpose.

-- ---------- 2. reviews ----------
DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;
CREATE POLICY "Users can update own reviews" ON public.reviews
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.prevent_review_relocation()
RETURNS trigger AS $$
BEGIN
  IF NEW.product_id IS DISTINCT FROM OLD.product_id THEN
    RAISE EXCEPTION 'product_id cannot be changed after creation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS prevent_review_relocation ON public.reviews;

CREATE TRIGGER prevent_review_relocation BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.prevent_review_relocation();

-- ---------- 3. profiles / orders length limits ----------
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_full_name_len;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_full_name_len
  CHECK (full_name IS NULL OR char_length(full_name) <= 80);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_phone_len;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_phone_len
  CHECK (phone IS NULL OR char_length(phone) <= 30);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_address_len;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_address_len
  CHECK (address IS NULL OR char_length(address) <= 500);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_city_len;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_city_len
  CHECK (city IS NULL OR char_length(city) <= 120);

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_full_name_len;
ALTER TABLE public.orders ADD CONSTRAINT orders_full_name_len
  CHECK (char_length(full_name) <= 80);

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_phone_len;
ALTER TABLE public.orders ADD CONSTRAINT orders_phone_len
  CHECK (char_length(phone) <= 30);

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_address_len;
ALTER TABLE public.orders ADD CONSTRAINT orders_address_len
  CHECK (char_length(address) <= 500);

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_city_len;
ALTER TABLE public.orders ADD CONSTRAINT orders_city_len
  CHECK (char_length(city) <= 120);

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_notes_len;
ALTER TABLE public.orders ADD CONSTRAINT orders_notes_len
  CHECK (notes IS NULL OR char_length(notes) <= 2000);
