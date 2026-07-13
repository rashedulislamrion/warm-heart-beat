import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OrderChat } from "@/components/OrderChat";
import { toast } from "sonner";
import {
  ArrowLeft, Bike, Package, UtensilsCrossed, Phone, MapPin, Loader2, Check,
  MessageCircle, TrendingUp, Wallet, Star, Clock,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { StarDisplay } from "@/components/Stars";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

export const Route = createFileRoute("/_authenticated/rider-hub")({
  head: () => ({ meta: [{ title: "রাইডার ড্যাশবোর্ড — পায়রা" }] }),
  component: RiderHub,
});

type Parcel = {
  id: string; order_code: string; status: string; delivery_charge: number;
  sender_name: string; sender_hall: string; sender_phone: string;
  receiver_name: string; receiver_hall: string; receiver_phone: string;
  item_type: string | null; size: string | null;
  created_at: string; rider_id: string | null; scheduled_for: string | null;
};
type FoodOrder = {
  id: string; order_code: string; status: string; total: number; delivery_charge: number;
  receiver_name: string; receiver_hall: string; receiver_phone: string;
  restaurant_id: string; items: any; created_at: string; rider_id: string | null; scheduled_for: string | null;
};

type Tab = "available" | "active" | "done";

const parcelLabel: Record<string, string> = {
  pending: "নতুন", rider_assigned: "চলছে", picked_up: "পিকআপ",
  delivered: "ডেলিভার্ড", cancelled: "বাতিল",
};
const foodLabel: Record<string, string> = {
  pending: "অপেক্ষমাণ", confirmed: "কনফার্মড", preparing: "প্রস্তুত হচ্ছে",
  picked_up: "পিকআপ", delivered: "ডেলিভার্ড", cancelled: "বাতিল",
};

function RiderHub() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "ok" | "denied">("loading");
  const [tab, setTab] = useState<Tab>("available");
  const [parcels, setParcels] = useState<Parcel[] | null>(null);
  const [foods, setFoods] = useState<FoodOrder[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [chat, setChat] = useState<{ type: "food" | "parcel"; id: string; code: string } | null>(null);
  const [rating, setRating] = useState<{ avg: number; count: number } | null>(null);
  const { countFor, clearFor, unmute } = useUnreadMessages(user.id);

  function openChat(target: { type: "food" | "parcel"; id: string; code: string }) {
    clearFor(target.type, target.id);
    setChat(target);
  }

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("has_role", { _user_id: user.id, _role: "rider" });
      if (error || !data) {
        setState("denied");
        toast.error("রাইডার অ্যাক্সেস নেই");
        setTimeout(() => navigate({ to: "/rider" }), 1200);
        return;
      }
      setState("ok");
    })();
  }, [user.id, navigate]);

  useEffect(() => {
    if (state !== "ok") return;
    supabase.from("parcels")
      .select("id, order_code, status, delivery_charge, sender_name, sender_hall, sender_phone, receiver_name, receiver_hall, receiver_phone, item_type, size, created_at, rider_id, scheduled_for")
      .or(`rider_id.eq.${user.id},and(rider_id.is.null,status.eq.pending)`)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => setParcels((data as Parcel[]) ?? []));

    supabase.from("food_orders")
      .select("id, order_code, status, total, delivery_charge, receiver_name, receiver_hall, receiver_phone, restaurant_id, items, created_at, rider_id, scheduled_for")
      .or(`rider_id.eq.${user.id},and(rider_id.is.null,status.in.(confirmed,preparing))`)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => setFoods((data as FoodOrder[]) ?? []));

    (supabase.rpc as any)("rider_ratings").then(({ data }: { data: any[] | null }) => {
      const mine = (data ?? []).find((r: any) => r.rider_id === user.id);
      if (mine) setRating({ avg: Number(mine.avg_rating) || 0, count: Number(mine.review_count) || 0 });
    });

    const ch1 = supabase.channel("rider-parcels")
      .on("postgres_changes", { event: "*", schema: "public", table: "parcels" }, () => {
        supabase.from("parcels")
          .select("id, order_code, status, delivery_charge, sender_name, sender_hall, sender_phone, receiver_name, receiver_hall, receiver_phone, item_type, size, created_at, rider_id, scheduled_for")
          .or(`rider_id.eq.${user.id},and(rider_id.is.null,status.eq.pending)`)
          .order("created_at", { ascending: false })
          .limit(100)
          .then(({ data }) => setParcels((data as Parcel[]) ?? []));
      })
      .subscribe();
    const ch2 = supabase.channel("rider-food")
      .on("postgres_changes", { event: "*", schema: "public", table: "food_orders" }, () => {
        supabase.from("food_orders")
          .select("id, order_code, status, total, delivery_charge, receiver_name, receiver_hall, receiver_phone, restaurant_id, items, created_at, rider_id, scheduled_for")
          .or(`rider_id.eq.${user.id},and(rider_id.is.null,status.in.(confirmed,preparing))`)
          .order("created_at", { ascending: false })
          .limit(100)
          .then(({ data }) => setFoods((data as FoodOrder[]) ?? []));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [state, user.id]);

  const stats = useMemo(() => {
    const myFood = (foods ?? []).filter((f) => f.rider_id === user.id);
    const myParcel = (parcels ?? []).filter((p) => p.rider_id === user.id);
    const deliveredFood = myFood.filter((f) => f.status === "delivered");
    const deliveredParcel = myParcel.filter((p) => p.status === "delivered");
    const activeCount = myFood.filter((f) => f.status !== "delivered" && f.status !== "cancelled").length
      + myParcel.filter((p) => p.status !== "delivered" && p.status !== "cancelled").length;
    const totalDeliveries = deliveredFood.length + deliveredParcel.length;
    const earnings = deliveredFood.reduce((s, f) => s + (f.delivery_charge || 0), 0)
      + deliveredParcel.reduce((s, p) => s + (p.delivery_charge || 0), 0);
    return { activeCount, totalDeliveries, earnings };
  }, [foods, parcels, user.id]);

  const scheduleReady = (s: string | null) => !s || new Date(s).getTime() - Date.now() <= 30 * 60 * 1000;
  const availableParcels = (parcels ?? []).filter((p) => p.rider_id === null && scheduleReady(p.scheduled_for));
  const availableFoods = (foods ?? []).filter((f) => f.rider_id === null && scheduleReady(f.scheduled_for));
  const myActiveParcels = (parcels ?? []).filter((p) => p.rider_id === user.id && p.status !== "delivered" && p.status !== "cancelled");
  const myActiveFoods = (foods ?? []).filter((f) => f.rider_id === user.id && f.status !== "delivered" && f.status !== "cancelled");
  const myDoneParcels = (parcels ?? []).filter((p) => p.rider_id === user.id && (p.status === "delivered" || p.status === "cancelled"));
  const myDoneFoods = (foods ?? []).filter((f) => f.rider_id === user.id && (f.status === "delivered" || f.status === "cancelled"));

  async function claimParcel(p: Parcel) {
    setBusy(p.id);
    const { data, error } = await supabase.from("parcels")
      .update({ rider_id: user.id, status: "rider_assigned" })
      .eq("id", p.id).is("rider_id", null)
      .select("id");
    setBusy(null);
    if (error) return toast.error(error.message);
    if (!data || data.length === 0) {
      toast.error("দুঃখিত, অন্য রাইডার আগেই নিয়েছেন");
      return;
    }
    toast.success("অর্ডার নেওয়া হয়েছে");
    setTab("active");
  }
  async function claimFood(f: FoodOrder) {
    setBusy(f.id);
    const { data, error } = await supabase.from("food_orders")
      .update({ rider_id: user.id })
      .eq("id", f.id).is("rider_id", null)
      .select("id");
    setBusy(null);
    if (error) return toast.error(error.message);
    if (!data || data.length === 0) {
      toast.error("দুঃখিত, অন্য রাইডার আগেই নিয়েছেন");
      return;
    }
    toast.success("অর্ডার নেওয়া হয়েছে");
    setTab("active");
  }
  async function releaseParcel(p: Parcel) {
    if (!window.confirm("অর্ডার ছেড়ে দিতে চান?")) return;
    setBusy(p.id);
    const { error } = await (supabase.rpc as any)("release_order", { _order_type: "parcel", _order_id: p.id });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("অর্ডার ছেড়ে দেওয়া হয়েছে");
    setTab("available");
  }
  async function releaseFood(f: FoodOrder) {
    if (!window.confirm("অর্ডার ছেড়ে দিতে চান?")) return;
    setBusy(f.id);
    const { error } = await (supabase.rpc as any)("release_order", { _order_type: "food", _order_id: f.id });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("অর্ডার ছেড়ে দেওয়া হয়েছে");
    setTab("available");
  }
  async function updateParcelStatus(p: Parcel, next: string) {
    setBusy(p.id);
    const { error } = await supabase.from("parcels").update({ status: next as any }).eq("id", p.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("স্ট্যাটাস আপডেট");
  }
  async function updateFoodStatus(f: FoodOrder, next: string) {
    setBusy(f.id);
    const { error } = await supabase.from("food_orders").update({ status: next as any }).eq("id", f.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("স্ট্যাটাস আপডেট");
  }

  if (state === "loading") {
    return <div className="grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (state === "denied") {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <p className="font-bangla text-lg font-bold">রাইডার অ্যাক্সেস নেই</p>
          <p className="mt-1 text-sm text-muted-foreground">আবেদন পাতায় নিয়ে যাওয়া হচ্ছে…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-lg">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <Link to="/" className="grid h-9 w-9 place-items-center rounded-lg border border-border">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Logo />
          <span className="ml-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase text-accent">
            <span className="inline-flex items-center gap-1"><Bike className="h-3 w-3" /> rider</span>
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard Icon={Clock} label="সক্রিয়" value={stats.activeCount.toString()} />
          <StatCard Icon={Check} label="মোট ডেলিভারি" value={stats.totalDeliveries.toString()} />
          <StatCard Icon={Wallet} label="মোট আয়" value={`৳${stats.earnings}`} accent />
          <div className="rounded-2xl border border-border bg-card p-3 shadow-card">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Star className="h-3.5 w-3.5" /> <span className="font-bangla">রেটিং</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              {rating ? (
                <>
                  <span className="text-lg font-bold">{rating.avg.toFixed(1)}</span>
                  <StarDisplay value={Math.round(rating.avg)} size={12} />
                  <span className="text-[10px] text-muted-foreground">({rating.count})</span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 inline-flex rounded-full bg-secondary p-1">
          {([
            ["available", "নতুন"],
            ["active", "সক্রিয়"],
            ["done", "সম্পন্ন"],
          ] as [Tab, string][]).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
                tab === k ? "gradient-primary text-primary-foreground shadow-soft" : "text-muted-foreground"
              }`}
            >
              <span className="font-bangla">{l}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {parcels === null || foods === null ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)
          ) : tab === "available" ? (
            (() => {
              const all = [
                ...availableParcels.map((p) => ({ kind: "parcel" as const, order: p, ts: p.created_at })),
                ...availableFoods.map((f) => ({ kind: "food" as const, order: f, ts: f.created_at })),
              ].sort((a, b) => (a.ts < b.ts ? 1 : -1));
              if (all.length === 0) return <Empty label="এখন নতুন কোনো অর্ডার নেই" />;
              return all.map((x) => x.kind === "parcel"
                ? <ParcelCard key={x.order.id} p={x.order} onClaim={() => claimParcel(x.order)} busy={busy === x.order.id} />
                : <FoodCard key={x.order.id} f={x.order} onClaim={() => claimFood(x.order)} busy={busy === x.order.id} />
              );
            })()
          ) : tab === "active" ? (
            (myActiveParcels.length + myActiveFoods.length === 0)
              ? <Empty label="কোনো সক্রিয় অর্ডার নেই" />
              : (
                <>
                  {myActiveParcels.map((p) => (
                    <ActiveParcel key={p.id} p={p} busy={busy === p.id}
                      unread={countFor("parcel", p.id)}
                      onNext={(next) => updateParcelStatus(p, next)}
                      onRelease={() => releaseParcel(p)}
                      onChat={() => openChat({ type: "parcel", id: p.id, code: p.order_code })}
                    />
                  ))}
                  {myActiveFoods.map((f) => (
                    <ActiveFood key={f.id} f={f} busy={busy === f.id}
                      unread={countFor("food", f.id)}
                      onNext={(next) => updateFoodStatus(f, next)}
                      onRelease={() => releaseFood(f)}
                      onChat={() => openChat({ type: "food", id: f.id, code: f.order_code })}
                    />
                  ))}
                </>
              )
          ) : (
            (myDoneParcels.length + myDoneFoods.length === 0)
              ? <Empty label="এখনো কোনো সম্পন্ন অর্ডার নেই" />
              : (
                <>
                  {[
                    ...myDoneParcels.map((p) => ({ kind: "parcel" as const, order: p, ts: p.created_at })),
                    ...myDoneFoods.map((f) => ({ kind: "food" as const, order: f, ts: f.created_at })),
                  ].sort((a, b) => (a.ts < b.ts ? 1 : -1)).map((x) => x.kind === "parcel"
                    ? <DoneRow key={x.order.id} icon={<Package className="h-4 w-4" />} title={x.order.order_code}
                        subtitle={`${x.order.sender_hall} → ${x.order.receiver_hall}`}
                        amount={x.order.delivery_charge} status={parcelLabel[x.order.status] ?? x.order.status} date={x.order.created_at} />
                    : <DoneRow key={x.order.id} icon={<UtensilsCrossed className="h-4 w-4" />} title={x.order.order_code}
                        subtitle={`ডেলিভারি: ${x.order.receiver_hall}`}
                        amount={x.order.delivery_charge} status={foodLabel[x.order.status] ?? x.order.status} date={x.order.created_at} />
                  )}
                </>
              )
          )}
        </div>
      </main>

      <Dialog open={!!chat} onOpenChange={(v) => { if (!v) { if (chat) unmute(chat.type, chat.id); setChat(null); } }}>
        <DialogContent className="max-w-md p-0 sm:p-0">
          <DialogHeader className="px-5 pt-5">
            <DialogTitle className="font-bangla">অর্ডার {chat?.code}</DialogTitle>
          </DialogHeader>
          <div className="px-3 pb-3">
            {chat && (
              <OrderChat orderType={chat.type} orderId={chat.id} currentUserId={user.id}
                otherPartyName="কাস্টমার" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ Icon, label, value, accent }: { Icon: any; label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-card">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> <span className="font-bangla">{label}</span>
      </div>
      <div className={`mt-1 text-lg font-extrabold ${accent ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}

function ParcelCard({ p, onClaim, busy }: { p: Parcel; onClaim: () => void; busy: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl gradient-primary text-primary-foreground">
            <Package className="h-5 w-5" />
          </span>
          <div>
            <div className="font-bold">{p.order_code}</div>
            <div className="text-xs text-muted-foreground">পার্সেল • {p.item_type ?? "—"} • {p.size ?? "—"}</div>
            <div className="mt-1 flex items-center gap-1 text-xs"><MapPin className="h-3 w-3" /> {p.sender_hall} → {p.receiver_hall}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-primary">৳{p.delivery_charge}</div>
          <div className="text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleTimeString("bn-BD")}</div>
        </div>
      </div>
      <Button onClick={onClaim} disabled={busy} className="mt-3 h-9 w-full rounded-xl gradient-primary text-primary-foreground">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="font-bangla font-bold">অর্ডার নিন</span>}
      </Button>
    </div>
  );
}

function FoodCard({ f, onClaim, busy }: { f: FoodOrder; onClaim: () => void; busy: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl gradient-accent text-accent-foreground">
            <UtensilsCrossed className="h-5 w-5" />
          </span>
          <div>
            <div className="font-bold">{f.order_code}</div>
            <div className="text-xs text-muted-foreground">খাবার • {foodLabel[f.status] ?? f.status}</div>
            <div className="mt-1 flex items-center gap-1 text-xs"><MapPin className="h-3 w-3" /> {f.receiver_hall}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-primary">৳{f.delivery_charge}</div>
          <div className="text-[10px] text-muted-foreground">{new Date(f.created_at).toLocaleTimeString("bn-BD")}</div>
        </div>
      </div>
      <Button onClick={onClaim} disabled={busy} className="mt-3 h-9 w-full rounded-xl gradient-primary text-primary-foreground">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="font-bangla font-bold">অর্ডার নিন</span>}
      </Button>
    </div>
  );
}

function ActiveParcel({ p, busy, unread, onNext, onRelease, onChat }: { p: Parcel; busy: boolean; unread: number; onNext: (next: string) => void; onRelease: () => void; onChat: () => void }) {
  const next = p.status === "rider_assigned" ? { key: "picked_up", label: "পিকআপ করেছি" }
    : p.status === "picked_up" ? { key: "delivered", label: "ডেলিভার সম্পন্ন" }
    : null;
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl gradient-primary text-primary-foreground">
            <Package className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="font-bold">{p.order_code}</div>
            <div className="text-xs text-muted-foreground">পার্সেল • {parcelLabel[p.status] ?? p.status}</div>
          </div>
        </div>
        <div className="text-right"><div className="text-lg font-bold text-primary">৳{p.delivery_charge}</div></div>
      </div>
      <div className="mt-3 grid gap-2 text-xs">
        <Party label="প্রেরক" name={p.sender_name} hall={p.sender_hall} phone={p.sender_phone} />
        <Party label="প্রাপক" name={p.receiver_name} hall={p.receiver_hall} phone={p.receiver_phone} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {next && (
          <Button onClick={() => onNext(next.key)} disabled={busy} size="sm" className="rounded-full gradient-primary text-primary-foreground">
            <Check className="mr-1 h-4 w-4" /> <span className="font-bangla">{next.label}</span>
          </Button>
        )}
        <Button onClick={onChat} size="sm" variant="outline" className="relative rounded-full">
          <MessageCircle className="mr-1 h-4 w-4" /> <span className="font-bangla">চ্যাট</span>
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">{unread}</span>
          )}
        </Button>
      </div>
    </div>
  );
}

function ActiveFood({ f, busy, unread, onNext, onChat }: { f: FoodOrder; busy: boolean; unread: number; onNext: (next: string) => void; onChat: () => void }) {
  const next = (f.status === "confirmed" || f.status === "preparing") ? { key: "picked_up", label: "পিকআপ করেছি" }
    : f.status === "picked_up" ? { key: "delivered", label: "ডেলিভার সম্পন্ন" }
    : null;
  const items = Array.isArray(f.items) ? f.items as { name: string; qty: number }[] : [];
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl gradient-accent text-accent-foreground">
            <UtensilsCrossed className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="font-bold">{f.order_code}</div>
            <div className="text-xs text-muted-foreground">খাবার • {foodLabel[f.status] ?? f.status}</div>
          </div>
        </div>
        <div className="text-right"><div className="text-lg font-bold text-primary">৳{f.delivery_charge}</div></div>
      </div>
      <div className="mt-3 grid gap-2 text-xs">
        <Party label="প্রাপক" name={f.receiver_name} hall={f.receiver_hall} phone={f.receiver_phone} />
        {items.length > 0 && (
          <div className="rounded-xl bg-muted/40 p-2 text-[11px] text-muted-foreground">
            {items.slice(0, 4).map((it, i) => (
              <span key={i}>{it.name} × {it.qty}{i < Math.min(items.length, 4) - 1 ? ", " : ""}</span>
            ))}
            {items.length > 4 ? ` +${items.length - 4}` : ""}
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {next && (
          <Button onClick={() => onNext(next.key)} disabled={busy} size="sm" className="rounded-full gradient-primary text-primary-foreground">
            <Check className="mr-1 h-4 w-4" /> <span className="font-bangla">{next.label}</span>
          </Button>
        )}
        <Button onClick={onChat} size="sm" variant="outline" className="relative rounded-full">
          <MessageCircle className="mr-1 h-4 w-4" /> <span className="font-bangla">চ্যাট</span>
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">{unread}</span>
          )}
        </Button>
      </div>
    </div>
  );
}

function Party({ label, name, hall, phone }: { label: string; name: string; hall: string; phone: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2">
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="truncate font-semibold">{name}</div>
        <div className="truncate text-[11px] text-muted-foreground">{hall}</div>
      </div>
      <a href={`tel:${phone}`} className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
        <Phone className="h-4 w-4" />
      </a>
    </div>
  );
}

function DoneRow({ icon, title, subtitle, amount, status, date }: { icon: React.ReactNode; title: string; subtitle: string; amount: number; status: string; date: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-muted text-muted-foreground">{icon}</span>
        <div>
          <div className="font-bold text-sm">{title}</div>
          <div className="text-xs text-muted-foreground">{subtitle}</div>
          <div className="text-[10px] text-muted-foreground">{new Date(date).toLocaleString("bn-BD")}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-bold text-primary">৳{amount}</div>
        <div className="text-[10px] font-bangla text-muted-foreground">{status}</div>
      </div>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="mt-10 rounded-2xl border border-dashed border-border p-10 text-center">
      <TrendingUp className="mx-auto h-10 w-10 text-muted-foreground/40" />
      <p className="mt-3 font-bangla text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
