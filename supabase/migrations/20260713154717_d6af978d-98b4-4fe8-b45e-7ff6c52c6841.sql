CREATE TABLE public.favorite_restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, restaurant_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorite_restaurants TO authenticated;
GRANT ALL ON public.favorite_restaurants TO service_role;
ALTER TABLE public.favorite_restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own favorites" ON public.favorite_restaurants
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);