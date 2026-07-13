
ALTER TABLE public.parcels REPLICA IDENTITY FULL;
ALTER TABLE public.food_orders REPLICA IDENTITY FULL;
ALTER TABLE public.restaurants REPLICA IDENTITY FULL;
ALTER TABLE public.menu_items REPLICA IDENTITY FULL;

DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.food_orders; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurants; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

GRANT DELETE, INSERT, UPDATE ON public.restaurants TO authenticated;
GRANT DELETE, INSERT, UPDATE ON public.menu_items TO authenticated;
GRANT DELETE ON public.food_orders TO authenticated;

DROP POLICY IF EXISTS "Admins delete food orders" ON public.food_orders;
CREATE POLICY "Admins delete food orders" ON public.food_orders FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));
