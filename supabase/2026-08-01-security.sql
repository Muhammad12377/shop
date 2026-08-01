-- ============================================================
-- Security + bug-fix migration 2026-08-01
-- 1) profiles: block privilege escalation (role/blocked)
-- 2) orders: RPC-based creation + cancellation, drop direct INSERT
-- 3) order_status_history: RPC-managed (no client inserts)
-- 4) reviews: delivered-only trigger at DB level
-- 5) cart_items table + RLS
-- 6) wishlist: rename to match client, single table
-- 7) orders_status_check: allow 'fake'
-- ============================================================

-- ============ 1) PROFILES : privilege escalation guard ============
CREATE OR REPLACE FUNCTION public.prevent_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (
    (NEW.role IS DISTINCT FROM OLD.role OR NEW.blocked IS DISTINCT FROM OLD.blocked)
    AND NOT public.is_admin()
  ) THEN
    RAISE EXCEPTION 'Not allowed to change role or blocked status';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_privilege_escalation ON public.profiles;
CREATE TRIGGER prevent_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_privilege_escalation();

-- Admin-only helper to change role/blocked (bypasses RLS, safe)
CREATE OR REPLACE FUNCTION public.admin_set_profile_privileges(target_user uuid, new_role text, new_blocked boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
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

-- ============ 2) ORDERS : secure creation + cancellation ============
CREATE OR REPLACE FUNCTION public.create_order(
  p_full_name text,
  p_phone text,
  p_address text,
  p_city text,
  p_items jsonb,
  p_coupon_code text DEFAULT NULL,
  p_country_id uuid DEFAULT NULL,
  p_zone_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS public.orders
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_blocked boolean;
  v_setting public.settings%ROWTYPE;
  v_product public.products%ROWTYPE;
  v_item jsonb;
  v_pid uuid;
  v_size text;
  v_color text;
  v_qty int;
  v_available int;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_fee numeric := 0;
  v_free_min numeric := 0;
  v_country_price numeric := NULL;
  v_zone_price numeric := NULL;
  v_country_name text := NULL;
  v_zone_name text := NULL;
  v_coupon public.coupons%ROWTYPE;
  v_coupon_code text := NULL;
  v_items jsonb := '[]'::jsonb;
  v_order public.orders;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Missing required fields: items';
  END IF;
  IF p_full_name IS NULL OR btrim(p_full_name) = '' THEN
    RAISE EXCEPTION 'Missing required fields: full_name';
  END IF;
  IF p_phone IS NULL OR btrim(p_phone) = '' THEN
    RAISE EXCEPTION 'Missing required fields: phone';
  END IF;
  IF p_address IS NULL OR btrim(p_address) = '' THEN
    RAISE EXCEPTION 'Missing required fields: address';
  END IF;
  IF p_city IS NULL OR btrim(p_city) = '' THEN
    RAISE EXCEPTION 'Missing required fields: city';
  END IF;

  SELECT blocked INTO v_blocked FROM public.profiles WHERE id = v_user;
  IF v_blocked THEN
    RAISE EXCEPTION 'Your account is blocked';
  END IF;

  SELECT * INTO v_setting FROM public.settings WHERE key = 'shipping_fee';
  v_fee := COALESCE((v_setting.value #>> '{}')::numeric, 0);
  SELECT * INTO v_setting FROM public.settings WHERE key = 'free_shipping_min';
  v_free_min := COALESCE((v_setting.value #>> '{}')::numeric, 0);

  IF p_country_id IS NOT NULL THEN
    SELECT price, name_en INTO v_country_price, v_country_name
      FROM public.shipping_countries
     WHERE id = p_country_id AND active;
  END IF;
  IF p_zone_id IS NOT NULL THEN
    SELECT price, name_en INTO v_zone_price, v_zone_name
      FROM public.shipping_zones
     WHERE id = p_zone_id AND active;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_pid := (v_item->>'product_id')::uuid;
    v_size := v_item->>'size';
    v_color := v_item->>'color';
    v_qty := COALESCE((v_item->>'quantity')::int, 0);
    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity';
    END IF;

    SELECT * INTO v_product FROM public.products WHERE id = v_pid AND active;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'A product in your cart is no longer available';
    END IF;

    v_available := COALESCE((v_product.size_stock->>v_size)::int, v_product.stock);
    IF v_qty > v_available THEN
      RAISE EXCEPTION 'Only % in stock for "%" size %', v_available, COALESCE(v_product.name_en, ''), COALESCE(v_size, '-');
    END IF;

    v_subtotal := v_subtotal + (COALESCE(v_product.price, 0) * v_qty);
    v_items := v_items || jsonb_build_object(
      'product_id', v_pid,
      'product_name', COALESCE(v_product.name_en, ''),
      'price', COALESCE(v_product.price, 0),
      'quantity', v_qty,
      'size', v_size,
      'color', v_color,
      'image', v_product.images[1]
    );
  END LOOP;

  IF p_coupon_code IS NOT NULL AND btrim(p_coupon_code) <> '' THEN
    SELECT * INTO v_coupon FROM public.coupons WHERE code = upper(btrim(p_coupon_code));
    IF FOUND AND v_coupon.active
       AND (v_coupon.expires_at IS NULL OR v_coupon.expires_at > now())
       AND (v_coupon.max_uses = 0 OR v_coupon.used_count < v_coupon.max_uses)
       AND v_subtotal >= v_coupon.min_order THEN
      IF v_coupon.discount_type = 'percentage' THEN
        v_discount := (v_subtotal * v_coupon.discount_value) / 100;
      ELSE
        v_discount := v_coupon.discount_value;
      END IF;
      IF v_discount > v_subtotal THEN
        v_discount := v_subtotal;
      END IF;
      v_coupon_code := v_coupon.code;
      UPDATE public.coupons SET used_count = used_count + 1 WHERE id = v_coupon.id;
    END IF;
  END IF;

  IF v_zone_price IS NOT NULL THEN
    v_fee := v_zone_price;
  ELSIF v_country_price IS NOT NULL THEN
    v_fee := v_country_price;
  END IF;
  IF v_subtotal >= v_free_min THEN
    v_fee := 0;
  END IF;

  INSERT INTO public.orders (
    user_id, status, subtotal, shipping_fee, discount, coupon_code, total,
    full_name, phone, address, city, shipping_country, shipping_zone,
    country_id, zone_id, notes, items
  ) VALUES (
    v_user, 'pending', v_subtotal, v_fee, v_discount, v_coupon_code,
    GREATEST(0, v_subtotal - v_discount) + v_fee,
    p_full_name, p_phone, p_address, p_city, v_country_name, v_zone_name,
    p_country_id, p_zone_id, p_notes, v_items
  )
  RETURNING * INTO v_order;

  INSERT INTO public.order_status_history (order_id, status, note, created_by)
  VALUES (v_order.id, 'pending', NULL, v_user);

  DELETE FROM public.cart_items WHERE user_id = v_user;

  RETURN v_order;
END;
$$;

-- Customer-safe cancellation (SECURITY DEFINER, ownership checked)
CREATE OR REPLACE FUNCTION public.cancel_order(p_order_id uuid, p_reason text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_order public.orders%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  IF v_order.user_id <> v_user THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF v_order.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending orders can be cancelled';
  END IF;

  UPDATE public.orders
     SET status = 'cancelled',
         cancelled_by = 'customer',
         cancel_reason = p_reason,
         updated_at = now()
   WHERE id = p_order_id;

  INSERT INTO public.order_status_history (order_id, status, note, created_by)
  VALUES (p_order_id, 'cancelled', COALESCE(p_reason, 'Cancelled by customer'), v_user);

  RETURN TRUE;
END;
$$;

-- Remove ability to insert orders directly (enforce RPC create_order)
DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;

-- ============ 4) REVIEWS : delivered-only at DB level ============
CREATE OR REPLACE FUNCTION public.check_review_eligibility()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_order public.orders%ROWTYPE;
  v_item jsonb;
  v_delivered boolean := false;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF NEW.user_id <> v_user THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  FOR v_order IN
    SELECT * FROM public.orders
     WHERE user_id = v_user AND status = 'delivered'
  LOOP
    IF v_order.items IS NOT NULL THEN
      FOR v_item IN SELECT * FROM jsonb_array_elements(v_order.items) LOOP
        IF v_item->>'product_id' = NEW.product_id::text THEN
          v_delivered := true;
          EXIT;
        END IF;
      END LOOP;
    END IF;
    IF v_delivered THEN
      EXIT;
    END IF;
  END LOOP;

  IF NOT v_delivered THEN
    RAISE EXCEPTION 'You can only review products that were delivered to you';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reviews_eligibility ON public.reviews;
CREATE TRIGGER reviews_eligibility
  BEFORE INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.check_review_eligibility();

-- ============ 5) CART_ITEMS : server-side cart ============
CREATE TABLE IF NOT EXISTS public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size text,
  color text,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, product_id, size, color)
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own cart" ON public.cart_items;
CREATE POLICY "Users manage own cart" ON public.cart_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ 6) WISHLIST : single table matching client ============
ALTER TABLE IF EXISTS public.wishlists RENAME TO wishlist;

-- Client API uses "wishlist_items"; pages/ProductView use "wishlist".
-- Keep both names backed by the SAME data via an auto-updatable view.
CREATE OR REPLACE VIEW public.wishlist_items
  WITH (security_invoker = on) AS
  SELECT id, user_id, product_id, created_at
    FROM public.wishlist;

-- ============ 7) ORDERS : allow 'fake' status ============
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending','confirmed','shipped','delivered','cancelled','fake'));
