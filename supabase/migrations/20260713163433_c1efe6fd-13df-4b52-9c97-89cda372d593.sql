ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;
ALTER TABLE public.food_orders ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;
CREATE INDEX IF NOT EXISTS idx_parcels_scheduled_for ON public.parcels(scheduled_for) WHERE scheduled_for IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_food_orders_scheduled_for ON public.food_orders(scheduled_for) WHERE scheduled_for IS NOT NULL;