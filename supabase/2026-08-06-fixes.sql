-- ============================================================
-- Fixes 2026-08-06
--   1. rate_limits table + consume_rate_limit RPC (used by src/lib/rate-limit.ts).
--      The table already existed in production (key/window_start/count); this
--      migration redefines the function with row-locking to fix a
--      read-then-write race that could bypass the limit under concurrency.
--   2. validate_coupon RPC (used by /api/coupons/validate).
--   3. create_order: enforce that the chosen shipping zone belongs to the
--      chosen country (prevents shipping-price manipulation).
-- ============================================================

-- ---------- 1. Rate limiting ----------
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  count int NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_key text,
  p_window int,
  p_max int
)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.rate_limits%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.rate_limits WHERE key = p_key FOR UPDATE;

  IF NOT FOUND OR v_row.window_start < now() - make_interval(secs => p_window) THEN
    INSERT INTO public.rate_limits (key, window_start, count)
    VALUES (p_key, now(), 1)
    ON CONFLICT (key) DO UPDATE
      SET window_start = now(), count = 1;
    RETURN 1;
  END IF;

  v_row.count := v_row.count + 1;
  UPDATE public.rate_limits SET count = v_row.count WHERE key = p_key;
  RETURN v_row.count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, int, int) TO anon, authenticated;

-- ---------- 2. Coupon validation ----------
CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_code text,
  p_subtotal numeric
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon public.coupons%ROWTYPE;
  v_discount numeric := 0;
BEGIN
  IF p_code IS NULL OR p_subtotal IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'missing_code');
  END IF;

  SELECT * INTO v_coupon FROM public.coupons WHERE code = upper(btrim(p_code));
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  IF NOT v_coupon.active THEN
    RETURN jsonb_build_object('success', false, 'error', 'inactive');
  END IF;

  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'expired');
  END IF;

  IF v_coupon.max_uses > 0 AND v_coupon.used_count >= v_coupon.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'limit');
  END IF;

  IF p_subtotal < COALESCE(v_coupon.min_order, 0) THEN
    RETURN jsonb_build_object('success', false, 'error', 'min_order', 'min_order', COALESCE(v_coupon.min_order, 0));
  END IF;

  IF v_coupon.discount_type = 'percentage' THEN
    v_discount := (p_subtotal * v_coupon.discount_value) / 100;
  ELSE
    v_discount := v_coupon.discount_value;
  END IF;
  IF v_discount > p_subtotal THEN
    v_discount := p_subtotal;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'code', v_coupon.code,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value,
    'min_order', COALESCE(v_coupon.min_order, 0),
    'discount_amount', v_discount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_coupon(text, numeric) TO anon, authenticated;

-- ---------- 3. create_order: zone must belong to the country ----------
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
     WHERE id = p_zone_id AND active AND country_id = p_country_id;
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
