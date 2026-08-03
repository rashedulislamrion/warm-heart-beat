import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { FloatingActions } from "@/components/FloatingActions";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Copy, Share2, Gift, Wallet, Users, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/invite")({
  head: () => ({ meta: [{ title: "বন্ধু আনুন — DearDash" }] }),
  component: InvitePage,
});

type LedgerRow = { id: string; amount: number; reason: string; created_at: string };

const REASON_LABEL: Record<string, string> = {
  referral_signup_bonus: "সাইনআপ বোনাস",
  referral_reward: "রেফারেল পুরস্কার",
  redeemed_food: "খাবার অর্ডারে ব্যবহৃত",
  redeemed_parcel: "পার্সেলে ব্যবহৃত",
};

function InvitePage() {
  const { user } = Route.useRouteContext();
  const [code, setCode] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [ledger, setLedger] = useState<LedgerRow[] | null>(null);
  const [invited, setInvited] = useState<number>(0);

  useEffect(() => {
    supabase.from("profiles").select("referral_code").eq("id", user.id).maybeSingle()
      .then(({ data }) => setCode((data as any)?.referral_code ?? null));
    (supabase.rpc as any)("my_credit_balance").then(({ data }: { data: number | null }) => {
      setBalance(Number(data ?? 0));
    });
    supabase.from("user_credits" as any)
      .select("id, amount, reason, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setLedger(((data ?? []) as unknown) as LedgerRow[]));
    supabase.from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("referred_by", user.id)
      .then(({ count }) => setInvited(count ?? 0));
  }, [user.id]);

  const shareUrl = code ? `${typeof window !== "undefined" ? window.location.origin : ""}/auth?ref=${code}` : "";

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} কপি হয়েছে`);
    } catch {
      toast.error("কপি ব্যর্থ");
    }
  }

  async function share() {
    if (!code) return;
    const text = `DearDash-এ যোগ দিন — আমার রেফারেল কোড ব্যবহার করুন: ${code}\n${shareUrl}`;
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try { await (navigator as any).share({ title: "DearDash", text, url: shareUrl }); } catch {}
    } else {
      copy(text, "লিংক");
    }
  }

  return (
    <div className="min-h-screen gradient-hero pb-24">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 pt-6">
        <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
        <Logo />
        <div className="w-5" />
      </header>

      <div className="mx-auto mt-4 max-w-2xl space-y-5 px-4">
        <div className="animate-fade-up relative overflow-hidden rounded-3xl gradient-primary p-6 text-primary-foreground shadow-soft">
          <Sparkles className="absolute right-4 top-4 h-8 w-8 opacity-20" />
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold">
            <Gift className="h-3 w-3" />
            <span className="font-bangla">বন্ধুকে আনুন, দু'জনেই পান ৳৫০</span>
          </div>
          <h1 className="mt-3 font-bangla text-2xl font-extrabold leading-tight">
            আপনার রেফারেল কোড
          </h1>
          {code === null ? (
            <Skeleton className="mt-3 h-14 rounded-2xl bg-white/20" />
          ) : (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-white/15 p-4 backdrop-blur">
              <div className="font-mono text-3xl font-black tracking-widest">{code}</div>
              <button
                onClick={() => copy(code, "কোড")}
                className="inline-flex items-center gap-1.5 rounded-full bg-white text-primary px-3 py-1.5 text-xs font-bold shadow-soft"
              >
                <Copy className="h-3.5 w-3.5" /> কপি
              </button>
            </div>
          )}
          {code && (
            <button
              onClick={share}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white/20 py-3 text-sm font-bold backdrop-blur transition-colors hover:bg-white/25"
            >
              <Share2 className="h-4 w-4" />
              <span className="font-bangla">বন্ধুদের সাথে শেয়ার করুন</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Wallet className="h-3.5 w-3.5" />
              <span className="font-bangla">ক্রেডিট ব্যালেন্স</span>
            </div>
            <div className="mt-2 text-3xl font-extrabold text-primary">
              {balance === null ? <Skeleton className="h-8 w-20" /> : `৳${balance}`}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span className="font-bangla">বন্ধু এনেছেন</span>
            </div>
            <div className="mt-2 text-3xl font-extrabold text-accent">{invited}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-3 font-bangla text-sm font-bold uppercase tracking-wider text-muted-foreground">
            কীভাবে কাজ করে
          </h2>
          <ol className="space-y-2 text-sm">
            <Step n={1} text="আপনার কোড বন্ধুকে দিন" />
            <Step n={2} text="তারা সাইনআপে কোড লিখলে যুক্ত হবে" />
            <Step n={3} text="তাদের প্রথম অর্ডারে দু'জনেই পাবেন ৳৫০ ক্রেডিট" />
          </ol>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-3 font-bangla text-sm font-bold uppercase tracking-wider text-muted-foreground">
            লেনদেন
          </h2>
          {ledger === null ? (
            <div className="space-y-2">{[0,1,2].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : ledger.length === 0 ? (
            <p className="py-6 text-center font-bangla text-sm text-muted-foreground">
              এখনও কোনো ক্রেডিট নেই
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {ledger.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-bangla text-sm font-semibold">
                      {REASON_LABEL[r.reason] ?? r.reason}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("bn-BD")}
                    </div>
                  </div>
                  <div className={`text-sm font-extrabold ${r.amount > 0 ? "text-success" : "text-destructive"}`}>
                    {r.amount > 0 ? `+৳${r.amount}` : `−৳${Math.abs(r.amount)}`}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <FloatingActions />
      <MobileBottomNav />
    </div>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {n}
      </span>
      <span className="font-bangla text-sm">{text}</span>
    </li>
  );
}
