
-- Enum for food order status
CREATE TYPE public.food_order_status AS ENUM ('pending','confirmed','preparing','picked_up','delivered','cancelled');

-- Restaurants
CREATE TABLE public.restaurants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  image_url text,
  cuisine text,
  rating numeric(2,1) NOT NULL DEFAULT 4.5,
  delivery_time_min int NOT NULL DEFAULT 30,
  min_order int NOT NULL DEFAULT 0,
  is_open boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.restaurants TO anon, authenticated;
GRANT ALL ON public.restaurants TO service_role;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view restaurants" ON public.restaurants FOR SELECT USING (true);
CREATE POLICY "Admins manage restaurants" ON public.restaurants FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_restaurants_updated BEFORE UPDATE ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Menu items
CREATE TABLE public.menu_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price int NOT NULL,
  image_url text,
  category text,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_menu_items_restaurant ON public.menu_items(restaurant_id);
GRANT SELECT ON public.menu_items TO anon, authenticated;
GRANT ALL ON public.menu_items TO service_role;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view menu items" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Admins manage menu items" ON public.menu_items FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_menu_items_updated BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Food orders
CREATE TABLE public.food_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_code text NOT NULL DEFAULT ('PYF-' || upper(substring(gen_random_uuid()::text, 1, 6))),
  user_id uuid NOT NULL,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id),
  items jsonb NOT NULL,
  subtotal int NOT NULL,
  delivery_charge int NOT NULL,
  total int NOT NULL,
  receiver_name text NOT NULL,
  receiver_phone text NOT NULL,
  receiver_hall text NOT NULL,
  receiver_block_room text,
  receiver_landmark text,
  note text,
  status public.food_order_status NOT NULL DEFAULT 'pending',
  rider_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_food_orders_user ON public.food_orders(user_id);
GRANT SELECT, INSERT, UPDATE ON public.food_orders TO authenticated;
GRANT ALL ON public.food_orders TO service_role;
ALTER TABLE public.food_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own food orders" ON public.food_orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own food orders" ON public.food_orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all food orders" ON public.food_orders FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update all food orders" ON public.food_orders FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Riders view assigned food orders" ON public.food_orders FOR SELECT TO authenticated USING (auth.uid() = rider_id);
CREATE TRIGGER trg_food_orders_updated BEFORE UPDATE ON public.food_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed a few restaurants and menu items
INSERT INTO public.restaurants (name, description, image_url, cuisine, rating, delivery_time_min, min_order) VALUES
  ('Campus Kitchen', 'Homestyle Bangladeshi meals', 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800', 'Bangladeshi', 4.7, 25, 100),
  ('Biriyani House', 'Authentic Kacchi & Tehari', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800', 'Biriyani', 4.8, 35, 150),
  ('Burger Bros', 'Juicy smash burgers & fries', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800', 'Fast Food', 4.5, 20, 120),
  ('Tea Corner', 'Cha, snacks & singaras', 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=800', 'Snacks', 4.6, 15, 50);

INSERT INTO public.menu_items (restaurant_id, name, description, price, image_url, category)
SELECT r.id, m.name, m.description, m.price, m.image_url, m.category FROM public.restaurants r
CROSS JOIN LATERAL (VALUES
  ('Chicken Bhuna + Rice', 'Spicy chicken bhuna with steamed rice', 140, 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600', 'Meals'),
  ('Beef Tehari', 'Fragrant beef tehari', 180, 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600', 'Meals'),
  ('Vegetable Khichuri', 'Comfort khichuri with egg', 100, 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600', 'Meals')
) AS m(name, description, price, image_url, category)
WHERE r.name = 'Campus Kitchen';

INSERT INTO public.menu_items (restaurant_id, name, description, price, image_url, category)
SELECT r.id, m.name, m.description, m.price, m.image_url, m.category FROM public.restaurants r
CROSS JOIN LATERAL (VALUES
  ('Kacchi Biriyani', 'Mutton kacchi with borhani', 280, 'https://images.unsplash.com/photo-1633945274309-2c16c974e0b0?w=600', 'Biriyani'),
  ('Chicken Tehari', 'Classic chicken tehari', 200, 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600', 'Biriyani'),
  ('Borhani', 'Refreshing spiced yogurt drink', 60, 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600', 'Drinks')
) AS m(name, description, price, image_url, category)
WHERE r.name = 'Biriyani House';

INSERT INTO public.menu_items (restaurant_id, name, description, price, image_url, category)
SELECT r.id, m.name, m.description, m.price, m.image_url, m.category FROM public.restaurants r
CROSS JOIN LATERAL (VALUES
  ('Classic Beef Burger', 'Smashed beef patty, cheese, house sauce', 220, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600', 'Burgers'),
  ('Chicken Burger', 'Crispy chicken, slaw, mayo', 180, 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600', 'Burgers'),
  ('French Fries', 'Crispy salted fries', 90, 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600', 'Sides')
) AS m(name, description, price, image_url, category)
WHERE r.name = 'Burger Bros';

INSERT INTO public.menu_items (restaurant_id, name, description, price, image_url, category)
SELECT r.id, m.name, m.description, m.price, m.image_url, m.category FROM public.restaurants r
CROSS JOIN LATERAL (VALUES
  ('Malai Cha', 'Rich creamy tea', 40, 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=600', 'Drinks'),
  ('Singara (4 pcs)', 'Crispy potato singaras', 40, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600', 'Snacks'),
  ('Chicken Roll', 'Spicy chicken paratha roll', 90, 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=600', 'Snacks')
) AS m(name, description, price, image_url, category)
WHERE r.name = 'Tea Corner';
