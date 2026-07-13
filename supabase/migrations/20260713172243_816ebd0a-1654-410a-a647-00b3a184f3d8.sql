
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS photo_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS owner_reply text,
  ADD COLUMN IF NOT EXISTS owner_reply_at timestamptz,
  ADD COLUMN IF NOT EXISTS rider_reply text,
  ADD COLUMN IF NOT EXISTS rider_reply_at timestamptz;

-- Owner can update their restaurant's reviews (reply only via update)
DROP POLICY IF EXISTS "Owners can reply to reviews" ON public.reviews;
CREATE POLICY "Owners can reply to reviews"
ON public.reviews
FOR UPDATE
TO authenticated
USING (
  restaurant_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = reviews.restaurant_id AND r.owner_id = auth.uid()
  )
)
WITH CHECK (
  restaurant_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = reviews.restaurant_id AND r.owner_id = auth.uid()
  )
);

-- Rider can reply to their own delivered reviews
DROP POLICY IF EXISTS "Riders can reply to reviews" ON public.reviews;
CREATE POLICY "Riders can reply to reviews"
ON public.reviews
FOR UPDATE
TO authenticated
USING (rider_id IS NOT NULL AND rider_id = auth.uid())
WITH CHECK (rider_id IS NOT NULL AND rider_id = auth.uid());
