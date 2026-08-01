-- ============================================================
-- Security/correctness fix 2026-08-02
-- Resolves the conflicting create_order definitions:
--   - 2026-08-01-security.sql increments coupons.used_count at
--     order creation (line 187)
--   - 2026-08-01-coupon-consume.sql defers coupon consumption to
--     status changes only, matching the admin status route
-- Whichever ran last decided the behaviour, risking double
-- consumption. This migration authoritatively re-applies the
-- deferred version so coupons are NEVER consumed at creation.
-- ============================================================

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

-- Guard against double-consumption from the legacy create_order:
-- reset used_count to the number of orders currently in a stocked
-- state, so the counter reflects reality regardless of how many
-- migrations ran before this one.
UPDATE public.coupons c
SET used_count = sub.stocked
FROM (
  SELECT coupon_code, COUNT(*) AS stocked
  FROM public.orders
  WHERE coupon_code IS NOT NULL
    AND status IN ('confirmed', 'shipped', 'delivered')
  GROUP BY coupon_code
) sub
WHERE c.code = sub.coupon_code;
