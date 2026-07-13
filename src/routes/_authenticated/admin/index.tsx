import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OrderChat } from "@/components/OrderChat";
import { toast } from "sonner";
import { Package, UtensilsCrossed, DollarSign, TrendingUp, Search, MessageCircle, UserPlus, Check } from "lucide-react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

type Parcel = {
  id: string; order_code: string; status: string; delivery_charge: number;
  sender_name: string; sender_hall: string; sender_phone: string;
  receiver_name: string; receiver_hall: string; receiver_phone: string;
  item_type: string; size: string; created_at: string; rider_id: string | null;
};

type FoodOrder = {
  id: string; order_code: string; status: string; total: number; subtotal: number; delivery_charge: number;
  receiver_name: string; receiver_hall: string; receiver_phone: string;
  restaurant_id: string; items: any; created_at: string; rider_id: string | null;
};

const parcelStatuses = ["pending", "rider_assigned", "picked_up", "delivered", "cancelled"] as const;
const foodStatuses = ["pending", "confirmed", "preparing", "picked_up", "delivered", "cancelled"] as const;

const statusColor: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  rider_assigned: "bg-primary/10 text-primary",
  confirmed: "bg-primary/10 text-primary",
  preparing: "bg-accent/10 text-accent",
  picked_up: "bg-accent/10 text-accent",
  delivered: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

type Tab = "parcel" | "food";

function AdminDashboard() {
  const { user } = Route.useRouteContext();
  const [tab, setTab] = useState<Tab>("parcel");
  const [parcels, setParcels] = useState<Parcel[] | null>(null);
  const [foods, setFoods] = useState<FoodOrder[] | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [chat, setChat] = useState<{ type: "food" | "parcel"; id: string; code: string } | null>(null);

  async function assignSelf(orderType: "food" | "parcel", id: string) {
    const table = orderType === "parcel" ? "parcels" : "food_orders";
    const { error } = await supabase.from(table).update({ rider_id: user.id }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("আপনি রাইডার হিসেবে যুক্ত হয়েছেন");
  }

  useEffect(() => {
    supabase.from("parcels").select("*").order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => setParcels((data as Parcel[]) ?? []));
    supabase.from("food_orders").select("*").order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => setFoods((data as FoodOrder[]) ?? []));

    const ch1 = supabase
      .channel("admin-parcels")
      .on("postgres_changes", { event: "*", schema: "public", table: "parcels" }, (payload) => {
        setParcels((cur) => applyChange(cur ?? [], payload));
      })
      .subscribe();
    const ch2 = supabase
      .channel("admin-food")
      .on("postgres_changes", { event: "*", schema: "public", table: "food_orders" }, (payload) => {
        setFoods((cur) => applyChange(cur ?? [], payload));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, []);

  const stats = useMemo(() => {
    const p = parcels ?? [];
    const f = foods ?? [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();
    const pToday = p.filter((r) => r.created_at >= todayIso);
    const fToday = f.filter((r) => r.created_at >= todayIso);
    const pending = p.filter((r) => r.status === "pending").length + f.filter((r) => r.status === "pending").length;
    const revenueToday =
      pToday.reduce((s, r) => s + (r.delivery_charge || 0), 0) +
      fToday.reduce((s, r) => s + (r.total || 0), 0);
    return {
      totalOrders: p.length + f.length,
      todayOrders: pToday.length + fToday.length,
      pending,
      revenueToday,
    };
  }, [parcels, foods]);

  const filteredParcels = useMemo(() => {
    let list = parcels ?? [];
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.order_code.toLowerCase().includes(s) ||
          r.sender_name.toLowerCase().includes(s) ||
          r.receiver_name.toLowerCase().includes(s) ||
          r.sender_phone.includes(s) ||
          r.receiver_phone.includes(s),
      );
    }
    return list;
  }, [parcels, statusFilter, q]);

  const filteredFoods = useMemo(() => {
    let list = foods ?? [];
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.order_code.toLowerCase().includes(s) ||
          r.receiver_name.toLowerCase().includes(s) ||
          r.receiver_phone.includes(s),
      );
    }
    return list;
  }, [foods, statusFilter, q]);

  async function updateParcelStatus(id: string, status: string) {
    const { error } = await supabase.from("parcels").update({ status } as any).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("স্ট্যাটাস আপডেট হয়েছে");
  }
  async function updateFoodStatus(id: string, status: string) {
    const { error } = await supabase.from("food_orders").update({ status } as any).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("স্ট্যাটাস আপডেট হয়েছে");
  }

  const currentStatuses = tab === "parcel" ? parcelStatuses : foodStatuses;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">ড্যাশবোর্ড</h1>
        <p className="text-sm text-muted-foreground">Realtime অর্ডার ম্যানেজমেন্ট</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard Icon={TrendingUp} label="মোট অর্ডার" value={stats.totalOrders} />
        <StatCard Icon={Package} label="আজকের অর্ডার" value={stats.todayOrders} />
        <StatCard Icon={UtensilsCrossed} label="অপেক্ষমাণ" value={stats.pending} highlight />
        <StatCard Icon={DollarSign} label="আজকের আয়" value={`৳${stats.revenueToday}`} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full bg-secondary p-1">
          {(["parcel", "food"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
                tab === t ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground"
              }`}
            >
              <span className="font-bangla">{t === "parcel" ? "পার্সেল" : "খাবার"}</span>
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="কোড, নাম, ফোন..."
            className="h-10 rounded-lg pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-10 w-40 rounded-lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সব স্ট্যাটাস</SelectItem>
            {currentStatuses.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {tab === "parcel" ? (
          parcels === null ? (
            <div className="p-4 space-y-2">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : filteredParcels.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">কোনো পার্সেল অর্ডার নেই</div>
          ) : (
            <div className="divide-y divide-border">
              {filteredParcels.map((r) => (
                <div key={r.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{r.order_code}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor[r.status] ?? ""}`}>
                        {r.status}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {r.sender_name} ({r.sender_phone}) · {r.sender_hall} → {r.receiver_hall} · {r.receiver_name} ({r.receiver_phone})
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {r.item_type} · {r.size} · {new Date(r.created_at).toLocaleString("bn-BD")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-bold text-primary">৳{r.delivery_charge}</div>
                    <Select value={r.status} onValueChange={(v) => updateParcelStatus(r.id, v)}>
                      <SelectTrigger className="h-9 w-40 rounded-lg text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {parcelStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : foods === null ? (
          <div className="p-4 space-y-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : filteredFoods.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">কোনো খাবার অর্ডার নেই</div>
        ) : (
          <div className="divide-y divide-border">
            {filteredFoods.map((r) => {
              const itemsArr = Array.isArray(r.items) ? r.items : [];
              return (
                <div key={r.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{r.order_code}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor[r.status] ?? ""}`}>
                        {r.status}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {r.receiver_name} ({r.receiver_phone}) · {r.receiver_hall}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {itemsArr.map((i: any) => `${i.name}×${i.qty}`).join(", ")} · {new Date(r.created_at).toLocaleString("bn-BD")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-bold text-primary">৳{r.total}</div>
                    <Select value={r.status} onValueChange={(v) => updateFoodStatus(r.id, v)}>
                      <SelectTrigger className="h-9 w-40 rounded-lg text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {foodStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function applyChange<T extends { id: string; created_at: string }>(list: T[], payload: any): T[] {
  if (payload.eventType === "INSERT") {
    if (list.some((r) => r.id === payload.new.id)) return list;
    return [payload.new as T, ...list];
  }
  if (payload.eventType === "UPDATE") {
    return list.map((r) => (r.id === payload.new.id ? { ...r, ...payload.new } : r));
  }
  if (payload.eventType === "DELETE") {
    return list.filter((r) => r.id !== payload.old.id);
  }
  return list;
}

function StatCard({
  Icon, label, value, highlight,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string; value: number | string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-2xl border border-border p-4 shadow-card ${highlight ? "bg-accent/5" : "bg-card"}`}>
      <div className="flex items-center gap-2">
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${highlight ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="font-bangla text-xs text-muted-foreground">{label}</div>
      </div>
      <div className="mt-2 text-2xl font-extrabold">{value}</div>
    </div>
  );
}
