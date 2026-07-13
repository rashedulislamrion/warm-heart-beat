
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS rider_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rider_rating smallint;

ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_rider_rating_check;
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_rider_rating_check CHECK (rider_rating IS NULL OR (rider_rating BETWEEN 1 AND 5));

CREATE INDEX IF NOT EXISTS reviews_rider_id_idx ON public.reviews(rider_id) WHERE rider_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.rider_ratings()
RETURNS TABLE(rider_id uuid, avg_rating numeric, review_count bigint)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT rider_id,
         ROUND(AVG(rider_rating)::numeric, 1) AS avg_rating,
         COUNT(*)::bigint AS review_count
  FROM public.reviews
  WHERE rider_id IS NOT NULL AND rider_rating IS NOT NULL
  GROUP BY rider_id
$$;

GRANT EXECUTE ON FUNCTION public.rider_ratings() TO anon, authenticated;
