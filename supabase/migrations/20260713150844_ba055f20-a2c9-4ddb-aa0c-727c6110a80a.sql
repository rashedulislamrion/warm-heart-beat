
-- Roles enum + table (separate table to avoid privilege escalation)
CREATE TYPE public.app_role AS ENUM ('admin', 'rider', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  hall TEXT,
  block_room TEXT,
  avatar_url TEXT,
  profile_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.phone
  )
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Parcel status enum
CREATE TYPE public.parcel_status AS ENUM (
  'pending', 'rider_assigned', 'picked_up', 'delivered', 'cancelled'
);

CREATE TYPE public.parcel_size AS ENUM ('small', 'medium', 'large');
CREATE TYPE public.parcel_item_type AS ENUM (
  'document', 'medicine', 'grocery', 'clothes', 'electronics', 'other'
);

-- Parcels
CREATE TABLE public.parcels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code TEXT NOT NULL UNIQUE DEFAULT ('PYR-' || upper(substring(gen_random_uuid()::text, 1, 6))),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  sender_name TEXT NOT NULL,
  sender_phone TEXT NOT NULL,
  sender_hall TEXT NOT NULL,
  sender_block_room TEXT,
  sender_landmark TEXT,

  receiver_name TEXT NOT NULL,
  receiver_phone TEXT NOT NULL,
  receiver_hall TEXT NOT NULL,
  receiver_block_room TEXT,
  receiver_landmark TEXT,

  item_type parcel_item_type NOT NULL,
  size parcel_size NOT NULL,
  description TEXT,
  photo_url TEXT,

  delivery_charge INTEGER NOT NULL,
  status parcel_status NOT NULL DEFAULT 'pending',
  rider_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.parcels TO authenticated;
GRANT ALL ON public.parcels TO service_role;
ALTER TABLE public.parcels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own parcels" ON public.parcels
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create parcels" ON public.parcels
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Riders can view assigned parcels" ON public.parcels
  FOR SELECT TO authenticated USING (auth.uid() = rider_id);
CREATE POLICY "Admins can view all parcels" ON public.parcels
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all parcels" ON public.parcels
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER parcels_set_updated_at
  BEFORE UPDATE ON public.parcels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_parcels_user_id ON public.parcels(user_id);
CREATE INDEX idx_parcels_status ON public.parcels(status);
CREATE INDEX idx_parcels_order_code ON public.parcels(order_code);

-- Realtime for admin dashboard (phase 2)
ALTER PUBLICATION supabase_realtime ADD TABLE public.parcels;
