
CREATE OR REPLACE FUNCTION public.track_order(_code text)
RETURNS TABLE (
  order_code text,
  order_type text,
  status text,
  receiver_hall text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT order_code, 'parcel'::text, status::text, receiver_hall, created_at, updated_at
    FROM public.parcels WHERE order_code = _code
  UNION ALL
  SELECT order_code, 'food'::text, status::text, receiver_hall, created_at, updated_at
    FROM public.food_orders WHERE order_code = _code
$$;

GRANT EXECUTE ON FUNCTION public.track_order(text) TO anon, authenticated;
