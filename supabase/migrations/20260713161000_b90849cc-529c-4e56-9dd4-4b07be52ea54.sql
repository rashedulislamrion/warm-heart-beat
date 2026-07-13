
CREATE TABLE public.order_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_type text NOT NULL CHECK (order_type IN ('food','parcel')),
  order_id uuid NOT NULL,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.order_messages(order_type, order_id, created_at);
CREATE INDEX ON public.order_messages(sender_id);

GRANT SELECT, INSERT, UPDATE ON public.order_messages TO authenticated;
GRANT ALL ON public.order_messages TO service_role;
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user a party (customer or rider) on this order?
CREATE OR REPLACE FUNCTION public.is_order_party(_order_type text, _order_id uuid, _user uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
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
$$;
GRANT EXECUTE ON FUNCTION public.is_order_party(text, uuid, uuid) TO authenticated;

CREATE POLICY "parties read messages" ON public.order_messages
  FOR SELECT TO authenticated
  USING (
    public.is_order_party(order_type, order_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "parties send messages" ON public.order_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_order_party(order_type, order_id, auth.uid())
  );

CREATE POLICY "recipients mark read" ON public.order_messages
  FOR UPDATE TO authenticated
  USING (
    sender_id <> auth.uid()
    AND public.is_order_party(order_type, order_id, auth.uid())
  )
  WITH CHECK (
    sender_id <> auth.uid()
    AND public.is_order_party(order_type, order_id, auth.uid())
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.order_messages;
ALTER TABLE public.order_messages REPLICA IDENTITY FULL;
