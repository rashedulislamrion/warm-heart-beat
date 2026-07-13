import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { FloatingActions } from "@/components/FloatingActions";
import { Logo } from "@/components/Logo";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, ArrowLeft, Inbox, UtensilsCrossed, Star } from "lucide-react";
import { StarDisplay } from "@/components/Stars";
import { ReviewDialog } from "@/components/ReviewDialog";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({ meta: [{ title: "আমার অর্ডার — পায়রা" }] }),
  component: OrdersPage,
});

type Parcel = {
  id: string; order_code: string; status: string; delivery_charge: number;
  sender_hall: string; receiver_hall: string; created_at: string;
};
type FoodOrder = {
  id: string; order_code: string; status: string; total: number;
  receiver_hall: string; restaurant_id: string | null; created_at: string;
};

type ReviewRow = { order_id: string; rating: number };

const parcelStatus: Record<string, { label: string; className: string }> = {
  pending: { label: "অপেক্ষমাণ", className: "bg-muted text-muted-foreground" },
  rider_assigned: { label: "রাইডার নিয়োগ", className: "bg-primary/10 text-primary" },
  picked_up: { label: "পিকআপ হয়েছে", className: "bg-accent/10 text-accent" },
  delivered: { label: "ডেলিভার্ড", className: "bg-success/10 text-success" },
  cancelled: { label: "বাতিল", className: "bg-destructive/10 text-destructive" },
};
const foodStatus: Record<string, { label: string; className: string }> = {
  pending: { label: "অপেক্ষমাণ", className: "bg-muted text-muted-foreground" },
  confirmed: { label: "কনফার্মড", className: "bg-primary/10 text-primary" },
  preparing: { label: "প্রস্তুত হচ্ছে", className: "bg-accent/10 text-accent" },
  picked_up: { label: "পিকআপ হয়েছে", className: "bg-accent/10 text-accent" },
  delivered: { label: "ডেলিভার্ড", className: "bg-success/10 text-success" },
  cancelled: { label: "বাতিল", className: "bg-destructive/10 text-destructive" },
};

type Tab = "parcel" | "food";

function OrdersPage() {
  const { user } = Route.useRouteContext();
  const [tab, setTab] = useState<Tab>("parcel");
  const [parcels, setParcels] = useState<Parcel[] | null>(null);
  const [foods, setFoods] = useState<FoodOrder[] | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [reviewFor, setReviewFor] = useState<FoodOrder | null>(null);

  useEffect(() => {
    supabase.from("parcels")
      .select("id, order_code, status, delivery_charge, sender_hall, receiver_hall, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setParcels((data as Parcel[]) ?? []));
    supabase.from("food_orders")
      .select("id, order_code, status, total, receiver_hall, restaurant_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setFoods((data as FoodOrder[]) ?? []));
    supabase.from("reviews" as any)
      .select("order_id, rating")
      .eq("user_id", user.id)
      .then(({ data }) => {
        const map: Record<string, number> = {};
        ((data ?? []) as unknown as ReviewRow[]).forEach((r) => { map[r.order_id] = r.rating; });
        setRatings(map);
      });
  }, [user.id]);

  return (
    <div className="min-h-screen gradient-hero pb-24">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 pt-6">
        <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
        <Logo />
        <div className="w-5" />
      </header>

      <div className="mx-auto mt-6 max-w-3xl px-4">
        <h1 className="font-bangla text-2xl font-extrabold">আমার অর্ডার</h1>

        <div className="mt-4 inline-flex rounded-full bg-secondary p-1">
          {(["parcel", "food"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
                tab === t ? "gradient-primary text-primary-foreground shadow-soft" : "text-muted-foreground"
              }`}
            >
              <span className="font-bangla">{t === "parcel" ? "পার্সেল" : "খাবার"}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {tab === "parcel" ? (
            parcels === null ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)
            ) : parcels.length === 0 ? (
              <EmptyState label="কোনো পার্সেল অর্ডার নেই" to="/parcel" cta="প্রথম পার্সেল পাঠান" />
            ) : (
              parcels.map((r) => {
                const s = parcelStatus[r.status] ?? parcelStatus.pending!;
                return (
                  <Card
                    key={r.id}
                    icon={<Package className="h-5 w-5" />}
                    title={r.order_code}
                    subtitle={`${r.sender_hall} → ${r.receiver_hall}`}
                    date={r.created_at}
                    statusLabel={s.label}
                    statusClass={s.className}
                    amount={r.delivery_charge}
                  />
                );
              })
            )
          ) : foods === null ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)
          ) : foods.length === 0 ? (
            <EmptyState label="কোনো খাবার অর্ডার নেই" to="/food" cta="খাবার অর্ডার করুন" />
          ) : (
            foods.map((r) => {
              const s = foodStatus[r.status] ?? foodStatus.pending!;
              const rated = ratings[r.id];
              const canRate = r.status === "delivered" && !rated;
              return (
                <Card
                  key={r.id}
                  icon={<UtensilsCrossed className="h-5 w-5" />}
                  title={r.order_code}
                  subtitle={`ডেলিভারি: ${r.receiver_hall}`}
                  date={r.created_at}
                  statusLabel={s.label}
                  statusClass={s.className}
                  amount={r.total}
                  accent
                  footer={
                    canRate ? (
                      <button
                        onClick={() => setReviewFor(r)}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/5 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/10"
                      >
                        <Star className="h-3.5 w-3.5" />
                        <span className="font-bangla">রিভিউ দিন</span>
                      </button>
                    ) : rated ? (
                      <div className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
                        <StarDisplay value={rated} size={13} />
                        <span className="font-bangla">আপনার রেটিং</span>
                      </div>
                    ) : null
                  }
                />
              );
            })
          )}
        </div>
      </div>

      {reviewFor && (
        <ReviewDialog
          open={!!reviewFor}
          onOpenChange={(v) => { if (!v) setReviewFor(null); }}
          orderId={reviewFor.id}
          orderCode={reviewFor.order_code}
          restaurantId={reviewFor.restaurant_id}
          onSubmitted={({ rating }) => {
            setRatings((m) => ({ ...m, [reviewFor.id]: rating }));
            setReviewFor(null);
          }}
        />
      )}

      <FloatingActions />
      <MobileBottomNav />
    </div>
  );
}

function Card({
  icon, title, subtitle, date, statusLabel, statusClass, amount, accent, footer,
}: {
  icon: React.ReactNode; title: string; subtitle: string; date: string;
  statusLabel: string; statusClass: string; amount: number; accent?: boolean;
  footer?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-primary-foreground ${accent ? "gradient-accent text-accent-foreground" : "gradient-primary"}`}>
            {icon}
          </span>
          <div className="min-w-0">
            <div className="truncate font-bold">{title}</div>
            <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {new Date(date).toLocaleString("bn-BD")}
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusClass}`}>
            <span className="font-bangla">{statusLabel}</span>
          </span>
          <div className="mt-1 text-sm font-bold text-primary">৳{amount}</div>
        </div>
      </div>
      {footer}
    </div>
  );
}

function EmptyState({ label, to, cta }: { label: string; to: "/parcel" | "/food"; cta: string }) {
  return (
    <div className="mt-16 text-center">
      <Inbox className="mx-auto h-14 w-14 text-muted-foreground/40" />
      <p className="mt-4 font-bangla text-muted-foreground">{label}</p>
      <Link to={to} className="mt-4 inline-flex rounded-full gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-soft">
        <span className="font-bangla">{cta}</span>
      </Link>
    </div>
  );
}
