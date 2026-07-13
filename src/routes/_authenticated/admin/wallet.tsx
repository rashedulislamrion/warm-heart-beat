import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Wallet, Check, X, ArrowDownToLine } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/wallet")({
  head: () => ({ meta: [{ title: "ওয়ালেট — পায়রা Admin" }] }),
  component: AdminWalletPage,
});

type Topup = {
  id: string; user_id: string; amount: number; method: string | null;
  reference: string | null; created_at: string; status: string;
};
type Payout = {
  id: string; user_id: string; amount: number; method: string;
  account_number: string; created_at: string; status: string;
};

function AdminWalletPage() {
  const [topups, setTopups] = useState<Topup[] | null>(null);
  const [payouts, setPayouts] = useState<Payout[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<"topup" | "payout">("topup");

  async function refresh() {
    const [{ data: tu }, { data: po }] = await Promise.all([
      supabase.from("wallet_transactions" as any).select("*")
        .eq("kind", "topup").eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase.from("payout_requests" as any).select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
    ]);
    const tus = ((tu as unknown) as Topup[]) ?? [];
    const pos = ((po as unknown) as Payout[]) ?? [];
    setTopups(tus);
    setPayouts(pos);
    const ids = new Set<string>([...tus.map((t) => t.user_id), ...pos.map((p) => p.user_id)]);
    if (ids.size) {
      const { data } = await supabase.from("profiles").select("id, full_name, phone").in("id", [...ids]);
      const map: Record<string, string> = {};
      (data ?? []).forEach((p: any) => { map[p.id] = `${p.full_name ?? "—"} · ${p.phone ?? ""}`; });
      setNames(map);
    }
  }
  useEffect(() => { refresh(); }, []);

  async function approveTopup(id: string) {
    const { error } = await (supabase.rpc as any)("approve_topup", { _txn_id: id });
    if (error) return toast.error(error.message);
    toast.success("টপ-আপ অনুমোদিত");
    refresh();
  }
  async function rejectTopup(id: string) {
    const note = prompt("প্রত্যাখ্যানের কারণ:") ?? "";
    const { error } = await (supabase.rpc as any)("reject_topup", { _txn_id: id, _note: note });
    if (error) return toast.error(error.message);
    toast.success("প্রত্যাখ্যান করা হয়েছে");
    refresh();
  }
  async function approvePayout(id: string) {
    const note = prompt("Payout note (optional):") ?? "";
    const { error } = await (supabase.rpc as any)("approve_payout", { _req_id: id, _admin_note: note });
    if (error) return toast.error(error.message);
    toast.success("পেআউট অনুমোদিত");
    refresh();
  }
  async function rejectPayout(id: string) {
    const note = prompt("প্রত্যাখ্যানের কারণ:") ?? "";
    const { error } = await (supabase.rpc as any)("reject_payout", { _req_id: id, _admin_note: note });
    if (error) return toast.error(error.message);
    toast.success("প্রত্যাখ্যান করা হয়েছে");
    refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">ওয়ালেট</h1>
        <p className="text-sm text-muted-foreground">টপ-আপ ও পেআউট অনুমোদন</p>
      </div>

      <div className="inline-flex rounded-full bg-secondary p-1">
        {(["topup", "payout"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold ${
              tab === t ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground"
            }`}
          >
            {t === "topup" ? <Wallet className="h-4 w-4" /> : <ArrowDownToLine className="h-4 w-4" />}
            <span className="font-bangla">
              {t === "topup" ? `টপ-আপ (${topups?.length ?? 0})` : `পেআউট (${payouts?.length ?? 0})`}
            </span>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card">
        {tab === "topup" ? (
          topups === null ? (
            <div className="space-y-2 p-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : topups.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">অপেক্ষমাণ টপ-আপ নেই</div>
          ) : (
            <div className="divide-y divide-border">
              {topups.map((t) => (
                <div key={t.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold">{names[t.user_id] ?? t.user_id.slice(0, 8)}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {t.method} · TrxID: <span className="font-mono">{t.reference ?? "—"}</span> · {new Date(t.created_at).toLocaleString("bn-BD")}
                    </div>
                  </div>
                  <div className="text-lg font-extrabold text-primary">৳{t.amount}</div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => approveTopup(t.id)} className="rounded-lg bg-success text-success-foreground hover:bg-success/90">
                      <Check className="mr-1 h-4 w-4" />Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => rejectTopup(t.id)} className="rounded-lg">
                      <X className="mr-1 h-4 w-4" />Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : payouts === null ? (
          <div className="space-y-2 p-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : payouts.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">অপেক্ষমাণ পেআউট নেই</div>
        ) : (
          <div className="divide-y divide-border">
            {payouts.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">{names[p.user_id] ?? p.user_id.slice(0, 8)}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {p.method} · <span className="font-mono">{p.account_number}</span> · {new Date(p.created_at).toLocaleString("bn-BD")}
                  </div>
                </div>
                <div className="text-lg font-extrabold text-accent">৳{p.amount}</div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => approvePayout(p.id)} className="rounded-lg bg-success text-success-foreground hover:bg-success/90">
                    <Check className="mr-1 h-4 w-4" />Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => rejectPayout(p.id)} className="rounded-lg">
                    <X className="mr-1 h-4 w-4" />Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
