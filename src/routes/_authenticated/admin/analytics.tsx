import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { TrendingUp, DollarSign, UtensilsCrossed, Package, Trophy, Clock, Bike, XCircle, Timer, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics — DearDash Admin" }] }),
  component: AnalyticsPage,
});

type Parcel = { id: string; delivery_charge: number; status: string; created_at: string; updated_at: string; rider_id: string | null };
type FoodOrder = {
  id: string;
  total: number;
  status: string;
  created_at: string;
  updated_at: string;
  restaurant_id: string | null;
  rider_id: string | null;
  items: any;
};
type Restaurant = { id: string; name: string };
type Review = { rider_id: string | null; rider_rating: number | null };
type Profile = { id: string; full_name: string | null };

const RANGE_OPTIONS = [
  { key: "7", label: "৭ দিন" },
  { key: "14", label: "১৪ দিন" },
  { key: "30", label: "৩০ দিন" },
] as const;

function AnalyticsPage() {
  const [range, setRange] = useState<"7" | "14" | "30">("7");
  const [parcels, setParcels] = useState<Parcel[] | null>(null);
  const [foods, setFoods] = useState<FoodOrder[] | null>(null);
  const [restaurants, setRestaurants] = useState<Record<string, string>>({});
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [riderNames, setRiderNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const days = Number(range);
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);
    const sinceIso = since.toISOString();

    supabase
      .from("parcels")
      .select("id, delivery_charge, status, created_at, updated_at, rider_id")
      .gte("created_at", sinceIso)
      .then(({ data }) => setParcels((data as Parcel[]) ?? []));
    supabase
      .from("food_orders")
      .select("id, total, status, created_at, updated_at, restaurant_id, rider_id, items")
      .gte("created_at", sinceIso)
      .then(({ data }) => setFoods(((data ?? []) as unknown) as FoodOrder[]));
    supabase
      .from("restaurants")
      .select("id, name")
      .then(({ data }) => {
        const map: Record<string, string> = {};
        ((data as Restaurant[]) ?? []).forEach((r) => (map[r.id] = r.name));
        setRestaurants(map);
      });
    supabase
      .from("reviews")
      .select("rider_id, rider_rating")
      .gte("created_at", sinceIso)
      .then(({ data }) => setReviews((data as Review[]) ?? []));
  }, [range]);

  // Load rider profile names for whichever rider_ids show up
  useEffect(() => {
    const ids = new Set<string>();
    (parcels ?? []).forEach((p) => p.rider_id && ids.add(p.rider_id));
    (foods ?? []).forEach((f) => f.rider_id && ids.add(f.rider_id));
    const missing = [...ids].filter((id) => !(id in riderNames));
    if (missing.length === 0) return;
    supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", missing)
      .then(({ data }) => {
        const next = { ...riderNames };
        ((data as Profile[]) ?? []).forEach((p) => (next[p.id] = p.full_name ?? "—"));
        setRiderNames(next);
      });
  }, [parcels, foods]);

  const loading = parcels === null || foods === null;

  const { revenueSeries, hourSeries, topItems, topRestaurants, topRiders, kpis } = useMemo(() => {
    const p = parcels ?? [];
    const f = foods ?? [];
    const days = Number(range);

    // Daily revenue series (exclude cancelled)
    const dayMap = new Map<string, { date: string; parcel: number; food: number; orders: number }>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      dayMap.set(k, { date: k, parcel: 0, food: 0, orders: 0 });
    }
    p.filter((r) => r.status !== "cancelled").forEach((r) => {
      const k = r.created_at.slice(0, 10);
      const row = dayMap.get(k);
      if (row) {
        row.parcel += r.delivery_charge || 0;
        row.orders += 1;
      }
    });
    f.filter((r) => r.status !== "cancelled").forEach((r) => {
      const k = r.created_at.slice(0, 10);
      const row = dayMap.get(k);
      if (row) {
        row.food += r.total || 0;
        row.orders += 1;
      }
    });
    const revenueSeries = Array.from(dayMap.values()).map((r) => ({
      ...r,
      label: new Date(r.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
      total: r.parcel + r.food,
    }));

    // Busy hours (0-23)
    const hourCounts = Array.from({ length: 24 }, (_, h) => ({ hour: h, label: `${h}:00`, orders: 0 }));
    [...p, ...f].forEach((r) => {
      const h = new Date(r.created_at).getHours();
      hourCounts[h]!.orders += 1;
    });

    // Top items
    const itemMap = new Map<string, { name: string; qty: number; revenue: number }>();
    f.filter((r) => r.status !== "cancelled").forEach((r) => {
      const arr = Array.isArray(r.items) ? r.items : [];
      arr.forEach((it: any) => {
        const key = it.name ?? "—";
        const cur = itemMap.get(key) ?? { name: key, qty: 0, revenue: 0 };
        cur.qty += Number(it.qty) || 0;
        cur.revenue += (Number(it.price) || 0) * (Number(it.qty) || 0);
        itemMap.set(key, cur);
      });
    });
    const topItems = Array.from(itemMap.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    // Top restaurants
    const restMap = new Map<string, { id: string; orders: number; revenue: number }>();
    f.filter((r) => r.status !== "cancelled" && r.restaurant_id).forEach((r) => {
      const cur = restMap.get(r.restaurant_id!) ?? { id: r.restaurant_id!, orders: 0, revenue: 0 };
      cur.orders += 1;
      cur.revenue += r.total || 0;
      restMap.set(r.restaurant_id!, cur);
    });
    const topRestaurants = Array.from(restMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Top riders: delivered order counts + avg rating
    const riderMap = new Map<string, { id: string; delivered: number; earnings: number }>();
    p.filter((r) => r.status === "delivered" && r.rider_id).forEach((r) => {
      const cur = riderMap.get(r.rider_id!) ?? { id: r.rider_id!, delivered: 0, earnings: 0 };
      cur.delivered += 1;
      cur.earnings += r.delivery_charge || 0;
      riderMap.set(r.rider_id!, cur);
    });
    f.filter((r) => r.status === "delivered" && r.rider_id).forEach((r) => {
      const cur = riderMap.get(r.rider_id!) ?? { id: r.rider_id!, delivered: 0, earnings: 0 };
      cur.delivered += 1;
      cur.earnings += 40;
      riderMap.set(r.rider_id!, cur);
    });
    const ratingMap = new Map<string, { sum: number; count: number }>();
    (reviews ?? []).forEach((rv) => {
      if (!rv.rider_id || rv.rider_rating == null) return;
      const cur = ratingMap.get(rv.rider_id) ?? { sum: 0, count: 0 };
      cur.sum += rv.rider_rating;
      cur.count += 1;
      ratingMap.set(rv.rider_id, cur);
    });
    const topRiders = Array.from(riderMap.values())
      .map((r) => {
        const rt = ratingMap.get(r.id);
        return { ...r, rating: rt ? +(rt.sum / rt.count).toFixed(1) : null, reviews: rt?.count ?? 0 };
      })
      .sort((a, b) => b.delivered - a.delivered)
      .slice(0, 5);

    const totalRevenue = revenueSeries.reduce((s, r) => s + r.total, 0);
    const totalOrders = p.length + f.length;
    const delivered =
      p.filter((r) => r.status === "delivered").length +
      f.filter((r) => r.status === "delivered").length;
    const cancelled =
      p.filter((r) => r.status === "cancelled").length +
      f.filter((r) => r.status === "cancelled").length;
    const aov = totalOrders > 0 ? Math.round(totalRevenue / Math.max(1, totalOrders - cancelled)) : 0;
    const cancelRate = totalOrders > 0 ? Math.round((cancelled / totalOrders) * 100) : 0;

    // Avg delivery time (mins) for delivered orders
    const deliveredRows = [
      ...p.filter((r) => r.status === "delivered"),
      ...f.filter((r) => r.status === "delivered"),
    ];
    const avgDeliveryMin = deliveredRows.length
      ? Math.round(
          deliveredRows.reduce(
            (s, r) => s + (new Date(r.updated_at).getTime() - new Date(r.created_at).getTime()) / 60000,
            0,
          ) / deliveredRows.length,
        )
      : 0;

    // Avg rider rating overall
    let sumR = 0, cntR = 0;
    ratingMap.forEach((v) => { sumR += v.sum; cntR += v.count; });
    const avgRating = cntR > 0 ? +(sumR / cntR).toFixed(1) : 0;

    return {
      revenueSeries,
      hourSeries: hourCounts,
      topItems,
      topRestaurants,
      topRiders,
      kpis: { totalRevenue, totalOrders, delivered, cancelled, aov, cancelRate, avgDeliveryMin, avgRating },
    };
  }, [parcels, foods, reviews, range]);

  const maxHour = Math.max(1, ...hourSeries.map((h) => h.orders));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Analytics</h1>
          <p className="text-sm text-muted-foreground">রাজস্ব ও অর্ডার ইনসাইট</p>
        </div>
        <div className="inline-flex rounded-full bg-secondary p-1">
          {RANGE_OPTIONS.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                range === r.key ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground"
              }`}
            >
              <span className="font-bangla">{r.label}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi Icon={DollarSign} label="মোট আয়" value={`৳${kpis.totalRevenue.toLocaleString("en-US")}`} highlight />
          <Kpi Icon={TrendingUp} label="অর্ডার" value={kpis.totalOrders} />
          <Kpi Icon={Package} label="ডেলিভার্ড" value={kpis.delivered} />
          <Kpi Icon={UtensilsCrossed} label="গড় মূল্য" value={`৳${kpis.aov}`} />
          <Kpi Icon={Timer} label="গড় ডেলিভারি" value={`${kpis.avgDeliveryMin}m`} />
          <Kpi Icon={XCircle} label="ক্যান্সেল রেট" value={`${kpis.cancelRate}%`} />
          <Kpi Icon={Star} label="গড় রেটিং" value={kpis.avgRating || "—"} />
          <Kpi Icon={Bike} label="সক্রিয় রাইডার" value={topRiders.length} />
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="font-bold">দৈনিক রাজস্ব</h2>
        </div>
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: number, name) => [`৳${v}`, name === "food" ? "খাবার" : name === "parcel" ? "পার্সেল" : "মোট"]}
                />
                <Line type="monotone" dataKey="parcel" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="food" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="total" stroke="hsl(var(--foreground))" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent" />
            <h2 className="font-bold">ব্যস্ত ঘণ্টা</h2>
          </div>
          {loading ? (
            <Skeleton className="h-56 w-full" />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    labelFormatter={(l) => `${l}:00`}
                  />
                  <Bar dataKey="orders" radius={[6, 6, 0, 0]}>
                    {hourSeries.map((h, i) => (
                      <Cell
                        key={i}
                        fill={h.orders / maxHour > 0.66 ? "hsl(var(--accent))" : "hsl(var(--primary))"}
                        opacity={h.orders === 0 ? 0.15 : 0.4 + (h.orders / maxHour) * 0.6}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-3 flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4 text-accent" />
            <h2 className="font-bold">টপ আইটেম</h2>
          </div>
          {loading ? (
            <Skeleton className="h-56 w-full" />
          ) : topItems.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">ডেটা নেই</p>
          ) : (
            <ol className="space-y-2">
              {topItems.map((it, i) => {
                const max = topItems[0]!.qty;
                const pct = (it.qty / max) * 100;
                return (
                  <li key={it.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="min-w-0 truncate">
                        <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent/10 text-[10px] font-bold text-accent">
                          {i + 1}
                        </span>
                        <span className="font-semibold">{it.name}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {it.qty} · ৳{it.revenue}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          <h2 className="font-bold">রেস্টুরেন্ট লিডারবোর্ড</h2>
        </div>
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : topRestaurants.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">ডেটা নেই</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs text-muted-foreground">
                <tr>
                  <th className="p-3 text-left font-semibold">#</th>
                  <th className="p-3 text-left font-semibold">রেস্টুরেন্ট</th>
                  <th className="p-3 text-right font-semibold">অর্ডার</th>
                  <th className="p-3 text-right font-semibold">রাজস্ব</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {topRestaurants.map((r, i) => (
                  <tr key={r.id}>
                    <td className="p-3 font-bold text-muted-foreground">{i + 1}</td>
                    <td className="p-3 font-semibold">{restaurants[r.id] ?? "—"}</td>
                    <td className="p-3 text-right">{r.orders}</td>
                    <td className="p-3 text-right font-bold text-primary">৳{r.revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-3 flex items-center gap-2">
          <Bike className="h-4 w-4 text-accent" />
          <h2 className="font-bold">রাইডার লিডারবোর্ড</h2>
        </div>
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : topRiders.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">ডেটা নেই</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs text-muted-foreground">
                <tr>
                  <th className="p-3 text-left font-semibold">#</th>
                  <th className="p-3 text-left font-semibold">রাইডার</th>
                  <th className="p-3 text-right font-semibold">ডেলিভারি</th>
                  <th className="p-3 text-right font-semibold">রেটিং</th>
                  <th className="p-3 text-right font-semibold">আয়</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {topRiders.map((r, i) => (
                  <tr key={r.id}>
                    <td className="p-3 font-bold text-muted-foreground">{i + 1}</td>
                    <td className="p-3 font-semibold">{riderNames[r.id] ?? "—"}</td>
                    <td className="p-3 text-right">{r.delivered}</td>
                    <td className="p-3 text-right">
                      {r.rating ? (
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3 w-3 fill-accent text-accent" />
                          {r.rating}
                          <span className="text-[10px] text-muted-foreground">({r.reviews})</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-bold text-primary">৳{r.earnings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({
  Icon,
  label,
  value,
  highlight,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-2xl border border-border p-4 shadow-card ${highlight ? "bg-primary/5" : "bg-card"}`}>
      <div className="flex items-center gap-2">
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${highlight ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="font-bangla text-xs text-muted-foreground">{label}</div>
      </div>
      <div className="mt-2 text-2xl font-extrabold">{value}</div>
    </div>
  );
}
