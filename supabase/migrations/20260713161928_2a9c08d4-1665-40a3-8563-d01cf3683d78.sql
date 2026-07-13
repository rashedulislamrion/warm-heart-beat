
-- Push subscriptions table
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own push subs select" ON public.push_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own push subs insert" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own push subs update" ON public.push_subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own push subs delete" ON public.push_subscriptions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER push_subs_updated_at BEFORE UPDATE ON public.push_subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX push_subscriptions_user_id_idx ON public.push_subscriptions(user_id);

-- Enable pg_net if not enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Trigger function that pings the push webhook when order status changes
CREATE OR REPLACE FUNCTION public.notify_order_status_push()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE TRIGGER food_orders_status_push
AFTER UPDATE OF status ON public.food_orders
FOR EACH ROW EXECUTE FUNCTION public.notify_order_status_push('food');

CREATE TRIGGER parcels_status_push
AFTER UPDATE OF status ON public.parcels
FOR EACH ROW EXECUTE FUNCTION public.notify_order_status_push('parcel');
