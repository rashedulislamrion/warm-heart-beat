
-- Clean out any orphan rows before adding NOT NULL user_id
DELETE FROM public.rider_applications WHERE true;

ALTER TABLE public.rider_applications
  ADD COLUMN user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX rider_applications_user_id_key ON public.rider_applications(user_id);

-- Replace open insert policy
DROP POLICY IF EXISTS "Anyone can submit rider application" ON public.rider_applications;

CREATE POLICY "Users insert own rider application"
  ON public.rider_applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own rider application"
  ON public.rider_applications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Grant rider role on approval
CREATE OR REPLACE FUNCTION public.grant_rider_role_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'rider'::app_role)
    ON CONFLICT DO NOTHING;
  END IF;
  IF NEW.status <> 'approved' AND OLD.status = 'approved' THEN
    DELETE FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'rider'::app_role;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grant_rider_role ON public.rider_applications;
CREATE TRIGGER trg_grant_rider_role
  AFTER UPDATE OF status ON public.rider_applications
  FOR EACH ROW EXECUTE FUNCTION public.grant_rider_role_on_approval();
