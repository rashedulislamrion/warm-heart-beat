
-- Parcels: riders can view unassigned pending orders
CREATE POLICY "Riders view unassigned parcels"
ON public.parcels FOR SELECT TO authenticated
USING (
  rider_id IS NULL
  AND status = 'pending'
  AND public.has_role(auth.uid(), 'rider')
);

-- Parcels: riders can update rows they own OR claim unassigned rows
CREATE POLICY "Riders update own or claim parcels"
ON public.parcels FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'rider')
  AND (rider_id = auth.uid() OR rider_id IS NULL)
)
WITH CHECK (
  public.has_role(auth.uid(), 'rider')
  AND rider_id = auth.uid()
);

-- Food orders: riders can view unassigned confirmed/preparing orders
CREATE POLICY "Riders view unassigned food orders"
ON public.food_orders FOR SELECT TO authenticated
USING (
  rider_id IS NULL
  AND status IN ('confirmed', 'preparing')
  AND public.has_role(auth.uid(), 'rider')
);

-- Food orders: riders can update rows they own OR claim unassigned rows
CREATE POLICY "Riders update own or claim food orders"
ON public.food_orders FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'rider')
  AND (rider_id = auth.uid() OR rider_id IS NULL)
)
WITH CHECK (
  public.has_role(auth.uid(), 'rider')
  AND rider_id = auth.uid()
);
