import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { FloatingActions } from "@/components/FloatingActions";
import { Logo } from "@/components/Logo";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, ArrowLeft, Inbox, UtensilsCrossed, Star, Search, RotateCw, MessageCircle } from "lucide-react";
import { StarDisplay } from "@/components/Stars";
import { ReviewDialog } from "@/components/ReviewDialog";
import { OrderChat } from "@/components/OrderChat";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PushNotificationToggle } from "@/components/PushNotificationToggle";
import { cart } from "@/lib/cart";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({ meta: [{ title: "আমার অর্ডার — পায়রা" }] }),
  component: OrdersPage,
});

type Parcel = {
  id: string; order_code: string; status: string; delivery_charge: number;
  sender_hall: string; receiver_hall: string; created_at: string; rider_id: string | null;
};
type OrderItem = { id: string; name: string; price: number; qty: number };
type FoodOrder = {
  id: string; order_code: string; status: string; total: number;
  receiver_hall: string; restaurant_id: string | null; created_at: string;
  items: OrderItem[]; rider_id: string | null;
};

type ReviewRow = { order_id: string; rating: number };
type ChatTarget = { type: "food" | "parcel"; id: string; code: string; hasRider: boolean };

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
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("parcel");
  const [parcels, setParcels] = useState<Parcel[] | null>(null);
  const [foods, setFoods] = useState<FoodOrder[] | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [reviewFor, setReviewFor] = useState<
    | { type: "food"; order: FoodOrder }
    | { type: "parcel"; order: Parcel }
    | null
  >(null);
  const [autoPrompted, setAutoPrompted] = useState(false);
  const [q, setQ] = useState("");
  const [reordering, setReordering] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatTarget | null>(null);

  useEffect(() => {
    supabase.from("parcels")
      .select("id, order_code, status, delivery_charge, sender_hall, receiver_hall, created_at, rider_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setParcels((data as Parcel[]) ?? []));
    supabase.from("food_orders")
      .select("id, order_code, status, total, receiver_hall, restaurant_id, created_at, items, rider_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setFoods(((data ?? []) as unknown) as FoodOrder[]));
    supabase.from("reviews" as any)
      .select("order_id, rating")
      .eq("user_id", user.id)
      .then(({ data }) => {
        const map: Record<string, number> = {};
        ((data ?? []) as unknown as ReviewRow[]).forEach((r) => { map[r.order_id] = r.rating; });
        setRatings(map);
      });
  }, [user.id]);

  async function reorder(order: FoodOrder) {
    if (!order.restaurant_id) return;
    setReordering(order.id);
    try {
      const ids = order.items.map((i) => i.id);
      const [{ data: rest }, { data: menu }] = await Promise.all([
        supabase.from("restaurants").select("id, name").eq("id", order.restaurant_id).maybeSingle(),
        supabase.from("menu_items")
          .select("id, name, price, image_url, is_available")
          .in("id", ids),
      ]);
      if (!rest) { toast.error("রেস্টুরেন্ট পাওয়া যায়নি"); return; }
      const available = (menu ?? []).filter((m) => m.is_available);
      if (available.length === 0) { toast.error("আইটেম আর নেই"); return; }
      cart.clear();
      for (const it of order.items) {
        const m = available.find((x) => x.id === it.id);
        if (!m) continue;
        for (let i = 0; i < it.qty; i++) {
          cart.add(
            { id: m.id, name: m.name, price: m.price, image_url: m.image_url, restaurant_id: rest.id, restaurant_name: rest.name },
            rest.name,
          );
        }
      }
      const skipped = order.items.length - available.length;
      if (skipped > 0) toast(`${skipped}টি আইটেম আর নেই`);
      else toast.success("কার্টে যোগ হয়েছে");
      navigate({ to: "/checkout" });
    } finally {
      setReordering(null);
    }
  }

  return (
    <div className="min-h-screen gradient-hero pb-24">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 pt-6">
        <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
        <Logo />
        <div className="w-5" />
      </header>

      <div className="mx-auto mt-6 max-w-3xl px-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-bangla text-2xl font-extrabold">আমার অর্ডার</h1>
          <PushNotificationToggle />
        </div>

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

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="অর্ডার কোড বা হল খুঁজুন..."
            className="w-full rounded-full border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="mt-4 space-y-3">
          {tab === "parcel" ? (
            parcels === null ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)
            ) : parcels.length === 0 ? (
              <EmptyState label="কোনো পার্সেল অর্ডার নেই" to="/parcel" cta="প্রথম পার্সেল পাঠান" />
            ) : (() => {
              const ql = q.trim().toLowerCase();
              const filtered = ql
                ? parcels.filter((r) =>
                    r.order_code.toLowerCase().includes(ql) ||
                    r.sender_hall.toLowerCase().includes(ql) ||
                    r.receiver_hall.toLowerCase().includes(ql))
                : parcels;
              if (filtered.length === 0) return <p className="py-10 text-center font-bangla text-sm text-muted-foreground">কিছু পাওয়া যায়নি</p>;
              return filtered.map((r) => {
                const s = parcelStatus[r.status] ?? parcelStatus.pending!;
                const canChat = r.status !== "cancelled" && r.status !== "delivered";
                const rated = ratings[r.id];
                const canRate = r.status === "delivered" && !!r.rider_id && !rated;
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
                    footer={
                      (canChat || canRate || rated) ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {canRate && (
                            <button
                              onClick={() => setReviewFor({ type: "parcel", order: r })}
                              className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/5 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/10"
                            >
                              <Star className="h-3.5 w-3.5" />
                              <span className="font-bangla">রাইডার রেট করুন</span>
                            </button>
                          )}
                          {rated ? (
                            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                              <StarDisplay value={rated} size={13} />
                              <span className="font-bangla">আপনার রেটিং</span>
                            </div>
                          ) : null}
                          {canChat && (
                            <button
                              onClick={() => setChat({ type: "parcel", id: r.id, code: r.order_code, hasRider: !!r.rider_id })}
                              className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              <span className="font-bangla">রাইডার চ্যাট</span>
                            </button>
                          )}
                        </div>
                      ) : null
                    }
                  />
                );
              });
            })()
          ) : foods === null ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)
          ) : foods.length === 0 ? (
            <EmptyState label="কোনো খাবার অর্ডার নেই" to="/food" cta="খাবার অর্ডার করুন" />
          ) : (() => {
            const ql = q.trim().toLowerCase();
            const filtered = ql
              ? foods.filter((r) =>
                  r.order_code.toLowerCase().includes(ql) ||
                  r.receiver_hall.toLowerCase().includes(ql))
              : foods;
            if (filtered.length === 0) return <p className="py-10 text-center font-bangla text-sm text-muted-foreground">কিছু পাওয়া যায়নি</p>;
            return filtered.map((r) => {
              const s = foodStatus[r.status] ?? foodStatus.pending!;
              const rated = ratings[r.id];
              const canRate = r.status === "delivered" && !rated;
              const canReorder = r.restaurant_id && Array.isArray(r.items) && r.items.length > 0;
              const canChat = r.status !== "cancelled" && r.status !== "delivered";
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
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {canRate ? (
                        <button
                          onClick={() => setReviewFor(r)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/5 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/10"
                        >
                          <Star className="h-3.5 w-3.5" />
                          <span className="font-bangla">রিভিউ দিন</span>
                        </button>
                      ) : rated ? (
                        <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                          <StarDisplay value={rated} size={13} />
                          <span className="font-bangla">আপনার রেটিং</span>
                        </div>
                      ) : null}
                      {canReorder && (
                        <button
                          onClick={() => reorder(r)}
                          disabled={reordering === r.id}
                          className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
                        >
                          <RotateCw className={`h-3.5 w-3.5 ${reordering === r.id ? "animate-spin" : ""}`} />
                          <span className="font-bangla">আবার অর্ডার</span>
                        </button>
                      )}
                      {canChat && (
                        <button
                          onClick={() => setChat({ type: "food", id: r.id, code: r.order_code, hasRider: !!r.rider_id })}
                          className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/5 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/10"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          <span className="font-bangla">রাইডার চ্যাট</span>
                        </button>
                      )}
                    </div>
                  }
                />
              );
            });
          })()}
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

      <Dialog open={!!chat} onOpenChange={(v) => { if (!v) setChat(null); }}>
        <DialogContent className="max-w-md p-0 sm:p-0">
          <DialogHeader className="px-5 pt-5">
            <DialogTitle className="font-bangla">অর্ডার {chat?.code}</DialogTitle>
          </DialogHeader>
          <div className="px-3 pb-3">
            {chat && (
              <OrderChat
                orderType={chat.type}
                orderId={chat.id}
                currentUserId={user.id}
                otherPartyName={chat.hasRider ? "রাইডার" : "সাপোর্ট"}
                disabled={!chat.hasRider}
                disabledReason="রাইডার নিয়োগ হলে চ্যাট শুরু হবে"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

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
