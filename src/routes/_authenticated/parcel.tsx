import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import {
  MALE_HALLS,
  FEMALE_HALLS,
  OTHER_LOCATIONS,
  calculateDeliveryCharge,
} from "@/lib/halls";
import { fireConfetti } from "@/lib/confetti";
import { SchedulePicker, formatSchedule, type Schedule } from "@/components/SchedulePicker";
import {
  ArrowLeft, ArrowRight, Check, Package, User, MapPin, Boxes, Wallet,
  FileText, Pill, ShoppingBag, Shirt, Cpu, Loader2, PartyPopper, Share2, Copy,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/parcel")({
  head: () => ({ meta: [{ title: "পার্সেল পাঠান — পায়রা" }] }),
  component: ParcelFlow,
});

type Step = 1 | 2 | 3 | 4;

type ParcelState = {
  sender_name: string; sender_phone: string; sender_hall: string;
  sender_block_room: string; sender_landmark: string;
  receiver_name: string; receiver_phone: string; receiver_hall: string;
  receiver_block_room: string; receiver_landmark: string;
  item_type: "document" | "medicine" | "grocery" | "clothes" | "electronics" | "other";
  size: "small" | "medium" | "large";
  description: string;
  note: string;
};

const empty: ParcelState = {
  sender_name: "", sender_phone: "", sender_hall: "", sender_block_room: "", sender_landmark: "",
  receiver_name: "", receiver_phone: "", receiver_hall: "", receiver_block_room: "", receiver_landmark: "",
  item_type: "document", size: "small", description: "", note: "",
};

const phoneRx = /^01[3-9]\d{8}$/;
const step1Schema = z.object({
  sender_name: z.string().trim().min(2, "নাম দিন").max(80),
  sender_phone: z.string().regex(phoneRx, "সঠিক ফোন নম্বর দিন"),
  sender_hall: z.string().min(1, "হল বাছাই করুন"),
  sender_block_room: z.string().trim().min(1, "ব্লক/রুম দিন").max(60),
});
const step2Schema = z.object({
  receiver_name: z.string().trim().min(2, "নাম দিন").max(80),
  receiver_phone: z.string().regex(phoneRx, "সঠিক ফোন নম্বর দিন"),
  receiver_hall: z.string().min(1, "হল বাছাই করুন"),
  receiver_block_room: z.string().trim().min(1, "ব্লক/রুম দিন").max(60),
});

const itemTypes = [
  { v: "document", label: "ডকুমেন্ট", Icon: FileText },
  { v: "medicine", label: "ঔষধ", Icon: Pill },
  { v: "grocery", label: "গ্রোসারি", Icon: ShoppingBag },
  { v: "clothes", label: "কাপড়", Icon: Shirt },
  { v: "electronics", label: "ইলেকট্রনিকস", Icon: Cpu },
  { v: "other", label: "অন্যান্য", Icon: Boxes },
] as const;

const sizes = [
  { v: "small", label: "ছোট", desc: "≤ ১ কেজি" },
  { v: "medium", label: "মাঝারি", desc: "১-৩ কেজি" },
  { v: "large", label: "বড়", desc: "৩-৭ কেজি" },
] as const;

function ParcelFlow() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [data, setData] = useState<ParcelState>(empty);
  const [submitting, setSubmitting] = useState(false);
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Prefill sender from profile
  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (!p || !p.profile_complete) {
        navigate({ to: "/profile-setup", search: { redirect: "/parcel" } });
        return;
      }
      setData((s) => ({
        ...s,
        sender_name: p.full_name ?? "",
        sender_phone: p.phone ?? "",
        sender_hall: p.hall ?? "",
        sender_block_room: p.block_room ?? "",
      }));
      setProfileLoaded(true);
    })();
  }, [user.id, navigate]);

  const charge = useMemo(
    () => calculateDeliveryCharge(data.sender_hall, data.receiver_hall, data.size),
    [data.sender_hall, data.receiver_hall, data.size],
  );

  function set<K extends keyof ParcelState>(k: K, v: ParcelState[K]) {
    setData((s) => ({ ...s, [k]: v }));
  }

  function next() {
    if (step === 1) {
      const r = step1Schema.safeParse(data);
      if (!r.success) return toast.error(r.error.issues[0]!.message);
    }
    if (step === 2) {
      const r = step2Schema.safeParse(data);
      if (!r.success) return toast.error(r.error.issues[0]!.message);
    }
    setStep((s) => (s < 4 ? ((s + 1) as Step) : s));
  }

  async function submit() {
    setSubmitting(true);
    const { data: inserted, error } = await supabase
      .from("parcels")
      .insert({
        user_id: user.id,
        sender_name: data.sender_name,
        sender_phone: data.sender_phone,
        sender_hall: data.sender_hall,
        sender_block_room: data.sender_block_room,
        sender_landmark: data.sender_landmark || null,
        receiver_name: data.receiver_name,
        receiver_phone: data.receiver_phone,
        receiver_hall: data.receiver_hall,
        receiver_block_room: data.receiver_block_room,
        receiver_landmark: data.receiver_landmark || null,
        item_type: data.item_type,
        size: data.size,
        description: data.description || null,
        note: data.note || null,
        delivery_charge: charge,
      })
      .select("order_code")
      .single();
    setSubmitting(false);
    if (error || !inserted) return toast.error(error?.message ?? "অর্ডার ব্যর্থ");
    setOrderCode(inserted.order_code);
    fireConfetti();
    toast.success("অর্ডার কনফার্ম হয়েছে! 🎉");
  }

  if (!profileLoaded) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (orderCode) return <SuccessScreen orderCode={orderCode} charge={charge} />;

  return (
    <div className="min-h-screen gradient-hero pb-32 md:pb-8">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 pt-4 md:px-8 md:pt-6">
        <button onClick={() => (step === 1 ? navigate({ to: "/" }) : setStep((s) => (s - 1) as Step))}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Logo />
        <div className="w-5" />
      </header>

      <StepIndicator step={step} />

      <div className="animate-fade-up mx-auto mt-6 max-w-2xl px-4 md:px-8" key={step}>
        <div className="rounded-3xl border border-border/60 bg-card/90 p-5 shadow-card backdrop-blur-lg md:p-8">
          {step === 1 && <SenderStep data={data} set={set} />}
          {step === 2 && <ReceiverStep data={data} set={set} />}
          {step === 3 && <DetailsStep data={data} set={set} />}
          {step === 4 && <ReviewStep data={data} charge={charge} />}

          <div className="mt-8 flex gap-3">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep((s) => (s - 1) as Step)} className="h-12 flex-1 rounded-xl">
                পিছনে
              </Button>
            )}
            {step < 4 ? (
              <Button onClick={next} className="h-12 flex-1 rounded-xl gradient-primary text-base font-semibold shadow-soft">
                পরের ধাপ <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={submit}
                disabled={submitting}
                className="h-12 flex-1 rounded-xl gradient-accent text-base font-bold text-accent-foreground shadow-warm"
              >
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "অর্ডার কনফার্ম করুন"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <FloatingActions />
      <MobileBottomNav />
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const steps = [
    { n: 1, label: "প্রেরক", Icon: User },
    { n: 2, label: "প্রাপক", Icon: MapPin },
    { n: 3, label: "পার্সেল", Icon: Package },
    { n: 4, label: "নিশ্চিত", Icon: Wallet },
  ];
  return (
    <div className="mx-auto mt-6 flex max-w-2xl items-center justify-between px-6 md:px-8">
      {steps.map(({ n, label, Icon }, i) => {
        const active = step === n;
        const done = step > n;
        return (
          <div key={n} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`grid h-10 w-10 place-items-center rounded-full text-sm font-bold transition-all ${
                  done
                    ? "bg-success text-success-foreground"
                    : active
                    ? "gradient-primary text-primary-foreground shadow-soft"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className={`font-bangla text-[10px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`mx-1 h-0.5 flex-1 ${step > n ? "bg-success" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

type SetFn = <K extends keyof ParcelState>(k: K, v: ParcelState[K]) => void;

function HallSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="mt-1.5 h-12 rounded-xl">
        <SelectValue placeholder="বাছাই করুন" />
      </SelectTrigger>
      <SelectContent>
        <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">ছেলেদের হল</div>
        {MALE_HALLS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
        <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">মেয়েদের হল</div>
        {FEMALE_HALLS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
        <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">অন্যান্য</div>
        {OTHER_LOCATIONS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function SenderStep({ data, set }: { data: ParcelState; set: SetFn }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-bangla text-xl font-extrabold">প্রেরকের তথ্য</h2>
        <p className="font-bangla text-sm text-muted-foreground">যিনি পাঠাচ্ছেন</p>
      </div>
      <Field label="নাম"><Input value={data.sender_name} onChange={(e) => set("sender_name", e.target.value)} className="h-12 rounded-xl" /></Field>
      <Field label="ফোন নম্বর"><Input inputMode="tel" placeholder="01XXXXXXXXX" value={data.sender_phone} onChange={(e) => set("sender_phone", e.target.value)} className="h-12 rounded-xl" /></Field>
      <Field label="Pickup হল"><HallSelect value={data.sender_hall} onChange={(v) => set("sender_hall", v)} /></Field>
      <Field label="ব্লক / ফ্লোর / রুম"><Input placeholder="যেমন: A-Block, 2nd Floor, Room 204" value={data.sender_block_room} onChange={(e) => set("sender_block_room", e.target.value)} className="h-12 rounded-xl" /></Field>
      <Field label="Landmark (ঐচ্ছিক)"><Input placeholder="যেমন: ক্যান্টিনের পাশে" value={data.sender_landmark} onChange={(e) => set("sender_landmark", e.target.value)} className="h-12 rounded-xl" /></Field>
    </div>
  );
}

function ReceiverStep({ data, set }: { data: ParcelState; set: SetFn }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-bangla text-xl font-extrabold">প্রাপকের তথ্য</h2>
        <p className="font-bangla text-sm text-muted-foreground">যিনি রিসিভ করবেন</p>
      </div>
      <Field label="নাম"><Input value={data.receiver_name} onChange={(e) => set("receiver_name", e.target.value)} className="h-12 rounded-xl" /></Field>
      <Field label="ফোন নম্বর"><Input inputMode="tel" placeholder="01XXXXXXXXX" value={data.receiver_phone} onChange={(e) => set("receiver_phone", e.target.value)} className="h-12 rounded-xl" /></Field>
      <Field label="Drop হল"><HallSelect value={data.receiver_hall} onChange={(v) => set("receiver_hall", v)} /></Field>
      <Field label="ব্লক / ফ্লোর / রুম"><Input placeholder="যেমন: B-Block, 3rd Floor, Room 310" value={data.receiver_block_room} onChange={(e) => set("receiver_block_room", e.target.value)} className="h-12 rounded-xl" /></Field>
      <Field label="Landmark (ঐচ্ছিক)"><Input value={data.receiver_landmark} onChange={(e) => set("receiver_landmark", e.target.value)} className="h-12 rounded-xl" /></Field>
    </div>
  );
}

function DetailsStep({ data, set }: { data: ParcelState; set: SetFn }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-bangla text-xl font-extrabold">পার্সেলের বিবরণ</h2>
        <p className="font-bangla text-sm text-muted-foreground">কী পাঠাচ্ছেন?</p>
      </div>

      <div>
        <Label className="mb-3 block">আইটেম টাইপ</Label>
        <div className="grid grid-cols-3 gap-2">
          {itemTypes.map(({ v, label, Icon }) => (
            <button
              key={v}
              type="button"
              onClick={() => set("item_type", v)}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 transition-all ${
                data.item_type === v
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="font-bangla text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="mb-3 block">সাইজ</Label>
        <div className="grid grid-cols-3 gap-2">
          {sizes.map(({ v, label, desc }) => (
            <button
              key={v}
              type="button"
              onClick={() => set("size", v)}
              className={`rounded-2xl border-2 p-3 text-center transition-all ${
                data.size === v
                  ? "border-accent bg-accent/5 text-accent"
                  : "border-border bg-card hover:border-accent/40"
              }`}
            >
              <div className="font-bangla text-sm font-bold">{label}</div>
              <div className="font-bangla text-[10px] text-muted-foreground">{desc}</div>
            </button>
          ))}
        </div>
      </div>

      <Field label="বিবরণ / নোট (ঐচ্ছিক)">
        <Textarea
          placeholder="যেমন: ফার্মেসি থেকে ঔষধ আনতে হবে"
          value={data.description}
          onChange={(e) => set("description", e.target.value)}
          className="min-h-24 rounded-xl"
          maxLength={500}
        />
      </Field>
    </div>
  );
}

function ReviewStep({ data, charge }: { data: ParcelState; charge: number }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-bangla text-xl font-extrabold">পর্যালোচনা</h2>
        <p className="font-bangla text-sm text-muted-foreground">সব ঠিক আছে?</p>
      </div>

      <div className="rounded-2xl border border-border bg-secondary/40 p-4 text-sm">
        <Row label="প্রেরক" value={`${data.sender_name} • ${data.sender_phone}`} />
        <Row label="থেকে" value={`${data.sender_hall}, ${data.sender_block_room}`} />
        <div className="my-3 border-t border-dashed" />
        <Row label="প্রাপক" value={`${data.receiver_name} • ${data.receiver_phone}`} />
        <Row label="যাবে" value={`${data.receiver_hall}, ${data.receiver_block_room}`} />
        <div className="my-3 border-t border-dashed" />
        <Row label="পার্সেল" value={`${itemTypes.find((i) => i.v === data.item_type)?.label} • ${sizes.find((s) => s.v === data.size)?.label}`} />
      </div>

      <div className="rounded-2xl gradient-primary p-5 text-primary-foreground shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bangla text-sm opacity-80">ডেলিভারি চার্জ</div>
            <div className="font-bangla text-xs opacity-70">Cash on Delivery</div>
          </div>
          <div className="text-3xl font-extrabold">৳{charge}</div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-0.5">
      <span className="font-bangla text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function SuccessScreen({ orderCode, charge }: { orderCode: string; charge: number }) {
  const navigate = useNavigate();
  const waMsg = `আমি পায়রা দিয়ে একটি পার্সেল অর্ডার করেছি। Order ID: ${orderCode}`;

  return (
    <div className="grid min-h-screen place-items-center gradient-hero px-4 pb-24">
      <div className="animate-fade-up w-full max-w-md text-center">
        <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full gradient-accent text-accent-foreground shadow-warm animate-float">
          <PartyPopper className="h-10 w-10" />
        </div>
        <h1 className="font-bangla text-3xl font-extrabold">অর্ডার কনফার্ম!</h1>
        <p className="mt-2 font-bangla text-muted-foreground">
          রাইডার শীঘ্রই আপনাকে কল করবে
        </p>

        <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-card">
          <div className="font-bangla text-xs text-muted-foreground">অর্ডার আইডি</div>
          <div className="mt-1 flex items-center justify-center gap-2 text-2xl font-black tracking-tight">
            {orderCode}
            <button
              onClick={() => {
                navigator.clipboard.writeText(orderCode);
                toast.success("কপি করা হয়েছে");
              }}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 rounded-xl bg-secondary/50 p-3 text-sm">
            <span className="font-bangla text-muted-foreground">Cash on Delivery: </span>
            <span className="font-bold text-primary">৳{charge}</span>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(waMsg)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] font-semibold text-white shadow-soft"
          >
            <Share2 className="h-4 w-4" />
            <span className="font-bangla">Share</span>
          </a>
          <Button
            onClick={() => navigate({ to: "/" })}
            variant="outline"
            className="h-12 flex-1 rounded-xl"
          >
            <span className="font-bangla">হোম</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
