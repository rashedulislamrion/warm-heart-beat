
DROP POLICY IF EXISTS "parties send messages" ON public.order_messages;
CREATE POLICY "parties send messages" ON public.order_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      public.is_order_party(order_type, order_id, auth.uid())
      OR public.has_role(auth.uid(), 'admin')
    )
  );
