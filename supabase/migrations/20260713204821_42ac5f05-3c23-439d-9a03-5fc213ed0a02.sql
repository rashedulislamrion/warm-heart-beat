-- 1. Add pickup location to restaurants
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS location text NOT NULL DEFAULT 'Gate-1';

-- 2. Refund helper: restores credits + releases promo redemption for a cancelled order.
--    Callable by admin OR the restaurant owner (for food orders they own) OR the order's customer.
--    Idempotent: safe to call multiple times; only refunds credits that haven't been refunded yet.
CREATE OR REPLACE FUNCTION public.refund_order(_order_type text, _order_id uuid)
RETURNS TABLE(credits_refunded integer, promo_released boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_status text;
  v_credits int := 0;
  v_promo_released boolean := false;
  v_already_refunded int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _order_type NOT IN ('food','parcel') THEN RAISE EXCEPTION 'invalid_order_type'; END IF;

  -- Load order + authorize
  IF _order_type = 'food' THEN
    SELECT fo.user_id, fo.status::text INTO v_user, v_status
      FROM public.food_orders fo WHERE fo.id = _order_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;
    IF NOT (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (SELECT 1 FROM public.restaurants r
                 JOIN public.food_orders fo2 ON fo2.restaurant_id = r.id
                 WHERE fo2.id = _order_id AND r.owner_id = auth.uid())
      OR v_user = auth.uid()
    ) THEN RAISE EXCEPTION 'forbidden'; END IF;
  ELSE
    SELECT p.user_id, p.status::text INTO v_user, v_status
      FROM public.parcels p WHERE p.id = _order_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;
    IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR v_user = auth.uid()) THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
  END IF;

  IF v_status <> 'cancelled' THEN RAISE EXCEPTION 'order_not_cancelled'; END IF;

  -- Refund redeemed credits (idempotent: skip if a matching positive refund already exists)
  SELECT COALESCE(SUM(-amount)::int, 0) INTO v_credits
    FROM public.user_credits
    WHERE user_id = v_user AND order_id = _order_id
      AND reason IN ('redeemed_food','redeemed_parcel');

  SELECT COALESCE(SUM(amount)::int, 0) INTO v_already_refunded
    FROM public.user_credits
    WHERE user_id = v_user AND order_id = _order_id AND reason = 'refund_cancel';

  v_credits := v_credits - v_already_refunded;
  IF v_credits > 0 THEN
    INSERT INTO public.user_credits (user_id, amount, reason, order_id)
      VALUES (v_user, v_credits, 'refund_cancel', _order_id);
  ELSE
    v_credits := 0;
  END IF;

  -- Release promo redemption so the code becomes reusable
  DELETE FROM public.promo_redemptions
    WHERE order_type = _order_type AND order_id = _order_id;
  GET DIAGNOSTICS v_already_refunded = ROW_COUNT;
  v_promo_released := v_already_refunded > 0;

  RETURN QUERY SELECT v_credits, v_promo_released;
END;
$$;

-- 3. Release a claimed order back to the pool (rider can un-claim before picking up)
CREATE OR REPLACE FUNCTION public.release_order(_order_type text, _order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _order_type = 'food' THEN
    UPDATE public.food_orders
      SET rider_id = NULL
      WHERE id = _order_id AND rider_id = auth.uid()
        AND status IN ('confirmed','preparing');
    IF NOT FOUND THEN RAISE EXCEPTION 'cannot_release'; END IF;
  ELSIF _order_type = 'parcel' THEN
    UPDATE public.parcels
      SET rider_id = NULL, status = 'pending'
      WHERE id = _order_id AND rider_id = auth.uid()
        AND status = 'rider_assigned';
    IF NOT FOUND THEN RAISE EXCEPTION 'cannot_release'; END IF;
  ELSE
    RAISE EXCEPTION 'invalid_order_type';
  END IF;
END;
$$;