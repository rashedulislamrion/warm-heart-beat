import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { FloatingActions } from "@/components/FloatingActions";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MALE_HALLS, FEMALE_HALLS, OTHER_LOCATIONS, calculateDeliveryCharge } from "@/lib/halls";
import { cart, useCart, cartTotal, cartCount } from "@/lib/cart";
import { fireConfetti } from "@/lib/confetti";
import { PromoAndCredits } from "@/components/PromoAndCredits";
import { SchedulePicker, formatSchedule, type Schedule } from "@/components/SchedulePicker";
import { ArrowLeft, Clock, Loader2, Minus, Plus, PartyPopper, ShoppingBag, Trash2, Copy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({ meta: [{ title: "চেকআউট — পায়রা" }] }),
  component: CheckoutPage,
});

const phoneRx = /^01[3-9]\d{8}$/;
const schema = z.object({
  receiver_name: z.string().trim().min(2, "নাম দিন"),
  receiver_phone: z.string().regex(phoneRx, "সঠিক ফোন নম্বর দিন"),
  receiver_hall: z.string().min(1, "হল বাছাই করুন"),
  receiver_block_room: z.string().trim().min(1, "ব্লক/রুম দিন"),
});

const DEFAULT_ORIGIN = "Gate-1";

function CheckoutPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const items = useCart();
  const [form, setForm] = useState({
    receiver_name: "",
    receiver_phone: "",
    receiver_hall: "",
    receiver_block_room: "",
    receiver_landmark: "",
    note: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [restaurantOrigin, setRestaurantOrigin] = useState<string>(DEFAULT_ORIGIN);
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<Schedule>({ mode: "now", iso: null });
  const [payMethod, setPayMethod] = useState<"cod" | "wallet">("cod");
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [discounts, setDiscounts] = useState<{ promoCode: string | null; promoDiscount: number; creditsUsed: number }>({
    promoCode: null,
    promoDiscount: 0,
    creditsUsed: 0,
  });
  const onDiscountsChange = useCallback(
    (v: { promoCode: string | null; promoDiscount: number; creditsUsed: number }) => setDiscounts(v),
    [],
  );

  useEffect(() => {
    (supabase.rpc as any)("my_wallet_balance").then(({ data }: any) => {
      setWalletBalance(typeof data === "number" ? data : 0);
    });
  }, []);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (p) {
        setForm((s) => ({
          ...s,
          receiver_name: p.full_name ?? "",
          receiver_phone: p.phone ?? "",
          receiver_hall: p.hall ?? "",
          receiver_block_room: p.block_room ?? "",
        }));
      }
    })();
  }, [user.id]);

  const subtotal = cartTotal(items);
  const deliveryCharge = useMemo(
    () => (form.receiver_hall ? calculateDeliveryCharge(restaurantOrigin, form.receiver_hall, "small") : 30),
    [form.receiver_hall, restaurantOrigin],
  );
  const totalBeforeDiscount = subtotal + deliveryCharge;
  const totalDiscount = discounts.promoDiscount + discounts.creditsUsed;
  const total = Math.max(0, totalBeforeDiscount - totalDiscount);

  const restaurant_id = items[0]?.restaurant_id ?? null;
  const restaurant_name = items[0]?.restaurant_name ?? "";

  useEffect(() => {
    if (!restaurant_id) return;
    supabase.from("restaurants").select("location").eq("id", restaurant_id).maybeSingle()
      .then(({ data }) => {
        const loc = (data as { location?: string } | null)?.location;
        if (loc) setRestaurantOrigin(loc);
      });
  }, [restaurant_id]);

  async function submit() {
    if (!items.length || !restaurant_id) return;
    const r = schema.safeParse(form);
    if (!r.success) return toast.error(r.error.issues[0]!.message);
    if (schedule.mode === "later") {
      if (!schedule.iso) return toast.error("সময় বেছে নিন");
      if (new Date(schedule.iso).getTime() < Date.now() + 25 * 60 * 1000) {
        return toast.error("কমপক্ষে ৩০ মিনিট পরের সময় দিন");
      }
    }

    if (payMethod === "wallet" && walletBalance < total) {
      setSubmitting(false);
      return toast.error("ওয়ালেটে যথেষ্ট ব্যালেন্স নেই");
    }

    setSubmitting(true);

    // Re-validate availability & pricing right before placing order
    const ids = items.map((i) => i.id);
    const { data: fresh, error: freshErr } = await supabase
      .from("menu_items")
      .select("id, name, price, is_available")
      .in("id", ids);
    if (freshErr) {
      setSubmitting(false);
      return toast.error(freshErr.message);
    }
    const byId = new Map((fresh ?? []).map((m: any) => [m.id, m]));
    for (const it of items) {
      const cur = byId.get(it.id);
      if (!cur) { setSubmitting(false); return toast.error(`"${it.name}" আর নেই`); }
      if (!cur.is_available) { setSubmitting(false); return toast.error(`"${it.name}" এখন অনুপলব্ধ`); }
      if (Number(cur.price) !== it.price) {
        setSubmitting(false);
        return toast.error(`"${it.name}" এর দাম পরিবর্তন হয়েছে, কার্ট রিফ্রেশ করুন`);
      }
    }

    const { data, error } = await supabase
      .from("food_orders")
      .insert({
        user_id: user.id,
        restaurant_id,
        items: items.map((i) => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
        subtotal,
        delivery_charge: deliveryCharge,
        total,
        receiver_name: form.receiver_name,
        receiver_phone: form.receiver_phone,
        receiver_hall: form.receiver_hall,
        receiver_block_room: form.receiver_block_room,
        receiver_landmark: form.receiver_landmark || null,
        note: form.note || null,
        scheduled_for: schedule.mode === "later" ? schedule.iso : null,
      })
      .select("id, order_code")
      .single();
    if (error || !data) {
      setSubmitting(false);
      return toast.error(error?.message ?? "অর্ডার ব্যর্থ");
    }

    // Apply promo + credits after successful insert (best-effort; discount already baked in total)
    if (discounts.promoCode) {
      const { error: pe } = await (supabase.rpc as any)("redeem_promo", {
        _code: discounts.promoCode,
        _order_type: "food",
        _order_id: data.id,
        _subtotal: subtotal,
      });
      if (pe) console.warn("promo redeem failed", pe.message);
    }
    if (discounts.creditsUsed > 0) {
      const { error: ce } = await (supabase.rpc as any)("redeem_credits", {
        _amount: discounts.creditsUsed,
        _order_type: "food",
        _order_id: data.id,
      });
      if (ce) console.warn("credits redeem failed", ce.message);
    }

    setSubmitting(false);
    cart.clear();
    setOrderCode(data.order_code);
    fireConfetti();
    toast.success("অর্ডার কনফার্ম হয়েছে! 🎉");
  }

  if (orderCode) {
    return (
      <div className="grid min-h-screen place-items-center gradient-hero px-4">
        <div className="animate-fade-up w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-card">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full gradient-accent text-accent-foreground shadow-warm">
            <PartyPopper className="h-8 w-8" />
          </div>
          <h1 className="mt-4 font-bangla text-2xl font-extrabold">অর্ডার কনফার্ম!</h1>
          <p className="mt-1 font-bangla text-sm text-muted-foreground">
            শীঘ্রই আপনার সাথে যোগাযোগ করা হবে
          </p>
          <div className="mt-4 rounded-2xl bg-secondary/40 p-4">
            <div className="text-xs text-muted-foreground">অর্ডার কোড</div>
            <div className="mt-1 flex items-center justify-center gap-2 text-xl font-extrabold text-primary">
              {orderCode}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(orderCode);
                  toast.success("কপি হয়েছে");
                }}
              >
                <Copy className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
          <div className="mt-6 flex gap-2">
            <Button asChild variant="outline" className="flex-1 rounded-xl">
              <Link to="/orders">আমার অর্ডার</Link>
            </Button>
            <Button asChild className="flex-1 rounded-xl gradient-primary text-primary-foreground">
              <Link to="/food">আরো অর্ডার</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="grid min-h-screen place-items-center gradient-hero px-4 text-center">
        <div>
          <ShoppingBag className="mx-auto h-14 w-14 text-muted-foreground/40" />
          <p className="mt-4 font-bangla text-muted-foreground">কার্ট খালি</p>
          <Link
            to="/food"
            className="mt-4 inline-flex rounded-full gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-soft"
          >
            <span className="font-bangla">রেস্টুরেন্ট দেখুন</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero pb-32">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 pt-6">
        <button onClick={() => navigate({ to: "/food" })}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Logo />
        <div className="w-5" />
      </header>

      <div className="animate-fade-up mx-auto mt-4 max-w-2xl space-y-4 px-4">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-bold">{restaurant_name}</h2>
              <p className="text-xs text-muted-foreground">{cartCount(items)} আইটেম</p>
            </div>
            <button
              onClick={() => cart.clear()}
              className="text-xs text-destructive inline-flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" /> খালি করুন
            </button>
          </div>
          <div className="space-y-3">
            {items.map((i) => (
              <div key={i.id} className="flex items-center gap-3">
                {i.image_url && (
                  <img src={i.image_url} alt={i.name} className="h-12 w-12 rounded-lg object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{i.name}</div>
                  <div className="text-xs text-muted-foreground">৳{i.price}</div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-1">
                  <button
                    onClick={() => cart.dec(i.id)}
                    className="grid h-7 w-7 place-items-center rounded-full text-primary"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="min-w-[1ch] text-sm font-bold">{i.qty}</span>
                  <button
                    onClick={() => cart.inc(i.id)}
                    className="grid h-7 w-7 place-items-center rounded-full text-primary"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="w-14 text-right text-sm font-bold">৳{i.price * i.qty}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-3 font-bangla text-lg font-extrabold">ডেলিভারি ঠিকানা</h2>
          <div className="space-y-3">
            <div>
              <Label>নাম</Label>
              <Input
                value={form.receiver_name}
                onChange={(e) => setForm({ ...form, receiver_name: e.target.value })}
                className="mt-1.5 h-11 rounded-xl"
              />
            </div>
            <div>
              <Label>ফোন</Label>
              <Input
                inputMode="tel"
                placeholder="01XXXXXXXXX"
                value={form.receiver_phone}
                onChange={(e) => setForm({ ...form, receiver_phone: e.target.value })}
                className="mt-1.5 h-11 rounded-xl"
              />
            </div>
            <div>
              <Label>হল / লোকেশন</Label>
              <Select
                value={form.receiver_hall}
                onValueChange={(v) => setForm({ ...form, receiver_hall: v })}
              >
                <SelectTrigger className="mt-1.5 h-11 rounded-xl">
                  <SelectValue placeholder="বাছাই করুন" />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 pt-2 text-[10px] font-semibold uppercase text-muted-foreground">
                    ছেলেদের হল
                  </div>
                  {MALE_HALLS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  <div className="px-2 pt-2 text-[10px] font-semibold uppercase text-muted-foreground">
                    মেয়েদের হল
                  </div>
                  {FEMALE_HALLS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  <div className="px-2 pt-2 text-[10px] font-semibold uppercase text-muted-foreground">
                    অন্যান্য
                  </div>
                  {OTHER_LOCATIONS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>ব্লক / রুম</Label>
              <Input
                value={form.receiver_block_room}
                onChange={(e) => setForm({ ...form, receiver_block_room: e.target.value })}
                className="mt-1.5 h-11 rounded-xl"
              />
            </div>
            <div>
              <Label>নোট (ঐচ্ছিক)</Label>
              <Textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                className="mt-1.5 min-h-20 rounded-xl"
                maxLength={300}
              />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
          <SchedulePicker value={schedule} onChange={setSchedule} />
          {schedule.mode === "later" && schedule.iso && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-accent/10 p-3 text-sm text-accent">
              <Clock className="h-4 w-4" />
              <span className="font-bangla">{formatSchedule(schedule.iso)} এ ডেলিভারি হবে</span>
            </div>
          )}
        </div>

        <PromoAndCredits subtotal={subtotal} orderType="food" onChange={onDiscountsChange} />

        <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="font-bangla text-muted-foreground">সাবটোটাল</span>
              <span className="font-bold">৳{subtotal}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bangla text-muted-foreground">ডেলিভারি চার্জ</span>
              <span className="font-bold">৳{deliveryCharge}</span>
            </div>
            {discounts.promoDiscount > 0 && (
              <div className="flex justify-between">
                <span className="font-bangla text-muted-foreground">প্রোমো ({discounts.promoCode})</span>
                <span className="font-bold text-success">−৳{discounts.promoDiscount}</span>
              </div>
            )}
            {discounts.creditsUsed > 0 && (
              <div className="flex justify-between">
                <span className="font-bangla text-muted-foreground">ক্রেডিট</span>
                <span className="font-bold text-success">−৳{discounts.creditsUsed}</span>
              </div>
            )}
            <div className="mt-3 flex justify-between border-t pt-3 text-lg">
              <span className="font-bangla font-bold">মোট</span>
              <span className="font-extrabold text-primary">৳{total}</span>
            </div>
            <div className="mt-1 font-bangla text-xs text-muted-foreground">Cash on Delivery</div>
          </div>
        </div>


        <Button
          onClick={submit}
          disabled={submitting}
          className="h-14 w-full rounded-2xl gradient-accent text-base font-bold text-accent-foreground shadow-warm"
        >
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : `অর্ডার কনফার্ম করুন · ৳${total}`}
        </Button>
      </div>

      <FloatingActions />
      <MobileBottomNav />
    </div>
  );
}
