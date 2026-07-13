import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, ArrowLeft, Plus, ArrowDownToLine, Clock, Check, X } from "lucide-react";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({ meta: [{ title: "ওয়ালেট — পায়রা" }] }),
  component: WalletPage,
});

type Txn = {
  id: string; amount: number; kind: string; status: string;
  method: string | null; reference: string | null; note: string | null;
  order_type: string | null; created_at: string;
};
type Payout = {
  id: string; amount: number; method: string; account_number: string;
  status: string; admin_note: string | null; created_at: string;
};

const MERCHANT = { bkash: "01700-000000", nagad: "01800-000000" };

function WalletPage() {
  const { user } = Route.useRouteContext();
  const [balance, setBalance] = useState<number | null>(null);
  const [txns, setTxns] = useState<Txn[] | null>(null);
  const [payouts, setPayouts] = useState<Payout[] | null>(null);
  const [isRider, setIsRider] = useState(false);

  // topup form
  const [tuMethod, setTuMethod] = useState<"bkash" | "nagad">("bkash");
  const [tuAmount, setTuAmount] = useState("");
  const [tuRef, setTuRef] = useState("");
  const [tuBusy, setTuBusy] = useState(false);

  // payout form
  const [poMethod, setPoMethod] = useState<"bkash" | "nagad">("bkash");
  const [poAmount, setPoAmount] = useState("");
  const [poAccount, setPoAccount] = useState("");
  const [poBusy, setPoBusy] = useState(false);

  async function refresh() {
    const [{ data: bal }, { data: tx }, { data: po }] = await Promise.all([
      (supabase.rpc as any)("my_wallet_balance"),
      supabase.from("wallet_transactions" as any).select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("payout_requests" as any).select("*").order("created_at", { ascending: false }).limit(20),
    ]);
    setBalance(typeof bal === "number" ? bal : 0);
    setTxns(((tx as unknown) as Txn[]) ?? []);
    setPayouts(((po as unknown) as Payout[]) ?? []);
  }

  useEffect(() => {
    refresh();
    supabase.rpc("has_role", { _user_id: user.id, _role: "rider" })
      .then(({ data }) => setIsRider(Boolean(data)));
  }, [user.id]);

  async function submitTopup(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(tuAmount);
    if (!amt || amt <= 0) return toast.error("সঠিক পরিমাণ দিন");
    if (!tuRef.trim()) return toast.error("লেনদেনের TrxID দিন");
    setTuBusy(true);
    const { error } = await (supabase.rpc as any)("request_topup", {
      _amount: amt, _method: tuMethod, _reference: tuRef.trim(),
    });
    setTuBusy(false);
    if (error) return toast.error(error.message);
    toast.success("টপ-আপ অনুরোধ পাঠানো হয়েছে, যাচাইয়ের অপেক্ষায়");
    setTuAmount(""); setTuRef("");
    refresh();
  }

  async function submitPayout(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(poAmount);
    if (!amt || amt <= 0) return toast.error("সঠিক পরিমাণ দিন");
    if (poAccount.trim().length < 6) return toast.error("সঠিক নম্বর দিন");
    setPoBusy(true);
    const { error } = await (supabase.rpc as any)("request_payout", {
      _amount: amt, _method: poMethod, _account_number: poAccount.trim(),
    });
    setPoBusy(false);
    if (error) {
      const map: Record<string, string> = {
        insufficient_balance: "ব্যালেন্স যথেষ্ট নয়",
        not_a_rider: "শুধু রাইডার",
      };
      return toast.error(map[error.message] ?? error.message);
    }
    toast.success("পেআউট অনুরোধ পাঠানো হয়েছে");
    setPoAmount(""); setPoAccount("");
    refresh();
  }

  return (
    <div className="min-h-screen gradient-hero pb-16">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 pt-6">
        <Link to="/profile"><ArrowLeft className="h-5 w-5" /></Link>
        <Logo />
        <div className="w-5" />
      </header>

      <div className="mx-auto mt-6 max-w-md space-y-4 px-4">
        <div className="animate-fade-up rounded-3xl gradient-primary p-6 text-primary-foreground shadow-warm">
          <div className="flex items-center gap-2 text-xs font-semibold opacity-80">
            <Wallet className="h-4 w-4" />
            <span className="font-bangla">আপনার ব্যালেন্স</span>
          </div>
          {balance === null ? (
            <Skeleton className="mt-3 h-10 w-40 rounded-lg bg-white/20" />
          ) : (
            <div className="mt-2 text-4xl font-extrabold">৳{balance.toLocaleString("en-US")}</div>
          )}
        </div>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-3 flex items-center gap-2 font-bold">
            <Plus className="h-4 w-4 text-primary" />
            <span className="font-bangla">টপ-আপ করুন</span>
          </h2>
          <div className="mb-3 rounded-xl bg-secondary/60 p-3 text-xs">
            <div className="font-bangla text-muted-foreground">নিচের নম্বরে Send Money করে TrxID দিন:</div>
            <div className="mt-1 font-semibold">bKash: {MERCHANT.bkash}</div>
            <div className="font-semibold">Nagad: {MERCHANT.nagad}</div>
          </div>
          <form onSubmit={submitTopup} className="space-y-3">
            <div className="inline-flex rounded-full bg-secondary p-1">
              {(["bkash", "nagad"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setTuMethod(m)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    tuMethod === m ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground"
                  }`}
                >{m === "bkash" ? "bKash" : "Nagad"}</button>
              ))}
            </div>
            <Input inputMode="numeric" placeholder="পরিমাণ (৳)" value={tuAmount} onChange={(e) => setTuAmount(e.target.value)} />
            <Input placeholder="TrxID" value={tuRef} onChange={(e) => setTuRef(e.target.value)} />
            <Button type="submit" disabled={tuBusy} className="w-full rounded-xl gradient-primary text-primary-foreground">
              <span className="font-bangla">{tuBusy ? "পাঠানো হচ্ছে..." : "অনুরোধ পাঠান"}</span>
            </Button>
          </form>
        </section>

        {isRider && (
          <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="mb-3 flex items-center gap-2 font-bold">
              <ArrowDownToLine className="h-4 w-4 text-accent" />
              <span className="font-bangla">উইথড্র (রাইডার)</span>
            </h2>
            <form onSubmit={submitPayout} className="space-y-3">
              <div className="inline-flex rounded-full bg-secondary p-1">
                {(["bkash", "nagad"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPoMethod(m)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      poMethod === m ? "bg-accent text-accent-foreground shadow-soft" : "text-muted-foreground"
                    }`}
                  >{m === "bkash" ? "bKash" : "Nagad"}</button>
                ))}
              </div>
              <Input inputMode="numeric" placeholder="পরিমাণ (৳)" value={poAmount} onChange={(e) => setPoAmount(e.target.value)} />
              <Input placeholder={`${poMethod === "bkash" ? "bKash" : "Nagad"} নম্বর`} value={poAccount} onChange={(e) => setPoAccount(e.target.value)} />
              <Button type="submit" disabled={poBusy} className="w-full rounded-xl gradient-accent text-accent-foreground">
                <span className="font-bangla">{poBusy ? "পাঠানো হচ্ছে..." : "উইথড্র চান"}</span>
              </Button>
            </form>
          </section>
        )}

        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-3 font-bold font-bangla">লেনদেনের ইতিহাস</h2>
          {txns === null ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : txns.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">কোনো লেনদেন নেই</p>
          ) : (
            <ul className="divide-y divide-border">
              {txns.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <KindLabel kind={t.kind} />
                      <StatusBadge status={t.status} />
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {t.method ?? ""}{t.reference ? ` · ${t.reference}` : ""}{t.note ? ` · ${t.note}` : ""} · {new Date(t.created_at).toLocaleString("bn-BD")}
                    </div>
                  </div>
                  <div className={`text-sm font-bold ${t.amount >= 0 ? "text-success" : "text-destructive"}`}>
                    {t.amount >= 0 ? "+" : ""}৳{t.amount}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {isRider && (
          <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="mb-3 font-bold font-bangla">পেআউট অনুরোধ</h2>
            {payouts === null ? (
              <Skeleton className="h-14 w-full" />
            ) : payouts.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">কোনো অনুরোধ নেই</p>
            ) : (
              <ul className="divide-y divide-border">
                {payouts.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">৳{p.amount} · {p.method}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {p.account_number} · {new Date(p.created_at).toLocaleString("bn-BD")}
                        {p.admin_note ? ` · ${p.admin_note}` : ""}
                      </div>
                    </div>
                    <StatusBadge status={p.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function KindLabel({ kind }: { kind: string }) {
  const map: Record<string, string> = {
    topup: "টপ-আপ", payment: "পেমেন্ট", refund: "রিফান্ড", payout: "উইথড্র", adjust: "সমন্বয়",
  };
  return <span className="font-bangla">{map[kind] ?? kind}</span>;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved")
    return <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success"><Check className="h-3 w-3" />approved</span>;
  if (status === "rejected")
    return <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive"><X className="h-3 w-3" />rejected</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground"><Clock className="h-3 w-3" />pending</span>;
}
