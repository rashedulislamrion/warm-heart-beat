CREATE TABLE public.rider_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL,
  student_id text,
  hall text,
  department text,
  semester text,
  availability text,
  has_bike boolean NOT NULL DEFAULT false,
  motivation text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rider_applications TO authenticated;
GRANT INSERT ON public.rider_applications TO anon;
GRANT ALL ON public.rider_applications TO service_role;

ALTER TABLE public.rider_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit rider application"
  ON public.rider_applications FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view rider applications"
  ON public.rider_applications FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update rider applications"
  ON public.rider_applications FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete rider applications"
  ON public.rider_applications FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER rider_applications_updated_at
  BEFORE UPDATE ON public.rider_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();