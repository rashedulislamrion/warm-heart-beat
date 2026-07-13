
-- Wallet transactions ledger
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  kind text NOT NULL CHECK (kind IN ('topup','payment','refund','payout','adjust')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  method text CHECK (method IN ('bkash','nagad','wallet','admin')),
  reference text,
  order_type text CHECK (order_type IN ('parcel','food')),
  order_id uuid,
  note text,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallet_tx_owner_select" ON public.wallet_transactions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "wallet_tx_admin_select" ON public.wallet_transactions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "wallet_tx_admin_update" ON public.wallet_transactions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX wallet_tx_user_idx ON public.wallet_transactions(user_id, created_at DESC);
CREATE INDEX wallet_tx_status_idx ON public.wallet_transactions(status, created_at DESC);

CREATE TRIGGER wallet_tx_updated BEFORE UPDATE ON public.wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Payout requests
CREATE TABLE public.payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL CHECK (amount > 0),
  method text NOT NULL CHECK (method IN ('bkash','nagad')),
  account_number text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  note text,
  admin_note text,
  processed_by uuid REFERENCES auth.users(id),
  processed_at timestamptz,
  txn_id uuid REFERENCES public.wallet_transactions(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.payout_requests TO authenticated;
GRANT ALL ON public.payout_requests TO service_role;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payout_owner_select" ON public.payout_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "payout_admin_select" ON public.payout_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX payout_user_idx ON public.payout_requests(user_id, created_at DESC);
CREATE INDEX payout_status_idx ON public.payout_requests(status, created_at DESC);

CREATE TRIGGER payout_updated BEFORE UPDATE ON public.payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Balance function
CREATE OR REPLACE FUNCTION public.my_wallet_balance()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(amount)::int, 0) FROM public.wallet_transactions
  WHERE user_id = auth.uid() AND status = 'approved'
$$;

-- Request top-up (customer)
CREATE OR REPLACE FUNCTION public.request_topup(_amount integer, _method text, _reference text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
  IF _method NOT IN ('bkash','nagad') THEN RAISE EXCEPTION 'invalid_method'; END IF;
  INSERT INTO public.wallet_transactions (user_id, amount, kind, status, method, reference)
    VALUES (auth.uid(), _amount, 'topup', 'pending', _method, _reference)
    RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

-- Approve/reject top-up (admin)
CREATE OR REPLACE FUNCTION public.approve_topup(_txn_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.wallet_transactions
    SET status = 'approved', approved_by = auth.uid(), approved_at = now()
    WHERE id = _txn_id AND status = 'pending' AND kind = 'topup';
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found_or_processed'; END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.reject_topup(_txn_id uuid, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.wallet_transactions
    SET status = 'rejected', approved_by = auth.uid(), approved_at = now(), note = _note
    WHERE id = _txn_id AND status = 'pending' AND kind = 'topup';
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found_or_processed'; END IF;
END; $$;

-- Request payout (rider)
CREATE OR REPLACE FUNCTION public.request_payout(_amount integer, _method text, _account_number text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_bal int; v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT public.has_role(auth.uid(), 'rider') THEN RAISE EXCEPTION 'not_a_rider'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
  IF _method NOT IN ('bkash','nagad') THEN RAISE EXCEPTION 'invalid_method'; END IF;
  IF _account_number IS NULL OR length(trim(_account_number)) < 6 THEN RAISE EXCEPTION 'invalid_account'; END IF;
  SELECT COALESCE(SUM(amount)::int, 0) INTO v_bal
    FROM public.wallet_transactions WHERE user_id = auth.uid() AND status = 'approved';
  IF v_bal < _amount THEN RAISE EXCEPTION 'insufficient_balance'; END IF;
  INSERT INTO public.payout_requests (user_id, amount, method, account_number)
    VALUES (auth.uid(), _amount, _method, trim(_account_number))
    RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

-- Approve/reject payout (admin)
CREATE OR REPLACE FUNCTION public.approve_payout(_req_id uuid, _admin_note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.payout_requests; v_txn uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO r FROM public.payout_requests WHERE id = _req_id AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found_or_processed'; END IF;
  INSERT INTO public.wallet_transactions (user_id, amount, kind, status, method, reference, approved_by, approved_at)
    VALUES (r.user_id, -r.amount, 'payout', 'approved', r.method, r.account_number, auth.uid(), now())
    RETURNING id INTO v_txn;
  UPDATE public.payout_requests
    SET status = 'approved', admin_note = _admin_note, processed_by = auth.uid(), processed_at = now(), txn_id = v_txn
    WHERE id = _req_id;
END; $$;

CREATE OR REPLACE FUNCTION public.reject_payout(_req_id uuid, _admin_note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.payout_requests
    SET status = 'rejected', admin_note = _admin_note, processed_by = auth.uid(), processed_at = now()
    WHERE id = _req_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found_or_processed'; END IF;
END; $$;

-- Pay with wallet (for orders)
CREATE OR REPLACE FUNCTION public.pay_with_wallet(_order_type text, _order_id uuid, _amount integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_bal int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RETURN 0; END IF;
  IF _order_type NOT IN ('parcel','food') THEN RAISE EXCEPTION 'invalid_order_type'; END IF;
  SELECT COALESCE(SUM(amount)::int, 0) INTO v_bal
    FROM public.wallet_transactions WHERE user_id = auth.uid() AND status = 'approved';
  IF v_bal < _amount THEN RAISE EXCEPTION 'insufficient_balance'; END IF;
  INSERT INTO public.wallet_transactions (user_id, amount, kind, status, method, order_type, order_id, approved_by, approved_at)
    VALUES (auth.uid(), -_amount, 'payment', 'approved', 'wallet', _order_type, _order_id, auth.uid(), now());
  RETURN _amount;
END; $$;
