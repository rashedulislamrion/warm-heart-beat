import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { FloatingActions } from "@/components/FloatingActions";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Star, Clock, Plus, Minus, ShoppingBag, MessageSquare } from "lucide-react";
import { cart, useCart, cartCount, cartTotal, type CartItem } from "@/lib/cart";
import { StarDisplay } from "@/components/Stars";
import { useFavorites, useCurrentUserId } from "@/lib/favorites";
import { FavoriteHeart } from "@/components/FavoriteHeart";

export const Route = createFileRoute("/food/$restaurantId")({
  head: ({ loaderData }) => {
    const d = loaderData as { name?: string } | undefined;
    return {
      meta: [{ title: d?.name ? `${d.name} — পায়রা` : "রেস্টুরেন্ট — পায়রা" }],
    };
  },
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("restaurants")
      .select("id, name, description, image_url, cuisine, rating, delivery_time_min, min_order, is_open")
      .eq("id", params.restaurantId)
      .maybeSingle();
    if (!data) throw notFound();
    return data;
  },
  errorComponent: ({ error }) => <div className="p-8 text-center text-sm">{error.message}</div>,
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <p className="font-bangla text-lg font-bold">রেস্টুরেন্ট খুঁজে পাওয়া যায়নি</p>
        <Link to="/food" className="mt-3 inline-flex text-primary underline">
          ফিরে যান
        </Link>
      </div>
    </div>
  ),
  component: RestaurantPage,
});

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  is_available: boolean;
};

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

function RestaurantPage() {
  const r = Route.useLoaderData();
  const [menu, setMenu] = useState<MenuItem[] | null>(null);
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const items = useCart();
  const count = cartCount(items);
  const total = cartTotal(items);
  const uid = useCurrentUserId();
  const { ids: favIds, toggle: toggleFav } = useFavorites(uid);

  useEffect(() => {
    supabase
      .from("menu_items")
      .select("id, name, description, price, image_url, category, is_available")
      .eq("restaurant_id", r.id)
      .order("category", { ascending: true })
      .then(({ data }) => setMenu((data as MenuItem[]) ?? []));
    supabase
      .from("reviews" as any)
      .select("id, rating, comment, created_at")
      .eq("restaurant_id", r.id)
      .not("comment", "is", null)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setReviews(((data ?? []) as unknown) as Review[]));
  }, [r.id]);

  const categories = useMemo(() => {
    if (!menu) return [];
    const map = new Map<string, MenuItem[]>();
    menu.forEach((m) => {
      const cat = m.category ?? "মেনু";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(m);
    });
    return Array.from(map.entries());
  }, [menu]);

  function qtyOf(id: string) {
    return items.find((i) => i.id === id)?.qty ?? 0;
  }

  function addItem(m: MenuItem) {
    if (!m.is_available) return;
    const item: Omit<CartItem, "qty"> = {
      id: m.id,
      name: m.name,
      price: m.price,
      image_url: m.image_url,
      restaurant_id: r.id,
      restaurant_name: r.name,
    };
    // Cross-restaurant guard
    const existing = cart.get();
    if (existing.length && existing[0]!.restaurant_id !== r.id) {
      const ok = window.confirm("অন্য রেস্টুরেন্টের কার্ট আছে। এটি পরিষ্কার করে যোগ করবেন?");
      if (!ok) return;
    }
    cart.add(item, r.name);
    toast.success(`${m.name} যোগ হয়েছে`);
  }

  return (
    <div className="min-h-screen bg-background pb-40">
      <div className="relative">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
          {r.image_url && (
            <img src={r.image_url} alt={r.name} className="h-full w-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/40" />
        </div>
        <Link
          to="/food"
          className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/95 shadow-soft"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        {uid && (
          <FavoriteHeart
            active={favIds.has(r.id)}
            onClick={() => toggleFav(r.id)}
            className="absolute right-4 top-4"
            size={20}
          />
        )}
      </div>

      <div className="mx-auto -mt-8 max-w-3xl px-4">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold">{r.name}</h1>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {r.cuisine} · {r.description}
              </p>
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-accent text-accent" /> {r.rating.toFixed(1)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> {r.delivery_time_min} মিনিট
                </span>
                <span className="font-bangla">সর্বনিম্ন ৳{r.min_order}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-8">
          {menu === null
            ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)
            : categories.map(([cat, list]) => (
                <div key={cat}>
                  <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    {cat}
                  </h2>
                  <div className="space-y-3">
                    {list.map((m) => {
                      const q = qtyOf(m.id);
                      return (
                        <div
                          key={m.id}
                          className="flex gap-3 rounded-2xl border border-border bg-card p-3 shadow-card"
                        >
                          {m.image_url && (
                            <img
                              src={m.image_url}
                              alt={m.name}
                              className="h-20 w-20 shrink-0 rounded-xl object-cover"
                              loading="lazy"
                            />
                          )}
                          <div className="flex min-w-0 flex-1 flex-col">
                            <div className="font-semibold leading-tight">{m.name}</div>
                            <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                              {m.description}
                            </div>
                            <div className="mt-auto flex items-center justify-between pt-2">
                              <div className="text-sm font-bold text-primary">৳{m.price}</div>
                              {q > 0 ? (
                                <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-1">
                                  <button
                                    onClick={() => cart.dec(m.id)}
                                    className="grid h-7 w-7 place-items-center rounded-full text-primary"
                                    aria-label="কমান"
                                  >
                                    <Minus className="h-3.5 w-3.5" />
                                  </button>
                                  <span className="min-w-[1ch] text-sm font-bold">{q}</span>
                                  <button
                                    onClick={() => cart.inc(m.id)}
                                    className="grid h-7 w-7 place-items-center rounded-full text-primary"
                                    aria-label="বাড়ান"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => addItem(m)}
                                  disabled={!m.is_available}
                                  className="h-8 rounded-full gradient-primary px-3 text-xs font-semibold text-primary-foreground"
                                >
                                  <Plus className="mr-1 h-3.5 w-3.5" /> যোগ করুন
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
        </div>

        {/* Reviews */}
        <div className="mt-10">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            রিভিউ
          </h2>
          {reviews === null ? (
            <div className="space-y-3">
              {[0, 1].map((i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center">
              <p className="font-bangla text-sm text-muted-foreground">এখনও কোনো রিভিউ নেই</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((rv) => (
                <div key={rv.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                  <div className="flex items-center justify-between">
                    <StarDisplay value={rv.rating} size={14} />
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(rv.created_at).toLocaleDateString("bn-BD")}
                    </span>
                  </div>
                  {rv.comment && (
                    <p className="mt-2 font-bangla text-sm leading-relaxed">{rv.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
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
