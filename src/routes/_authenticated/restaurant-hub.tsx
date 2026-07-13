import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Store, Plus, Pencil, Trash2, Clock, Loader2, MessageSquare } from "lucide-react";
import { ReviewList, type ReviewRow } from "@/components/ReviewList";

export const Route = createFileRoute("/_authenticated/restaurant-hub")({
  head: () => ({ meta: [{ title: "রেস্টুরেন্ট ড্যাশবোর্ড — পায়রা" }] }),
  component: RestaurantHub,
});

type Restaurant = {
  id: string; name: string; description: string | null; image_url: string | null;
  cuisine: string | null; delivery_time_min: number; min_order: number; is_open: boolean;
  open_time: string | null; close_time: string | null;
};
type MenuItem = {
  id: string; restaurant_id: string; name: string; description: string | null;
  price: number; image_url: string | null; category: string | null; is_available: boolean;
};
type FoodOrder = {
  id: string; order_code: string; status: string; total: number; items: any;
  receiver_name: string; receiver_hall: string; receiver_block_room: string | null;
  created_at: string; scheduled_for: string | null;
};

const NEXT_STATUS: Record<string, string | null> = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "picked_up",
  picked_up: null,
  delivered: null,
  cancelled: null,
};
const STATUS_LABEL: Record<string, string> = {
  pending: "অপেক্ষমান", confirmed: "কনফার্ম", preparing: "প্রস্তুত হচ্ছে",
  picked_up: "রাইডারের কাছে", delivered: "ডেলিভার্ড", cancelled: "বাতিল",
};

function RestaurantHub() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "ok" | "denied">("loading");
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [tab, setTab] = useState<"orders" | "menu" | "reviews" | "settings">("orders");

  useEffect(() => {
    (async () => {
      const { data: isOwner } = await supabase.rpc("has_role", { _user_id: user.id, _role: "restaurant" });
      if (!isOwner) {
        setState("denied");
        toast.error("অনুমতি নেই");
        setTimeout(() => navigate({ to: "/" }), 1200);
        return;
      }
      const { data } = await supabase.from("restaurants").select("*").eq("owner_id", user.id).maybeSingle();
      setRestaurant((data as Restaurant) ?? null);
      setState("ok");
    })();
  }, [user.id, navigate]);

  if (state === "loading") {
    return <div className="grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (state === "denied") return null;

  if (!restaurant) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <p className="font-bangla text-lg font-bold">রেস্টুরেন্ট বরাদ্দ করা হয়নি</p>
          <p className="mt-1 text-sm text-muted-foreground">অ্যাডমিনের সাথে যোগাযোগ করুন</p>
          <Link to="/" className="mt-4 inline-block text-primary underline">হোমে ফিরুন</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-lg">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link to="/" className="grid h-9 w-9 place-items-center rounded-lg border border-border">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Logo />
          <span className="ml-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase text-accent">
            <Store className="mr-1 inline h-3 w-3" /> owner
          </span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{restaurant.is_open ? "খোলা" : "বন্ধ"}</span>
            <Switch
              checked={restaurant.is_open}
              onCheckedChange={async (v) => {
                const { error } = await supabase.from("restaurants").update({ is_open: v }).eq("id", restaurant.id);
                if (error) return toast.error(error.message);
                setRestaurant({ ...restaurant, is_open: v });
                toast.success(v ? "খোলা হলো" : "বন্ধ হলো");
              }}
            />
          </div>
        </div>
        <div className="mx-auto flex max-w-5xl gap-1 px-4 pb-2">
          {(["orders", "menu", "reviews", "settings"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold font-bangla ${
                tab === t ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "orders" ? "অর্ডার" : t === "menu" ? "মেনু" : t === "reviews" ? "রিভিউ" : "সেটিংস"}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {tab === "orders" && <OrdersTab restaurantId={restaurant.id} />}
        {tab === "menu" && <MenuTab restaurantId={restaurant.id} />}
        {tab === "reviews" && <ReviewsTab restaurantId={restaurant.id} />}
        {tab === "settings" && <SettingsTab restaurant={restaurant} onSaved={(r) => setRestaurant(r)} />}
      </main>
    </div>
  );
}

function OrdersTab({ restaurantId }: { restaurantId: string }) {
  const [rows, setRows] = useState<FoodOrder[] | null>(null);
  const [filter, setFilter] = useState<"active" | "all">("active");

  async function load() {
    let q = supabase.from("food_orders").select("*").eq("restaurant_id", restaurantId).order("created_at", { ascending: false }).limit(50);
    if (filter === "active") q = q.in("status", ["pending", "confirmed", "preparing", "picked_up"]);
    const { data } = await q;
    setRows((data as FoodOrder[]) ?? []);
  }

  useEffect(() => { load(); }, [restaurantId, filter]);

  useEffect(() => {
    const ch = supabase
      .channel(`resto-orders-${restaurantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "food_orders", filter: `restaurant_id=eq.${restaurantId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [restaurantId, filter]);

  async function advance(o: FoodOrder) {
    const next = NEXT_STATUS[o.status];
    if (!next) return;
    const { error } = await supabase.from("food_orders").update({ status: next as any }).eq("id", o.id);
    if (error) return toast.error(error.message);
    toast.success(`স্ট্যাটাস: ${STATUS_LABEL[next]}`);
    load();
  }
  async function cancel(o: FoodOrder) {
    if (!window.confirm(`অর্ডার ${o.order_code} বাতিল করবেন?`)) return;
    const { error } = await supabase.from("food_orders").update({ status: "cancelled" as any }).eq("id", o.id);
    if (error) return toast.error(error.message);
    toast.success("বাতিল হয়েছে");
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => setFilter("active")} className={`rounded-full px-3 py-1 text-xs font-semibold ${filter === "active" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>Active</button>
        <button onClick={() => setFilter("all")} className={`rounded-full px-3 py-1 text-xs font-semibold ${filter === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>All</button>
      </div>

      {rows === null ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">কোনো অর্ডার নেই</div>
      ) : (
        <div className="space-y-2">
          {rows.map((o) => {
            const items = Array.isArray(o.items) ? o.items : [];
            const next = NEXT_STATUS[o.status];
            return (
              <div key={o.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">#{o.order_code}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        o.status === "delivered" ? "bg-green-500/10 text-green-600" :
                        o.status === "cancelled" ? "bg-destructive/10 text-destructive" :
                        "bg-primary/10 text-primary"
                      }`}>{STATUS_LABEL[o.status] ?? o.status}</span>
                      {o.scheduled_for && (
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                          <Clock className="mr-0.5 inline h-2.5 w-2.5" />
                          {new Date(o.scheduled_for).toLocaleString("bn-BD", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm font-semibold">{o.receiver_name} · {o.receiver_hall}{o.receiver_block_room ? `, ${o.receiver_block_room}` : ""}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {items.map((it: any) => `${it.name} × ${it.qty}`).join(", ")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">৳{o.total}</div>
                    <div className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                </div>
                {(next || o.status !== "cancelled" && o.status !== "delivered") && (
                  <div className="mt-3 flex gap-2">
                    {next && (
                      <Button size="sm" onClick={() => advance(o)} className="h-8 rounded-lg gradient-primary text-primary-foreground">
                        → {STATUS_LABEL[next]}
                      </Button>
                    )}
                    {o.status !== "cancelled" && o.status !== "delivered" && o.status !== "picked_up" && (
                      <Button size="sm" variant="outline" onClick={() => cancel(o)} className="h-8 rounded-lg text-destructive">
                        বাতিল
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MenuTab({ restaurantId }: { restaurantId: string }) {
  const [menu, setMenu] = useState<MenuItem[] | null>(null);

  async function load() {
    const { data } = await supabase.from("menu_items").select("*").eq("restaurant_id", restaurantId).order("category").order("name");
    setMenu((data as MenuItem[]) ?? []);
  }
  useEffect(() => { load(); }, [restaurantId]);

  async function toggleAvail(m: MenuItem, v: boolean) {
    const { error } = await supabase.from("menu_items").update({ is_available: v }).eq("id", m.id);
    if (error) return toast.error(error.message);
    setMenu((cur) => cur?.map((x) => (x.id === m.id ? { ...x, is_available: v } : x)) ?? cur);
  }
  async function del(m: MenuItem) {
    if (!window.confirm("মুছবেন?")) return;
    const { error } = await supabase.from("menu_items").delete().eq("id", m.id);
    if (error) return toast.error(error.message);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{menu?.length ?? 0} আইটেম</div>
        <MenuItemDialog restaurantId={restaurantId} onSaved={load}>
          <Button size="sm" className="h-9 rounded-lg gradient-primary text-primary-foreground">
            <Plus className="mr-1 h-4 w-4" /> নতুন আইটেম
          </Button>
        </MenuItemDialog>
      </div>

      {menu === null ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      ) : menu.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">কোনো মেনু আইটেম নেই</div>
      ) : (
        <div className="space-y-2">
          {menu.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              {m.image_url ? (
                <img src={m.image_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-secondary" />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{m.name}</div>
                <div className="truncate text-xs text-muted-foreground">{m.category ?? "—"} · ৳{m.price}</div>
              </div>
              <Switch checked={m.is_available} onCheckedChange={(v) => toggleAvail(m, v)} />
              <MenuItemDialog restaurantId={restaurantId} item={m} onSaved={load}>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><Pencil className="h-3.5 w-3.5" /></Button>
              </MenuItemDialog>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => del(m)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsTab({ restaurant, onSaved }: { restaurant: Restaurant; onSaved: (r: Restaurant) => void }) {
  const [form, setForm] = useState({
    name: restaurant.name,
    description: restaurant.description ?? "",
    cuisine: restaurant.cuisine ?? "",
    image_url: restaurant.image_url ?? "",
    delivery_time_min: restaurant.delivery_time_min,
    min_order: restaurant.min_order,
    open_time: restaurant.open_time ?? "",
    close_time: restaurant.close_time ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const payload = {
      name: form.name,
      description: form.description || null,
      cuisine: form.cuisine || null,
      image_url: form.image_url || null,
      delivery_time_min: Number(form.delivery_time_min) || 25,
      min_order: Number(form.min_order) || 0,
      open_time: form.open_time || null,
      close_time: form.close_time || null,
    };
    const { data, error } = await supabase.from("restaurants").update(payload).eq("id", restaurant.id).select().single();
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("সেভ হয়েছে");
    onSaved(data as Restaurant);
  }

  return (
    <div className="max-w-xl space-y-4 rounded-2xl border border-border bg-card p-5">
      <Field label="নাম"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
      <Field label="বিবরণ"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cuisine"><Input value={form.cuisine} onChange={(e) => setForm({ ...form, cuisine: e.target.value })} /></Field>
        <Field label="ইমেজ URL"><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="ডেলিভারি (মিনিট)"><Input type="number" value={form.delivery_time_min} onChange={(e) => setForm({ ...form, delivery_time_min: +e.target.value })} /></Field>
        <Field label="সর্বনিম্ন অর্ডার"><Input type="number" value={form.min_order} onChange={(e) => setForm({ ...form, min_order: +e.target.value })} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="খোলার সময়"><Input type="time" value={form.open_time} onChange={(e) => setForm({ ...form, open_time: e.target.value })} /></Field>
        <Field label="বন্ধের সময়"><Input type="time" value={form.close_time} onChange={(e) => setForm({ ...form, close_time: e.target.value })} /></Field>
      </div>
      <Button onClick={save} disabled={saving} className="w-full gradient-primary text-primary-foreground">
        {saving ? "সেভ হচ্ছে..." : "সেভ করুন"}
      </Button>
    </div>
  );
}

function MenuItemDialog({
  children, restaurantId, item, onSaved,
}: { children: React.ReactNode; restaurantId: string; item?: MenuItem; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: 0, image_url: "", category: "", is_available: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        name: item?.name ?? "",
        description: item?.description ?? "",
        price: item?.price ?? 0,
        image_url: item?.image_url ?? "",
        category: item?.category ?? "",
        is_available: item?.is_available ?? true,
      });
    }
  }, [open, item]);

  async function save() {
    if (!form.name.trim()) return toast.error("নাম দিন");
    if (!form.price) return toast.error("দাম দিন");
    setSaving(true);
    const payload = {
      restaurant_id: restaurantId,
      name: form.name,
      description: form.description || null,
      price: Number(form.price),
      image_url: form.image_url || null,
      category: form.category || null,
      is_available: form.is_available,
    };
    const { error } = item
      ? await supabase.from("menu_items").update(payload).eq("id", item.id)
      : await supabase.from("menu_items").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("সেভ হয়েছে");
    setOpen(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{item ? "এডিট আইটেম" : "নতুন মেনু আইটেম"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="নাম"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="বিবরণ"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="দাম (৳)"><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} /></Field>
            <Field label="ক্যাটাগরি"><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
          </div>
          <Field label="ইমেজ URL"><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={form.is_available} onCheckedChange={(v) => setForm({ ...form, is_available: v })} />
            <span>Available</span>
          </label>
          <Button onClick={save} disabled={saving} className="w-full gradient-primary text-primary-foreground">
            {saving ? "সেভ হচ্ছে..." : "সেভ করুন"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
