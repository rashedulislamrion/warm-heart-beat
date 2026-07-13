import { createFileRoute, Link, Outlet, useMatches } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { FloatingActions } from "@/components/FloatingActions";
import { Logo } from "@/components/Logo";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Star, Clock, UtensilsCrossed, ShoppingBag } from "lucide-react";
import { useCart, cartCount, cartTotal } from "@/lib/cart";

export const Route = createFileRoute("/food")({
  head: () => ({
    meta: [
      { title: "খাবার অর্ডার — পায়রা" },
      { name: "description", content: "CU ক্যাম্পাসের প্রিয় রেস্টুরেন্ট থেকে খাবার অর্ডার করুন।" },
    ],
  }),
  component: FoodLayout,
});

type Restaurant = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  cuisine: string | null;
  rating: number;
  delivery_time_min: number;
  min_order: number;
  is_open: boolean;
};

function FoodLayout() {
  const matches = useMatches();
  const isChild = matches.some((m) => m.routeId !== "/food" && m.routeId.startsWith("/food"));
  if (isChild) return <Outlet />;
  return <FoodIndex />;
}

function FoodIndex() {
  const [rows, setRows] = useState<Restaurant[] | null>(null);
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number }>>({});
  const items = useCart();
  const count = cartCount(items);
  const total = cartTotal(items);

  useEffect(() => {
    supabase
      .from("restaurants")
      .select("id, name, description, image_url, cuisine, rating, delivery_time_min, min_order, is_open")
      .order("rating", { ascending: false })
      .then(({ data }) => setRows((data as Restaurant[]) ?? []));
    (supabase.rpc as any)("restaurant_ratings").then(({ data }: { data: any[] | null }) => {
      const map: Record<string, { avg: number; count: number }> = {};
      (data ?? []).forEach((r) => {
        map[r.restaurant_id] = { avg: Number(r.avg_rating) || 0, count: Number(r.review_count) || 0 };
      });
      setRatings(map);
    });
  }, []);

  return (
    <div className="min-h-screen gradient-hero pb-32">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 pt-6">
        <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
        <Logo />
        <div className="w-5" />
      </header>

      <div className="animate-fade-up mx-auto mt-4 max-w-3xl px-4">
        <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-[11px] font-semibold text-accent">
          <UtensilsCrossed className="h-3 w-3" />
          <span className="font-bangla">খাবার অর্ডার</span>
        </div>
        <h1 className="font-bangla text-2xl font-extrabold leading-tight">
          ক্যাম্পাসের প্রিয় রেস্টুরেন্ট
        </h1>
        <p className="mt-1 font-bangla text-sm text-muted-foreground">
          সরাসরি হলে ডেলিভারি — দ্রুত, গরম, বন্ধুত্বপূর্ণ দামে
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {rows === null
            ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-3xl" />)
            : rows.map((r) => (
                <Link
                  key={r.id}
                  to="/food/$restaurantId"
                  params={{ restaurantId: r.id }}
                  className="group relative overflow-hidden rounded-3xl border border-border bg-card shadow-card transition-all hover:-translate-y-0.5 hover:shadow-soft"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                    {r.image_url && (
                      <img
                        src={r.image_url}
                        alt={r.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    )}
                    {!r.is_open && (
                      <div className="absolute inset-0 grid place-items-center bg-black/50 text-sm font-bold text-white">
                        বন্ধ
                      </div>
                    )}
                    <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[11px] font-bold text-foreground shadow-soft">
                      <Star className="h-3 w-3 fill-accent text-accent" />
                      {(ratings[r.id]?.avg ?? r.rating).toFixed(1)}
                      {ratings[r.id]?.count ? (
                        <span className="ml-0.5 font-normal text-muted-foreground">({ratings[r.id]!.count})</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-bold">{r.name}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {r.cuisine} · {r.description}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {r.delivery_time_min} মিনিট
                      </span>
                      <span className="font-bangla">সর্বনিম্ন ৳{r.min_order}</span>
                    </div>
                  </div>
                </Link>
              ))}
        </div>
      </div>

      {count > 0 && (
        <Link
          to="/checkout"
          className="fixed bottom-20 left-1/2 z-40 flex w-[min(92%,28rem)] -translate-x-1/2 items-center justify-between rounded-full gradient-primary px-5 py-3 text-primary-foreground shadow-soft md:bottom-6"
        >
          <span className="inline-flex items-center gap-2 font-semibold">
            <ShoppingBag className="h-4 w-4" />
            {count} আইটেম
          </span>
          <span className="font-bangla text-sm font-bold">চেকআউট · ৳{total}</span>
        </Link>
      )}

      <FloatingActions />
      <MobileBottomNav />
    </div>
  );
}
