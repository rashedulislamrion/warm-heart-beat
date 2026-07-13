import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Store, UserPlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/restaurants")({
  component: RestaurantsAdmin,
});

type Restaurant = {
  id: string; name: string; description: string | null; image_url: string | null;
  cuisine: string | null; rating: number; delivery_time_min: number; min_order: number; is_open: boolean;
  owner_id: string | null;
};
type MenuItem = {
  id: string; restaurant_id: string; name: string; description: string | null;
  price: number; image_url: string | null; category: string | null; is_available: boolean;
};

function RestaurantsAdmin() {
  const [rows, setRows] = useState<Restaurant[] | null>(null);
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [menu, setMenu] = useState<MenuItem[] | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase.from("restaurants").select("*").order("name");
    setRows((data as Restaurant[]) ?? []);
  }
  async function loadMenu(id: string) {
    setMenu(null);
    const { data } = await supabase.from("menu_items").select("*").eq("restaurant_id", id).order("category");
    setMenu((data as MenuItem[]) ?? []);
  }

  useEffect(() => {
    if (selected) loadMenu(selected.id);
  }, [selected?.id]);

  async function toggleOpen(r: Restaurant, is_open: boolean) {
    const { error } = await supabase.from("restaurants").update({ is_open } as any).eq("id", r.id);
    if (error) return toast.error(error.message);
    setRows((cur) => cur?.map((x) => (x.id === r.id ? { ...x, is_open } : x)) ?? cur);
  }

  async function deleteRestaurant(r: Restaurant) {
    if (!window.confirm(`"${r.name}" মুছবেন?`)) return;
    const { error } = await supabase.from("restaurants").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("মুছে ফেলা হয়েছে");
    setRows((cur) => cur?.filter((x) => x.id !== r.id) ?? cur);
    if (selected?.id === r.id) setSelected(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">রেস্টুরেন্ট</h1>
          <p className="text-sm text-muted-foreground">রেস্টুরেন্ট ও মেনু ম্যানেজ করুন</p>
        </div>
        <RestaurantDialog onSaved={load}>
          <Button className="rounded-lg gradient-primary text-primary-foreground">
            <Plus className="mr-1 h-4 w-4" /> নতুন
          </Button>
        </RestaurantDialog>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
        <div className="space-y-2">
          {rows === null
            ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
            : rows.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                    selected?.id === r.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  {r.image_url ? (
                    <img src={r.image_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
                  ) : (
                    <div className="grid h-12 w-12 place-items-center rounded-lg bg-secondary text-muted-foreground">
                      <Store className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{r.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{r.cuisine}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Switch checked={r.is_open} onCheckedChange={(v) => toggleOpen(r, v)} onClick={(e) => e.stopPropagation()} />
                    <span className="text-[10px] text-muted-foreground">{r.is_open ? "খোলা" : "বন্ধ"}</span>
                  </div>
                </button>
              ))}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          {!selected ? (
            <div className="grid h-40 place-items-center text-sm text-muted-foreground">
              একটি রেস্টুরেন্ট বাছাই করুন
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold">{selected.name}</h2>
                  <p className="text-xs text-muted-foreground">{selected.description}</p>
                </div>
                <div className="flex gap-1">
                  <AssignOwnerDialog restaurant={selected} onSaved={load}>
                    <Button size="sm" variant="outline" className="h-8 rounded-lg" title="Assign Owner">
                      <UserPlus className="h-3.5 w-3.5" />
                    </Button>
                  </AssignOwnerDialog>
                  <RestaurantDialog restaurant={selected} onSaved={load}>
                    <Button size="sm" variant="outline" className="h-8 rounded-lg">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </RestaurantDialog>
                  <Button size="sm" variant="outline" onClick={() => deleteRestaurant(selected)}
                    className="h-8 rounded-lg text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-4">
                <h3 className="font-semibold">মেনু</h3>
                <MenuItemDialog restaurantId={selected.id} onSaved={() => loadMenu(selected.id)}>
                  <Button size="sm" className="h-8 rounded-lg gradient-primary text-primary-foreground">
                    <Plus className="mr-1 h-3.5 w-3.5" /> আইটেম
                  </Button>
                </MenuItemDialog>
              </div>

              <div className="space-y-2">
                {menu === null ? (
                  [...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)
                ) : menu.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    কোনো মেনু আইটেম নেই
                  </div>
                ) : (
                  menu.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
                      {m.image_url && <img src={m.image_url} alt="" className="h-10 w-10 rounded-md object-cover" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-semibold">{m.name}</div>
                          {!m.is_available && <span className="text-[10px] text-destructive">unavailable</span>}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">{m.category} · ৳{m.price}</div>
                      </div>
                      <div className="flex gap-1">
                        <MenuItemDialog restaurantId={selected.id} item={m} onSaved={() => loadMenu(selected.id)}>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </MenuItemDialog>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive"
                          onClick={async () => {
                            if (!window.confirm("মুছবেন?")) return;
                            const { error } = await supabase.from("menu_items").delete().eq("id", m.id);
                            if (error) return toast.error(error.message);
                            loadMenu(selected.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RestaurantDialog({
  children, restaurant, onSaved,
}: { children: React.ReactNode; restaurant?: Restaurant; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", cuisine: "", image_url: "",
    delivery_time_min: 25, min_order: 100, rating: 4.5,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        name: restaurant?.name ?? "",
        description: restaurant?.description ?? "",
        cuisine: restaurant?.cuisine ?? "",
        image_url: restaurant?.image_url ?? "",
        delivery_time_min: restaurant?.delivery_time_min ?? 25,
        min_order: restaurant?.min_order ?? 100,
        rating: restaurant?.rating ?? 4.5,
      });
    }
  }, [open, restaurant]);

  async function save() {
    if (!form.name.trim()) return toast.error("নাম দিন");
    setSaving(true);
    const payload = {
      name: form.name,
      description: form.description || null,
      cuisine: form.cuisine || null,
      image_url: form.image_url || null,
      delivery_time_min: Number(form.delivery_time_min) || 25,
      min_order: Number(form.min_order) || 0,
      rating: Number(form.rating) || 4.5,
    };
    const { error } = restaurant
      ? await supabase.from("restaurants").update(payload as any).eq("id", restaurant.id)
      : await supabase.from("restaurants").insert(payload as any);
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
        <DialogHeader><DialogTitle>{restaurant ? "এডিট" : "নতুন রেস্টুরেন্ট"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="নাম"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="বিবরণ"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cuisine"><Input value={form.cuisine} onChange={(e) => setForm({ ...form, cuisine: e.target.value })} /></Field>
            <Field label="রেটিং"><Input type="number" step="0.1" value={form.rating} onChange={(e) => setForm({ ...form, rating: +e.target.value })} /></Field>
          </div>
          <Field label="ইমেজ URL"><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ডেলিভারি (মিনিট)"><Input type="number" value={form.delivery_time_min} onChange={(e) => setForm({ ...form, delivery_time_min: +e.target.value })} /></Field>
            <Field label="সর্বনিম্ন অর্ডার"><Input type="number" value={form.min_order} onChange={(e) => setForm({ ...form, min_order: +e.target.value })} /></Field>
          </div>
          <Button onClick={save} disabled={saving} className="w-full gradient-primary text-primary-foreground">
            {saving ? "সেভ হচ্ছে..." : "সেভ করুন"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MenuItemDialog({
  children, restaurantId, item, onSaved,
}: { children: React.ReactNode; restaurantId: string; item?: MenuItem; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", price: 0, image_url: "", category: "", is_available: true,
  });
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
      ? await supabase.from("menu_items").update(payload as any).eq("id", item.id)
      : await supabase.from("menu_items").insert(payload as any);
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

function AssignOwnerDialog({
  children, restaurant, onSaved,
}: { children: React.ReactNode; restaurant: Restaurant; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [ownerName, setOwnerName] = useState<string | null>(null);

  useEffect(() => {
    if (open && restaurant.owner_id) {
      supabase.from("profiles").select("full_name, phone").eq("id", restaurant.owner_id).maybeSingle()
        .then(({ data }) => setOwnerName(data ? `${data.full_name ?? ""} (${data.phone ?? ""})` : null));
    } else {
      setOwnerName(null);
      setPhone("");
    }
  }, [open, restaurant.owner_id]);

  async function assign() {
    const p = phone.trim();
    if (!p) return toast.error("ফোন দিন");
    setSaving(true);
    const { data: prof, error: e1 } = await supabase.from("profiles").select("id, full_name").eq("phone", p).maybeSingle();
    if (e1 || !prof) { setSaving(false); return toast.error("এই ফোনে কোনো ব্যবহারকারী নেই"); }
    const { error } = await supabase.rpc("assign_restaurant_owner", { _restaurant_id: restaurant.id, _user_id: prof.id });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`${prof.full_name ?? "user"} কে মালিক হিসেবে বরাদ্দ করা হলো`);
    setOpen(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>রেস্টুরেন্ট মালিক বরাদ্দ</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            বর্তমান মালিক: <span className="font-semibold text-foreground">{ownerName ?? "কেউ নেই"}</span>
          </div>
          <Field label="ব্যবহারকারীর ফোন নম্বর">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+8801..." />
          </Field>
          <p className="text-xs text-muted-foreground">
            নির্বাচিত ব্যবহারকারী "restaurant" রোল পাবেন এবং /restaurant-hub এ অ্যাক্সেস পাবেন।
          </p>
          <Button onClick={assign} disabled={saving} className="w-full gradient-primary text-primary-foreground">
            {saving ? "সেভ হচ্ছে..." : "বরাদ্দ করুন"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
