import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ArrowLeft, Search, Package, UtensilsCrossed, Loader2, CheckCircle2, Clock, Truck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { MobileBottomNav } from "@/components/MobileBottomNav";

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { title: "Track Your Order — DearDash" },
      { name: "description", content: "Track your DearDash food or parcel delivery in real time with your order code." },
      { property: "og:title", content: "Track Your Order — DearDash" },
      { property: "og:description", content: "Track your DearDash food or parcel delivery in real time with your order code." },
      { property: "og:url", content: "https://warm-heart-beat.lovable.app/track" },
    ],
    links: [{ rel: "canonical", href: "https://warm-heart-beat.lovable.app/track" }],
  }),
  component: TrackPage,
});

type Result = {
  order_code: string;
  order_type: "parcel" | "food";
  status: string;
  receiver_hall: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_META: Record<string, { label: string; Icon: typeof Clock; tone: string }> = {
  pending: { label: "অপেক্ষমান", Icon: Clock, tone: "bg-muted text-muted-foreground" },
  confirmed: { label: "নিশ্চিত", Icon: CheckCircle2, tone: "bg-primary/10 text-primary" },
  rider_assigned: { label: "রাইডার অ্যাসাইনড", Icon: Truck, tone: "bg-primary/10 text-primary" },
  preparing: { label: "প্রস্তুত হচ্ছে", Icon: Loader2, tone: "bg-accent/10 text-accent" },
  picked_up: { label: "পিকআপ হয়েছে", Icon: Truck, tone: "bg-accent/10 text-accent" },
  delivered: { label: "ডেলিভারড", Icon: CheckCircle2, tone: "bg-success/10 text-success" },
  cancelled: { label: "বাতিল", Icon: XCircle, tone: "bg-destructive/10 text-destructive" },
};

function TrackPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [notFound, setNotFound] = useState(false);

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (!c) return;
    setLoading(true);
    setResult(null);
    setNotFound(false);
    const { data, error } = await (supabase.rpc as any)("track_order", { _code: c });
    setLoading(false);
    if (error) {
      toast.error("সার্ভার এরর, আবার চেষ্টা করুন");
      return;
    }
    const rows = (data ?? []) as Result[];
    if (!rows.length) {
      setNotFound(true);
      return;
    }
    setResult(rows[0]);
  }

  return (
    <div className="min-h-screen gradient-hero pb-24 md:pb-8">
      <header className="mx-auto flex max-w-3xl items-center gap-3 px-4 pt-6 md:px-8">
        <Link to="/" className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card/80 backdrop-blur">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Logo />
      </header>

      <section className="mx-auto mt-8 max-w-3xl px-4 md:px-8">
        <h1 className="font-bangla text-3xl font-extrabold md:text-4xl">অর্ডার ট্র্যাক করুন</h1>
        <p className="mt-2 font-bangla text-muted-foreground">
          অর্ডার কোড লিখুন (উদাহরণ: <span className="font-mono">PYR-XXXX</span>)
        </p>

        <form onSubmit={onSearch} className="mt-6 flex gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="PYR-1234"
            className="h-12 flex-1 rounded-xl text-base font-mono uppercase"
            autoFocus
          />
          <Button type="submit" disabled={loading} className="h-12 rounded-xl px-6">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span className="ml-2 font-bangla">খুঁজুন</span>
          </Button>
        </form>

        {notFound && (
          <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-center">
            <XCircle className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-bangla font-bold">কোনো অর্ডার পাওয়া যায়নি</p>
            <p className="mt-1 text-sm text-muted-foreground">অর্ডার কোড আবার যাচাই করুন</p>
          </div>
        )}

        {result && <TrackResult result={result} />}
      </section>

      <MobileBottomNav />
    </div>
  );
}

function TrackResult({ result }: { result: Result }) {
  const meta = STATUS_META[result.status] ?? STATUS_META.pending;
  const { Icon } = meta;
  const TypeIcon = result.order_type === "parcel" ? Package : UtensilsCrossed;
  const timeline = result.order_type === "parcel"
    ? ["pending", "rider_assigned", "picked_up", "delivered"]
    : ["pending", "confirmed", "preparing", "picked_up", "delivered"];
  const currentIdx = timeline.indexOf(result.status);
  const cancelled = result.status === "cancelled";

  return (
    <div className="animate-fade-up mt-8 overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
      <div className="flex items-center gap-3 border-b border-border p-5">
        <div className="grid h-11 w-11 place-items-center rounded-xl gradient-primary text-primary-foreground">
          <TypeIcon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="font-mono text-sm font-bold">{result.order_code}</div>
          <div className="font-bangla text-xs text-muted-foreground">
            {result.order_type === "parcel" ? "পার্সেল ডেলিভারি" : "খাবার অর্ডার"}
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${meta.tone}`}>
          <Icon className="h-3.5 w-3.5" />
          <span className="font-bangla">{meta.label}</span>
        </span>
      </div>

      <div className="p-5">
        {cancelled ? (
          <div className="rounded-xl bg-destructive/5 p-4 text-center font-bangla text-destructive">
            এই অর্ডারটি বাতিল করা হয়েছে
          </div>
        ) : (
          <ol className="space-y-4">
            {timeline.map((s, i) => {
              const m = STATUS_META[s];
              const done = i <= currentIdx;
              const active = i === currentIdx;
              return (
                <li key={s} className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors ${
                      done ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <m.Icon className={`h-4 w-4 ${active ? "animate-pulse" : ""}`} />
                  </div>
                  <div className="flex-1 pt-1">
                    <div className={`font-bangla text-sm font-semibold ${done ? "" : "text-muted-foreground"}`}>
                      {m.label}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
          {result.receiver_hall && (
            <div>
              <div className="font-bangla text-xs text-muted-foreground">গন্তব্য</div>
              <div className="font-bangla font-semibold">{result.receiver_hall}</div>
            </div>
          )}
          <div>
            <div className="font-bangla text-xs text-muted-foreground">অর্ডার সময়</div>
            <div className="font-semibold">{new Date(result.created_at).toLocaleString("bn-BD")}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
