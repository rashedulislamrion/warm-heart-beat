
-- ==========================
-- Promo codes
-- ==========================
CREATE TABLE public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('flat','percent')),
  discount_value int NOT NULL CHECK (discount_value > 0),
  max_discount int,
  min_order int NOT NULL DEFAULT 0,
  usage_limit int,
  per_user_limit int NOT NULL DEFAULT 1,
  applies_to text NOT NULL DEFAULT 'both' CHECK (applies_to IN ('food','parcel','both')),
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.promo_codes TO authenticated;
GRANT ALL ON public.promo_codes TO service_role;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read active promos" ON public.promo_codes FOR SELECT TO authenticated USING (is_active);
CREATE POLICY "admin manage promos" ON public.promo_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.promo_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  order_type text NOT NULL CHECK (order_type IN ('food','parcel')),
  order_id uuid NOT NULL,
  discount int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_type, order_id)
);
GRANT SELECT ON public.promo_redemptions TO authenticated;
GRANT ALL ON public.promo_redemptions TO service_role;
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own redemptions" ON public.promo_redemptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Validate a promo code and return the computed discount (does not consume)
CREATE OR REPLACE FUNCTION public.validate_promo(_code text, _order_type text, _subtotal int)
RETURNS TABLE (promo_id uuid, discount int, code text, message text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.promo_codes; used_count int; disc int;
BEGIN
  SELECT * INTO p FROM public.promo_codes WHERE upper(public.promo_codes.code) = upper(_code) AND is_active LIMIT 1;
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, 0, upper(_code), 'কোড পাওয়া যায়নি'::text; RETURN;
  END IF;
  IF p.expires_at IS NOT NULL AND p.expires_at < now() THEN
    RETURN QUERY SELECT NULL::uuid, 0, p.code, 'কোডের মেয়াদ শেষ'::text; RETURN;
  END IF;
  IF p.applies_to <> 'both' AND p.applies_to <> _order_type THEN
    RETURN QUERY SELECT NULL::uuid, 0, p.code, 'এই অর্ডারে প্রযোজ্য নয়'::text; RETURN;
  END IF;
  IF _subtotal < p.min_order THEN
    RETURN QUERY SELECT NULL::uuid, 0, p.code, ('সর্বনিম্ন অর্ডার ৳' || p.min_order)::text; RETURN;
  END IF;
  IF p.usage_limit IS NOT NULL THEN
    SELECT count(*) INTO used_count FROM public.promo_redemptions WHERE promo_code_id = p.id;
    IF used_count >= p.usage_limit THEN
      RETURN QUERY SELECT NULL::uuid, 0, p.code, 'কোডের ব্যবহার শেষ'::text; RETURN;
    END IF;
  END IF;
  SELECT count(*) INTO used_count FROM public.promo_redemptions
    WHERE promo_code_id = p.id AND user_id = auth.uid();
  IF used_count >= p.per_user_limit THEN
    RETURN QUERY SELECT NULL::uuid, 0, p.code, 'আপনি এই কোড ইতিমধ্যেই ব্যবহার করেছেন'::text; RETURN;
  END IF;
  IF p.discount_type = 'flat' THEN
    disc := p.discount_value;
  ELSE
    disc := (_subtotal * p.discount_value) / 100;
    IF p.max_discount IS NOT NULL AND disc > p.max_discount THEN disc := p.max_discount; END IF;
  END IF;
  IF disc > _subtotal THEN disc := _subtotal; END IF;
  RETURN QUERY SELECT p.id, disc, p.code, 'ok'::text;
END;
$$;
REVOKE ALL ON FUNCTION public.validate_promo(text, text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_promo(text, text, int) TO authenticated;

-- Redeem a promo code atomically after an order is created
CREATE OR REPLACE FUNCTION public.redeem_promo(
  _code text, _order_type text, _order_id uuid, _subtotal int
) RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_promo uuid; v_disc int; v_msg text;
BEGIN
  SELECT promo_id, discount, message INTO v_promo, v_disc, v_msg
    FROM public.validate_promo(_code, _order_type, _subtotal);
  IF v_promo IS NULL THEN
    RAISE EXCEPTION '%', v_msg;
  END IF;
  INSERT INTO public.promo_redemptions (user_id, promo_code_id, order_type, order_id, discount)
    VALUES (auth.uid(), v_promo, _order_type, _order_id, v_disc);
  RETURN v_disc;
END; $$;
REVOKE ALL ON FUNCTION public.redeem_promo(text, text, uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_promo(text, text, uuid, int) TO authenticated;

-- ==========================
-- Referral columns + code generator
-- ==========================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text,
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.gen_referral_code() RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c text; ex boolean;
BEGIN
  LOOP
    c := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = c) INTO ex;
    EXIT WHEN NOT ex;
  END LOOP;
  RETURN c;
END; $$;

UPDATE public.profiles SET referral_code = public.gen_referral_code() WHERE referral_code IS NULL;
ALTER TABLE public.profiles ALTER COLUMN referral_code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_key ON public.profiles(referral_code);

CREATE OR REPLACE FUNCTION public.set_referral_code_trg() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    NEW.referral_code := public.gen_referral_code();
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER profiles_set_referral_code BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_referral_code_trg();

-- Attach a referrer (called by client after signup). Guards against self-referral,
-- double-attach, and attaching after the user has already ordered.
CREATE OR REPLACE FUNCTION public.attach_referrer(_code text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); ref uuid; existing uuid; orders int;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT referred_by INTO existing FROM public.profiles WHERE id = me;
  IF existing IS NOT NULL THEN RETURN 'already_attached'; END IF;
  SELECT id INTO ref FROM public.profiles WHERE upper(referral_code) = upper(_code) LIMIT 1;
  IF ref IS NULL THEN RAISE EXCEPTION 'invalid_code'; END IF;
  IF ref = me THEN RAISE EXCEPTION 'self_referral_not_allowed'; END IF;
  SELECT (SELECT count(*) FROM public.parcels WHERE user_id = me)
       + (SELECT count(*) FROM public.food_orders WHERE user_id = me)
    INTO orders;
  IF orders > 0 THEN RAISE EXCEPTION 'already_ordered'; END IF;
  UPDATE public.profiles SET referred_by = ref WHERE id = me;
  RETURN 'ok';
END; $$;
REVOKE ALL ON FUNCTION public.attach_referrer(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.attach_referrer(text) TO authenticated;

-- ==========================
-- Credits ledger + spend
-- ==========================
CREATE TABLE public.user_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount int NOT NULL,
  reason text NOT NULL,
  order_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.user_credits(user_id, created_at DESC);
GRANT SELECT ON public.user_credits TO authenticated;
GRANT ALL ON public.user_credits TO service_role;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own credits" ON public.user_credits FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.my_credit_balance() RETURNS int
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(amount)::int, 0) FROM public.user_credits WHERE user_id = auth.uid()
$$;
REVOKE ALL ON FUNCTION public.my_credit_balance() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_credit_balance() TO authenticated;

CREATE OR REPLACE FUNCTION public.redeem_credits(_amount int, _order_type text, _order_id uuid)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bal int; use_amt int;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN RETURN 0; END IF;
  SELECT COALESCE(SUM(amount)::int, 0) INTO bal FROM public.user_credits WHERE user_id = auth.uid();
  use_amt := LEAST(_amount, GREATEST(bal, 0));
  IF use_amt <= 0 THEN RETURN 0; END IF;
  INSERT INTO public.user_credits (user_id, amount, reason, order_id)
    VALUES (auth.uid(), -use_amt, ('redeemed_' || _order_type), _order_id);
  RETURN use_amt;
END; $$;
REVOKE ALL ON FUNCTION public.redeem_credits(int, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_credits(int, text, uuid) TO authenticated;

-- Referral reward: on the referee's FIRST order (any table), credit both users ৳50
CREATE OR REPLACE FUNCTION public.grant_referral_credit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ref uuid; order_count int; already int;
BEGIN
  SELECT referred_by INTO ref FROM public.profiles WHERE id = NEW.user_id;
  IF ref IS NULL THEN RETURN NEW; END IF;
  SELECT (SELECT count(*) FROM public.parcels WHERE user_id = NEW.user_id AND id <> NEW.id)
       + (SELECT count(*) FROM public.food_orders WHERE user_id = NEW.user_id AND id <> NEW.id)
    INTO order_count;
  IF order_count > 0 THEN RETURN NEW; END IF;
  SELECT count(*) INTO already FROM public.user_credits
    WHERE reason IN ('referral_signup_bonus','referral_reward') AND order_id = NEW.id;
  IF already > 0 THEN RETURN NEW; END IF;
  INSERT INTO public.user_credits (user_id, amount, reason, order_id) VALUES
    (NEW.user_id, 50, 'referral_signup_bonus', NEW.id),
    (ref, 50, 'referral_reward', NEW.id);
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_parcel_referral AFTER INSERT ON public.parcels
  FOR EACH ROW EXECUTE FUNCTION public.grant_referral_credit();
CREATE TRIGGER trg_food_referral AFTER INSERT ON public.food_orders
  FOR EACH ROW EXECUTE FUNCTION public.grant_referral_credit();

-- ==========================
-- Seed sample promo codes
-- ==========================
INSERT INTO public.promo_codes (code, discount_type, discount_value, max_discount, min_order, per_user_limit, applies_to)
VALUES
  ('WELCOME20', 'percent', 20, 60, 100, 1, 'both'),
  ('CU50', 'flat', 50, NULL, 200, 1, 'food'),
  ('PARCEL10', 'flat', 10, NULL, 0, 3, 'parcel')
ON CONFLICT (code) DO NOTHING;
