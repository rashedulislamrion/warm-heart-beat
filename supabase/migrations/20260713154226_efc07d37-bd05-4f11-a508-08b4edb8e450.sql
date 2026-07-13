
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_type text NOT NULL CHECK (order_type IN ('food','parcel')),
  order_id uuid NOT NULL,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, order_id)
);

GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews" ON public.reviews
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Users create own reviews" ON public.reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own reviews" ON public.reviews
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users or admins delete reviews" ON public.reviews
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update all reviews" ON public.reviews
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_reviews_updated
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_reviews_restaurant ON public.reviews(restaurant_id) WHERE restaurant_id IS NOT NULL;
CREATE INDEX idx_reviews_order ON public.reviews(order_id);

-- Aggregate helper for restaurant ratings
CREATE OR REPLACE FUNCTION public.restaurant_ratings()
RETURNS TABLE (restaurant_id uuid, avg_rating numeric, review_count bigint)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT restaurant_id,
         ROUND(AVG(rating)::numeric, 1) AS avg_rating,
         COUNT(*)::bigint AS review_count
  FROM public.reviews
  WHERE restaurant_id IS NOT NULL
  GROUP BY restaurant_id
$$;

GRANT EXECUTE ON FUNCTION public.restaurant_ratings() TO anon, authenticated;
