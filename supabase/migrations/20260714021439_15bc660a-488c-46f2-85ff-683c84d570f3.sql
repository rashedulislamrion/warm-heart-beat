ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS online_at timestamptz;

CREATE OR REPLACE FUNCTION public.online_riders_count()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'rider'::app_role
  WHERE p.is_online = true;
$$;

GRANT EXECUTE ON FUNCTION public.online_riders_count() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_rider_online(_online boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT public.has_role(auth.uid(), 'rider'::app_role) THEN RAISE EXCEPTION 'not_a_rider'; END IF;
  UPDATE public.profiles
    SET is_online = _online,
        online_at = CASE WHEN _online THEN now() ELSE online_at END
    WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_rider_online(boolean) TO authenticated;