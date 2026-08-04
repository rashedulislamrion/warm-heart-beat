-- ============================================================
-- DearDash — full schema for a fresh Supabase project
-- Paste this whole file into: Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 1) ENUM TYPES
CREATE TYPE public.app_role AS ENUM ('admin', 'rider', 'user', 'restaurant');
CREATE TYPE public.food_order_status AS ENUM ('pending', 'confirmed', 'preparing', 'picked_up', 'delivered', 'cancelled');
CREATE TYPE public.parcel_item_type AS ENUM ('document', 'medicine', 'grocery', 'clothes', 'electronics', 'other');
CREATE TYPE public.parcel_size AS ENUM ('small', 'medium', 'large');
CREATE TYPE public.parcel_status AS ENUM ('pending', 'rider_assigned', 'picked_up', 'delivered', 'cancelled');

-- 2) TABLES
CREATE TABLE public.favorite_restaurants (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  restaurant_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.food_orders (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  order_code text DEFAULT ('PYF-'::text || upper("substring"((gen_random_uuid())::text, 1, 6))) NOT NULL,
  user_id uuid NOT NULL,
  restaurant_id uuid NOT NULL,
  items jsonb NOT NULL,
  subtotal integer NOT NULL,
  delivery_charge integer NOT NULL,
  total integer NOT NULL,
  receiver_name text NOT NULL,
  receiver_phone text NOT NULL,
  receiver_hall text NOT NULL,
  receiver_block_room text,
  receiver_landmark text,
  note text,
  status food_order_status DEFAULT 'pending'::food_order_status NOT NULL,
  rider_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  scheduled_for timestamp with time zone
);
CREATE TABLE public.menu_items (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  restaurant_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  price integer NOT NULL,
  image_url text,
  category text,
  is_available boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.notifications (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text DEFAULT ''::text NOT NULL,
  url text,
  type text DEFAULT 'system'::text NOT NULL,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.order_messages (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  order_type text NOT NULL,
  order_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.parcels (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  order_code text DEFAULT ('PYR-'::text || upper("substring"((gen_random_uuid())::text, 1, 6))) NOT NULL,
  user_id uuid NOT NULL,
  sender_name text NOT NULL,
  sender_phone text NOT NULL,
  sender_hall text NOT NULL,
  sender_block_room text,
  sender_landmark text,
  receiver_name text NOT NULL,
  receiver_phone text NOT NULL,
  receiver_hall text NOT NULL,
  receiver_block_room text,
  receiver_landmark text,
  item_type parcel_item_type NOT NULL,
  size parcel_size NOT NULL,
  description text,
  photo_url text,
  delivery_charge integer NOT NULL,
  status parcel_status DEFAULT 'pending'::parcel_status NOT NULL,
  rider_id uuid,
  note text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  scheduled_for timestamp with time zone
);
CREATE TABLE public.payout_requests (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  method text NOT NULL,
  account_number text NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  note text,
  admin_note text,
  processed_by uuid,
  processed_at timestamp with time zone,
  txn_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.profiles (  id uuid NOT NULL,
  full_name text,
  phone text,
  hall text,
  block_room text,
  avatar_url text,
  profile_complete boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  referral_code text NOT NULL,
  referred_by uuid,
  is_online boolean DEFAULT false NOT NULL,
  online_at timestamp with time zone
);
CREATE TABLE public.promo_codes (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  code text NOT NULL,
  discount_type text NOT NULL,
  discount_value integer NOT NULL,
  max_discount integer,
  min_order integer DEFAULT 0 NOT NULL,
  usage_limit integer,
  per_user_limit integer DEFAULT 1 NOT NULL,
  applies_to text DEFAULT 'both'::text NOT NULL,
  expires_at timestamp with time zone,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.promo_redemptions (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  promo_code_id uuid NOT NULL,
  order_type text NOT NULL,
  order_id uuid NOT NULL,
  discount integer NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.push_subscriptions (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.restaurants (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  image_url text,
  cuisine text,
  rating numeric(2,1) DEFAULT 4.5 NOT NULL,
  delivery_time_min integer DEFAULT 30 NOT NULL,
  min_order integer DEFAULT 0 NOT NULL,
  is_open boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  owner_id uuid,
  open_time time without time zone,
  close_time time without time zone,
  location text DEFAULT 'Gate-1'::text NOT NULL
);
CREATE TABLE public.reviews (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  order_type text NOT NULL,
  order_id uuid NOT NULL,
  restaurant_id uuid,
  rating smallint NOT NULL,
  comment text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  rider_id uuid,
  rider_rating smallint,
  photo_urls text[] DEFAULT '{}'::text[] NOT NULL,
  owner_reply text,
  owner_reply_at timestamp with time zone,
  rider_reply text,
  rider_reply_at timestamp with time zone
);
CREATE TABLE public.rider_applications (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  student_id text,
  hall text,
  department text,
  semester text,
  availability text,
  has_bike boolean DEFAULT false NOT NULL,
  motivation text,
  status text DEFAULT 'pending'::text NOT NULL,
  admin_note text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  user_id uuid NOT NULL
);
CREATE TABLE public.user_credits (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  reason text NOT NULL,
  order_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.user_roles (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  role app_role DEFAULT 'user'::app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.wallet_transactions (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  kind text NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  method text,
  reference text,
  order_type text,
  order_id uuid,
  note text,
  approved_by uuid,
  approved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3) CONSTRAINTS (PK / UNIQUE / FK / CHECK)
ALTER TABLE public.parcels ADD CONSTRAINT parcels_pkey PRIMARY KEY (id);
ALTER TABLE public.promo_redemptions ADD CONSTRAINT promo_redemptions_pkey PRIMARY KEY (id);
ALTER TABLE public.menu_items ADD CONSTRAINT menu_items_pkey PRIMARY KEY (id);
ALTER TABLE public.notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);
ALTER TABLE public.favorite_restaurants ADD CONSTRAINT favorite_restaurants_pkey PRIMARY KEY (id);
ALTER TABLE public.order_messages ADD CONSTRAINT order_messages_pkey PRIMARY KEY (id);
ALTER TABLE public.restaurants ADD CONSTRAINT restaurants_pkey PRIMARY KEY (id);
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id);
ALTER TABLE public.food_orders ADD CONSTRAINT food_orders_pkey PRIMARY KEY (id);
ALTER TABLE public.user_credits ADD CONSTRAINT user_credits_pkey PRIMARY KEY (id);
ALTER TABLE public.promo_codes ADD CONSTRAINT promo_codes_pkey PRIMARY KEY (id);
ALTER TABLE public.payout_requests ADD CONSTRAINT payout_requests_pkey PRIMARY KEY (id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
ALTER TABLE public.push_subscriptions ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);
ALTER TABLE public.rider_applications ADD CONSTRAINT rider_applications_pkey PRIMARY KEY (id);
ALTER TABLE public.reviews ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);
ALTER TABLE public.push_subscriptions ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);
ALTER TABLE public.parcels ADD CONSTRAINT parcels_order_code_key UNIQUE (order_code);
ALTER TABLE public.promo_codes ADD CONSTRAINT promo_codes_code_key UNIQUE (code);
ALTER TABLE public.favorite_restaurants ADD CONSTRAINT favorite_restaurants_user_id_restaurant_id_key UNIQUE (user_id, restaurant_id);
ALTER TABLE public.promo_redemptions ADD CONSTRAINT promo_redemptions_order_type_order_id_key UNIQUE (order_type, order_id);
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
ALTER TABLE public.reviews ADD CONSTRAINT reviews_user_id_order_id_key UNIQUE (user_id, order_id);
ALTER TABLE public.parcels ADD CONSTRAINT parcels_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.order_messages ADD CONSTRAINT order_messages_body_check CHECK (((char_length(body) >= 1) AND (char_length(body) <= 1000)));
ALTER TABLE public.order_messages ADD CONSTRAINT order_messages_order_type_check CHECK ((order_type = ANY (ARRAY['food'::text, 'parcel'::text])));
ALTER TABLE public.order_messages ADD CONSTRAINT order_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.push_subscriptions ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_kind_check CHECK ((kind = ANY (ARRAY['topup'::text, 'payment'::text, 'refund'::text, 'payout'::text, 'adjust'::text])));
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_method_check CHECK ((method = ANY (ARRAY['bkash'::text, 'nagad'::text, 'wallet'::text, 'admin'::text])));
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_order_type_check CHECK ((order_type = ANY (ARRAY['parcel'::text, 'food'::text])));
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])));
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.payout_requests ADD CONSTRAINT payout_requests_amount_check CHECK ((amount > 0));
ALTER TABLE public.payout_requests ADD CONSTRAINT payout_requests_method_check CHECK ((method = ANY (ARRAY['bkash'::text, 'nagad'::text])));
ALTER TABLE public.payout_requests ADD CONSTRAINT payout_requests_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES auth.users(id);
ALTER TABLE public.payout_requests ADD CONSTRAINT payout_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])));
ALTER TABLE public.payout_requests ADD CONSTRAINT payout_requests_txn_id_fkey FOREIGN KEY (txn_id) REFERENCES wallet_transactions(id);
ALTER TABLE public.restaurants ADD CONSTRAINT restaurants_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.payout_requests ADD CONSTRAINT payout_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.food_orders ADD CONSTRAINT food_orders_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id);
ALTER TABLE public.reviews ADD CONSTRAINT reviews_order_type_check CHECK ((order_type = ANY (ARRAY['food'::text, 'parcel'::text])));
ALTER TABLE public.reviews ADD CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)));
ALTER TABLE public.reviews ADD CONSTRAINT reviews_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_rider_id_fkey FOREIGN KEY (rider_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_rider_rating_check CHECK (((rider_rating IS NULL) OR ((rider_rating >= 1) AND (rider_rating <= 5))));
ALTER TABLE public.reviews ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.menu_items ADD CONSTRAINT menu_items_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE;
ALTER TABLE public.promo_codes ADD CONSTRAINT promo_codes_applies_to_check CHECK ((applies_to = ANY (ARRAY['food'::text, 'parcel'::text, 'both'::text])));
ALTER TABLE public.promo_codes ADD CONSTRAINT promo_codes_discount_type_check CHECK ((discount_type = ANY (ARRAY['flat'::text, 'percent'::text])));
ALTER TABLE public.promo_codes ADD CONSTRAINT promo_codes_discount_value_check CHECK ((discount_value > 0));
ALTER TABLE public.promo_redemptions ADD CONSTRAINT promo_redemptions_order_type_check CHECK ((order_type = ANY (ARRAY['food'::text, 'parcel'::text])));
ALTER TABLE public.promo_redemptions ADD CONSTRAINT promo_redemptions_promo_code_id_fkey FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE CASCADE;
ALTER TABLE public.promo_redemptions ADD CONSTRAINT promo_redemptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.favorite_restaurants ADD CONSTRAINT favorite_restaurants_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE;
ALTER TABLE public.favorite_restaurants ADD CONSTRAINT favorite_restaurants_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.rider_applications ADD CONSTRAINT rider_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_credits ADD CONSTRAINT user_credits_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.parcels ADD CONSTRAINT parcels_rider_id_fkey FOREIGN KEY (rider_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4) INDEXES
CREATE INDEX idx_reviews_restaurant ON public.reviews USING btree (restaurant_id) WHERE (restaurant_id IS NOT NULL);
CREATE INDEX idx_reviews_order ON public.reviews USING btree (order_id);
CREATE INDEX notifications_user_created_idx ON public.notifications USING btree (user_id, created_at DESC);
CREATE INDEX notifications_user_unread_idx ON public.notifications USING btree (user_id) WHERE (read_at IS NULL);
CREATE INDEX idx_menu_items_restaurant ON public.menu_items USING btree (restaurant_id);
CREATE INDEX idx_food_orders_user ON public.food_orders USING btree (user_id);
CREATE UNIQUE INDEX profiles_referral_code_key ON public.profiles USING btree (referral_code);
CREATE INDEX user_credits_user_id_created_at_idx ON public.user_credits USING btree (user_id, created_at DESC);
CREATE INDEX idx_parcels_user_id ON public.parcels USING btree (user_id);
CREATE INDEX idx_parcels_status ON public.parcels USING btree (status);
CREATE INDEX idx_parcels_order_code ON public.parcels USING btree (order_code);
CREATE UNIQUE INDEX rider_applications_user_id_key ON public.rider_applications USING btree (user_id);
CREATE INDEX order_messages_order_type_order_id_created_at_idx ON public.order_messages USING btree (order_type, order_id, created_at);
CREATE INDEX order_messages_sender_id_idx ON public.order_messages USING btree (sender_id);
CREATE INDEX push_subscriptions_user_id_idx ON public.push_subscriptions USING btree (user_id);
CREATE INDEX reviews_rider_id_idx ON public.reviews USING btree (rider_id) WHERE (rider_id IS NOT NULL);
CREATE INDEX idx_parcels_scheduled_for ON public.parcels USING btree (scheduled_for) WHERE (scheduled_for IS NOT NULL);
CREATE INDEX idx_food_orders_scheduled_for ON public.food_orders USING btree (scheduled_for) WHERE (scheduled_for IS NOT NULL);
CREATE INDEX wallet_tx_user_idx ON public.wallet_transactions USING btree (user_id, created_at DESC);
CREATE INDEX wallet_tx_status_idx ON public.wallet_transactions USING btree (status, created_at DESC);
CREATE INDEX payout_user_idx ON public.payout_requests USING btree (user_id, created_at DESC);
CREATE INDEX payout_status_idx ON public.payout_requests USING btree (status, created_at DESC);
CREATE INDEX restaurants_owner_id_idx ON public.restaurants USING btree (owner_id);

-- 5) FUNCTIONS
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$
;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$function$
;
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.phone
  )
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.track_order(_code text)
 RETURNS TABLE(order_code text, order_type text, status text, receiver_hall text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT order_code, 'parcel'::text, status::text, receiver_hall, created_at, updated_at
    FROM public.parcels WHERE order_code = _code
  UNION ALL
  SELECT order_code, 'food'::text, status::text, receiver_hall, created_at, updated_at
    FROM public.food_orders WHERE order_code = _code
$function$
;
CREATE OR REPLACE FUNCTION public.my_credit_balance()
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(SUM(amount)::int, 0) FROM public.user_credits WHERE user_id = auth.uid()
$function$
;
CREATE OR REPLACE FUNCTION public.gen_referral_code()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE c text; ex boolean;
BEGIN
  LOOP
    c := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = c) INTO ex;
    EXIT WHEN NOT ex;
  END LOOP;
  RETURN c;
END; $function$
;
CREATE OR REPLACE FUNCTION public.set_referral_code_trg()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    NEW.referral_code := public.gen_referral_code();
  END IF;
  RETURN NEW;
END; $function$
;
CREATE OR REPLACE FUNCTION public.notify_order_status_push()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_url text := 'https://project--8e9d0152-91b7-4855-904d-063f3c426f1f.lovable.app/api/public/hooks/order-push';
  v_type text := TG_ARGV[0];
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM net.http_post(
      url := v_url,
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := jsonb_build_object(
        'order_type', v_type,
        'order_id', NEW.id
      )
    );
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.reject_topup(_txn_id uuid, _note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.wallet_transactions
    SET status = 'rejected', approved_by = auth.uid(), approved_at = now(), note = _note
    WHERE id = _txn_id AND status = 'pending' AND kind = 'topup';
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found_or_processed'; END IF;
END; $function$
;
CREATE OR REPLACE FUNCTION public.restaurant_ratings()
 RETURNS TABLE(restaurant_id uuid, avg_rating numeric, review_count bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT restaurant_id,
         ROUND(AVG(rating)::numeric, 1) AS avg_rating,
         COUNT(*)::bigint AS review_count
  FROM public.reviews
  WHERE restaurant_id IS NOT NULL
  GROUP BY restaurant_id
$function$
;
CREATE OR REPLACE FUNCTION public.grant_referral_credit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
END; $function$
;
CREATE OR REPLACE FUNCTION public.reject_payout(_req_id uuid, _admin_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.payout_requests
    SET status = 'rejected', admin_note = _admin_note, processed_by = auth.uid(), processed_at = now()
    WHERE id = _req_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found_or_processed'; END IF;
END; $function$
;
CREATE OR REPLACE FUNCTION public.request_payout(_amount integer, _method text, _account_number text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_bal int; v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT public.has_role(auth.uid(), 'rider') THEN RAISE EXCEPTION 'not_a_rider'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
  IF _method NOT IN ('bkash','nagad') THEN RAISE EXCEPTION 'invalid_method'; END IF;
  IF _account_number IS NULL OR length(trim(_account_number)) < 6 THEN RAISE EXCEPTION 'invalid_account'; END IF;
  SELECT COALESCE(SUM(amount)::int, 0) INTO v_bal
    FROM public.wallet_transactions WHERE user_id = auth.uid() AND status = 'approved';
  IF v_bal < _amount THEN RAISE EXCEPTION 'insufficient_balance'; END IF;
  INSERT INTO public.payout_requests (user_id, amount, method, account_number)
    VALUES (auth.uid(), _amount, _method, trim(_account_number))
    RETURNING id INTO v_id;
  RETURN v_id;
END; $function$
;
CREATE OR REPLACE FUNCTION public.redeem_credits(_amount integer, _order_type text, _order_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE bal int; use_amt int;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN RETURN 0; END IF;
  SELECT COALESCE(SUM(amount)::int, 0) INTO bal FROM public.user_credits WHERE user_id = auth.uid();
  use_amt := LEAST(_amount, GREATEST(bal, 0));
  IF use_amt <= 0 THEN RETURN 0; END IF;
  INSERT INTO public.user_credits (user_id, amount, reason, order_id)
    VALUES (auth.uid(), -use_amt, ('redeemed_' || _order_type), _order_id);
  RETURN use_amt;
END; $function$
;
CREATE OR REPLACE FUNCTION public.is_order_party(_order_type text, _order_id uuid, _user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE _order_type
    WHEN 'parcel' THEN EXISTS (
      SELECT 1 FROM public.parcels
      WHERE id = _order_id AND (user_id = _user OR rider_id = _user)
    )
    WHEN 'food' THEN EXISTS (
      SELECT 1 FROM public.food_orders
      WHERE id = _order_id AND (user_id = _user OR rider_id = _user)
    )
    ELSE false
  END
$function$
;
CREATE OR REPLACE FUNCTION public.validate_promo(_code text, _order_type text, _subtotal integer)
 RETURNS TABLE(promo_id uuid, discount integer, code text, message text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION public.redeem_promo(_code text, _order_type text, _order_id uuid, _subtotal integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
END; $function$
;
CREATE OR REPLACE FUNCTION public.approve_topup(_txn_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.wallet_transactions
    SET status = 'approved', approved_by = auth.uid(), approved_at = now()
    WHERE id = _txn_id AND status = 'pending' AND kind = 'topup';
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found_or_processed'; END IF;
END; $function$
;
CREATE OR REPLACE FUNCTION public.rider_ratings()
 RETURNS TABLE(rider_id uuid, avg_rating numeric, review_count bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT rider_id,
         ROUND(AVG(rider_rating)::numeric, 1) AS avg_rating,
         COUNT(*)::bigint AS review_count
  FROM public.reviews
  WHERE rider_id IS NOT NULL AND rider_rating IS NOT NULL
  GROUP BY rider_id
$function$
;
CREATE OR REPLACE FUNCTION public.request_topup(_amount integer, _method text, _reference text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
  IF _method NOT IN ('bkash','nagad') THEN RAISE EXCEPTION 'invalid_method'; END IF;
  INSERT INTO public.wallet_transactions (user_id, amount, kind, status, method, reference)
    VALUES (auth.uid(), _amount, 'topup', 'pending', _method, _reference)
    RETURNING id INTO v_id;
  RETURN v_id;
END; $function$
;
CREATE OR REPLACE FUNCTION public.pay_with_wallet(_order_type text, _order_id uuid, _amount integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_bal int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RETURN 0; END IF;
  IF _order_type NOT IN ('parcel','food') THEN RAISE EXCEPTION 'invalid_order_type'; END IF;
  SELECT COALESCE(SUM(amount)::int, 0) INTO v_bal
    FROM public.wallet_transactions WHERE user_id = auth.uid() AND status = 'approved';
  IF v_bal < _amount THEN RAISE EXCEPTION 'insufficient_balance'; END IF;
  INSERT INTO public.wallet_transactions (user_id, amount, kind, status, method, order_type, order_id, approved_by, approved_at)
    VALUES (auth.uid(), -_amount, 'payment', 'approved', 'wallet', _order_type, _order_id, auth.uid(), now());
  RETURN _amount;
END; $function$
;
CREATE OR REPLACE FUNCTION public.attach_referrer(_code text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
END; $function$
;
CREATE OR REPLACE FUNCTION public.my_wallet_balance()
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(SUM(amount)::int, 0) FROM public.wallet_transactions
  WHERE user_id = auth.uid() AND status = 'approved'
$function$
;
CREATE OR REPLACE FUNCTION public.grant_rider_role_on_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'rider'::app_role)
    ON CONFLICT DO NOTHING;
  END IF;
  IF NEW.status <> 'approved' AND OLD.status = 'approved' THEN
    DELETE FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'rider'::app_role;
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.my_restaurant_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id FROM public.restaurants WHERE owner_id = auth.uid() LIMIT 1
$function$
;
CREATE OR REPLACE FUNCTION public.my_unread_notification_count()
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COUNT(*)::int FROM public.notifications
  WHERE user_id = auth.uid() AND read_at IS NULL
$function$
;
CREATE OR REPLACE FUNCTION public.assign_restaurant_owner(_restaurant_id uuid, _user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.restaurants SET owner_id = _user_id WHERE id = _restaurant_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'restaurant_not_found'; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'restaurant'::app_role)
    ON CONFLICT DO NOTHING;
END; $function$
;
CREATE OR REPLACE FUNCTION public.online_riders_count()
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COUNT(*)::int
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'rider'::app_role
  WHERE p.is_online = true;
$function$
;
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE n int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  UPDATE public.notifications SET read_at = now()
    WHERE user_id = auth.uid() AND read_at IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $function$
;
CREATE OR REPLACE FUNCTION public.refund_order(_order_type text, _order_id uuid)
 RETURNS TABLE(credits_refunded integer, promo_released boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION public.set_rider_online(_online boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT public.has_role(auth.uid(), 'rider'::app_role) THEN RAISE EXCEPTION 'not_a_rider'; END IF;
  UPDATE public.profiles
    SET is_online = _online,
        online_at = CASE WHEN _online THEN now() ELSE online_at END
    WHERE id = auth.uid();
END;
$function$
;
CREATE OR REPLACE FUNCTION public.release_order(_order_type text, _order_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION public.approve_payout(_req_id uuid, _admin_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r public.payout_requests; v_txn uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO r FROM public.payout_requests WHERE id = _req_id AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found_or_processed'; END IF;
  INSERT INTO public.wallet_transactions (user_id, amount, kind, status, method, reference, approved_by, approved_at)
    VALUES (r.user_id, -r.amount, 'payout', 'approved', r.method, r.account_number, auth.uid(), now())
    RETURNING id INTO v_txn;
  UPDATE public.payout_requests
    SET status = 'approved', admin_note = _admin_note, processed_by = auth.uid(), processed_at = now(), txn_id = v_txn
    WHERE id = _req_id;
END; $function$
;

-- 6) TRIGGERS
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER parcels_set_updated_at BEFORE UPDATE ON public.parcels FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_restaurants_updated BEFORE UPDATE ON public.restaurants FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_menu_items_updated BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_food_orders_updated BEFORE UPDATE ON public.food_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_reviews_updated BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER profiles_set_referral_code BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION set_referral_code_trg();
CREATE TRIGGER trg_parcel_referral AFTER INSERT ON public.parcels FOR EACH ROW EXECUTE FUNCTION grant_referral_credit();
CREATE TRIGGER trg_food_referral AFTER INSERT ON public.food_orders FOR EACH ROW EXECUTE FUNCTION grant_referral_credit();
CREATE TRIGGER push_subs_updated_at BEFORE UPDATE ON public.push_subscriptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER food_orders_status_push AFTER UPDATE OF status ON public.food_orders FOR EACH ROW EXECUTE FUNCTION notify_order_status_push('food');
CREATE TRIGGER parcels_status_push AFTER UPDATE OF status ON public.parcels FOR EACH ROW EXECUTE FUNCTION notify_order_status_push('parcel');
CREATE TRIGGER wallet_tx_updated BEFORE UPDATE ON public.wallet_transactions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER payout_updated BEFORE UPDATE ON public.payout_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER rider_applications_updated_at BEFORE UPDATE ON public.rider_applications FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_grant_rider_role AFTER UPDATE OF status ON public.rider_applications FOR EACH ROW EXECUTE FUNCTION grant_rider_role_on_approval();

-- 6b) AUTH TRIGGER (creates profile + default role on signup)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7) GRANTS (Data API access)


-- 8) ROW LEVEL SECURITY
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rider_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

-- 9) POLICIES
CREATE POLICY "Users can view own roles" ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Admins can view all roles" ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own profile" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = id));
CREATE POLICY "Users can insert own profile" ON public.profiles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));
CREATE POLICY "Users can update own profile" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = id));
CREATE POLICY "Admins can view all profiles" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own parcels" ON public.parcels AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can create parcels" ON public.parcels AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Riders can view assigned parcels" ON public.parcels AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = rider_id));
CREATE POLICY "Admins can view all parcels" ON public.parcels AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update all parcels" ON public.parcels AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view restaurants" ON public.restaurants AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Admins manage restaurants" ON public.restaurants AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view menu items" ON public.menu_items AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Admins manage menu items" ON public.menu_items AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users view own food orders" ON public.food_orders AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users create own food orders" ON public.food_orders AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Admins view all food orders" ON public.food_orders AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update all food orders" ON public.food_orders AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Riders view assigned food orders" ON public.food_orders AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = rider_id));
CREATE POLICY "Admins delete food orders" ON public.food_orders AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view reviews" ON public.reviews AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users create own reviews" ON public.reviews AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users update own reviews" ON public.reviews AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users or admins delete reviews" ON public.reviews AS PERMISSIVE FOR DELETE TO authenticated USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Admins update all reviews" ON public.reviews AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users manage own favorites" ON public.favorite_restaurants AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "auth read active promos" ON public.promo_codes AS PERMISSIVE FOR SELECT TO authenticated USING (is_active);
CREATE POLICY "admin manage promos" ON public.promo_codes AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "own redemptions" ON public.promo_redemptions AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "own credits" ON public.user_credits AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "parties read messages" ON public.order_messages AS PERMISSIVE FOR SELECT TO authenticated USING ((is_order_party(order_type, order_id, auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Users delete own notifications" ON public.notifications AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "recipients mark read" ON public.order_messages AS PERMISSIVE FOR UPDATE TO authenticated USING (((sender_id <> auth.uid()) AND is_order_party(order_type, order_id, auth.uid()))) WITH CHECK (((sender_id <> auth.uid()) AND is_order_party(order_type, order_id, auth.uid())));
CREATE POLICY "parties send messages" ON public.order_messages AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((sender_id = auth.uid()) AND (is_order_party(order_type, order_id, auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))));
CREATE POLICY "own push subs select" ON public.push_subscriptions AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "own push subs insert" ON public.push_subscriptions AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "own push subs update" ON public.push_subscriptions AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "own push subs delete" ON public.push_subscriptions AS PERMISSIVE FOR DELETE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Riders view unassigned parcels" ON public.parcels AS PERMISSIVE FOR SELECT TO authenticated USING (((rider_id IS NULL) AND (status = 'pending'::parcel_status) AND has_role(auth.uid(), 'rider'::app_role)));
CREATE POLICY "Riders update own or claim parcels" ON public.parcels AS PERMISSIVE FOR UPDATE TO authenticated USING ((has_role(auth.uid(), 'rider'::app_role) AND ((rider_id = auth.uid()) OR (rider_id IS NULL)))) WITH CHECK ((has_role(auth.uid(), 'rider'::app_role) AND (rider_id = auth.uid())));
CREATE POLICY "Riders view unassigned food orders" ON public.food_orders AS PERMISSIVE FOR SELECT TO authenticated USING (((rider_id IS NULL) AND (status = ANY (ARRAY['confirmed'::food_order_status, 'preparing'::food_order_status])) AND has_role(auth.uid(), 'rider'::app_role)));
CREATE POLICY "Riders update own or claim food orders" ON public.food_orders AS PERMISSIVE FOR UPDATE TO authenticated USING ((has_role(auth.uid(), 'rider'::app_role) AND ((rider_id = auth.uid()) OR (rider_id IS NULL)))) WITH CHECK ((has_role(auth.uid(), 'rider'::app_role) AND (rider_id = auth.uid())));
CREATE POLICY wallet_tx_owner_select ON public.wallet_transactions AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY wallet_tx_admin_select ON public.wallet_transactions AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY wallet_tx_admin_update ON public.wallet_transactions AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY payout_owner_select ON public.payout_requests AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY payout_admin_select ON public.payout_requests AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owners update own restaurant" ON public.restaurants AS PERMISSIVE FOR UPDATE TO public USING (((auth.uid() = owner_id) AND has_role(auth.uid(), 'restaurant'::app_role))) WITH CHECK (((auth.uid() = owner_id) AND has_role(auth.uid(), 'restaurant'::app_role)));
CREATE POLICY "Owners manage own menu items" ON public.menu_items AS PERMISSIVE FOR ALL TO public USING ((has_role(auth.uid(), 'restaurant'::app_role) AND (EXISTS ( SELECT 1
   FROM restaurants r
  WHERE ((r.id = menu_items.restaurant_id) AND (r.owner_id = auth.uid())))))) WITH CHECK ((has_role(auth.uid(), 'restaurant'::app_role) AND (EXISTS ( SELECT 1
   FROM restaurants r
  WHERE ((r.id = menu_items.restaurant_id) AND (r.owner_id = auth.uid()))))));
CREATE POLICY "Owners view own restaurant orders" ON public.food_orders AS PERMISSIVE FOR SELECT TO public USING ((has_role(auth.uid(), 'restaurant'::app_role) AND (EXISTS ( SELECT 1
   FROM restaurants r
  WHERE ((r.id = food_orders.restaurant_id) AND (r.owner_id = auth.uid()))))));
CREATE POLICY "Owners update own restaurant orders" ON public.food_orders AS PERMISSIVE FOR UPDATE TO public USING ((has_role(auth.uid(), 'restaurant'::app_role) AND (EXISTS ( SELECT 1
   FROM restaurants r
  WHERE ((r.id = food_orders.restaurant_id) AND (r.owner_id = auth.uid())))))) WITH CHECK ((has_role(auth.uid(), 'restaurant'::app_role) AND (EXISTS ( SELECT 1
   FROM restaurants r
  WHERE ((r.id = food_orders.restaurant_id) AND (r.owner_id = auth.uid()))))));
CREATE POLICY "Users read own notifications" ON public.notifications AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users update own notifications" ON public.notifications AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Owners can reply to reviews" ON public.reviews AS PERMISSIVE FOR UPDATE TO authenticated USING (((restaurant_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM restaurants r
  WHERE ((r.id = reviews.restaurant_id) AND (r.owner_id = auth.uid())))))) WITH CHECK (((restaurant_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM restaurants r
  WHERE ((r.id = reviews.restaurant_id) AND (r.owner_id = auth.uid()))))));
CREATE POLICY "Riders can reply to reviews" ON public.reviews AS PERMISSIVE FOR UPDATE TO authenticated USING (((rider_id IS NOT NULL) AND (rider_id = auth.uid()))) WITH CHECK (((rider_id IS NOT NULL) AND (rider_id = auth.uid())));
CREATE POLICY "Admins can view rider applications" ON public.rider_applications AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update rider applications" ON public.rider_applications AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete rider applications" ON public.rider_applications AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users insert own rider application" ON public.rider_applications AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users view own rider application" ON public.rider_applications AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));

-- 10) STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public) VALUES ('review-photos','review-photos', false)
  ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Review photos are viewable by authenticated" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated USING ((bucket_id = 'review-photos'::text));
CREATE POLICY "Users upload own review photos" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'review-photos'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
CREATE POLICY "Users update own review photos" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated USING (((bucket_id = 'review-photos'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
CREATE POLICY "Users delete own review photos" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING (((bucket_id = 'review-photos'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));

-- 11) REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.parcels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.food_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
