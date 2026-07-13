
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS open_time time,
  ADD COLUMN IF NOT EXISTS close_time time;

CREATE INDEX IF NOT EXISTS restaurants_owner_id_idx ON public.restaurants(owner_id);

CREATE POLICY "Owners update own restaurant" ON public.restaurants
  FOR UPDATE
  USING (auth.uid() = owner_id AND public.has_role(auth.uid(), 'restaurant'::public.app_role))
  WITH CHECK (auth.uid() = owner_id AND public.has_role(auth.uid(), 'restaurant'::public.app_role));

CREATE POLICY "Owners manage own menu items" ON public.menu_items
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'restaurant'::public.app_role)
    AND EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = menu_items.restaurant_id AND r.owner_id = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'restaurant'::public.app_role)
    AND EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = menu_items.restaurant_id AND r.owner_id = auth.uid())
  );

CREATE POLICY "Owners view own restaurant orders" ON public.food_orders
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'restaurant'::public.app_role)
    AND EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = food_orders.restaurant_id AND r.owner_id = auth.uid())
  );

CREATE POLICY "Owners update own restaurant orders" ON public.food_orders
  FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'restaurant'::public.app_role)
    AND EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = food_orders.restaurant_id AND r.owner_id = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'restaurant'::public.app_role)
    AND EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = food_orders.restaurant_id AND r.owner_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.assign_restaurant_owner(_restaurant_id uuid, _user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.restaurants SET owner_id = _user_id WHERE id = _restaurant_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'restaurant_not_found'; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'restaurant'::app_role)
    ON CONFLICT DO NOTHING;
END; $$;

CREATE OR REPLACE FUNCTION public.my_restaurant_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.restaurants WHERE owner_id = auth.uid() LIMIT 1
$$;
