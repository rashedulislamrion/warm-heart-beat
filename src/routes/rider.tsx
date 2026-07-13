import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Logo } from "@/components/Logo";
import { ArrowLeft, Bike, CheckCircle2, Loader2, Sparkles, Wallet, Users, Clock } from "lucide-react";
import { toast } from "sonner";
import { MALE_HALLS, FEMALE_HALLS } from "@/lib/halls";
import { MobileBottomNav } from "@/components/MobileBottomNav";

export const Route = createFileRoute("/rider")({
  head: () => ({
    meta: [
      { title: "রাইডার হোন — পায়রা" },
      { name: "description", content: "পায়রায় রাইডার হিসেবে যোগ দিন। ক্লাসের ফাঁকে আয় করুন, ক্যাম্পাসে সাহায্য করুন।" },
      { property: "og:title", content: "পায়রায় রাইডার হোন" },
      { property: "og:description", content: "CU'র নিজস্ব ডেলিভারি প্ল্যাটফর্মে যোগ দিন" },
    ],
  }),
  component: RiderApply,
});

const schema = z.object({
  full_name: z.string().trim().min(2, "নাম লিখুন").max(100),
  phone: z.string().trim().regex(/^01[0-9]{9}$/, "সঠিক নম্বর দিন"),
  student_id: z.string().trim().max(30).optional().or(z.literal("")),
  hall: z.string().max(80).optional().or(z.literal("")),
  department: z.string().trim().max(80).optional().or(z.literal("")),
  semester: z.string().trim().max(20).optional().or(z.literal("")),
  availability: z.string().trim().max(200).optional().or(z.literal("")),
  has_bike: z.boolean(),
  motivation: z.string().trim().max(1000).optional().or(z.literal("")),
});

function RiderApply() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [existing, setExisting] = useState<{ status: string; admin_note: string | null } | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    student_id: "",
    hall: "",
    department: "",
    semester: "",
    availability: "",
    has_bike: false,
    motivation: "",
  });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate({ to: "/auth", search: { redirect: "/rider" } as any });
        return;
      }
      setUserId(user.id);
      const { data: prof } = await supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle();
      if (prof) {
        setForm((f) => ({ ...f, full_name: prof.full_name ?? "", phone: prof.phone ?? "" }));
      }
      const { data: app } = await supabase
        .from("rider_applications" as any)
        .select("status, admin_note")
        .eq("user_id", user.id)
        .maybeSingle();
      if (app) setExisting(app as any);
      setChecking(false);
    })();
  }, [navigate]);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "ভুল ইনপুট");
      return;
    }
    if (!userId) {
      toast.error("লগইন প্রয়োজন");
      navigate({ to: "/auth", search: { redirect: "/rider" } as any });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("rider_applications" as any).insert({
      user_id: userId,
      ...parsed.data,
      hall: parsed.data.hall || null,
      student_id: parsed.data.student_id || null,
      department: parsed.data.department || null,
      semester: parsed.data.semester || null,
      availability: parsed.data.availability || null,
      motivation: parsed.data.motivation || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "আপনি ইতিমধ্যে আবেদন করেছেন" : "জমা দিতে ব্যর্থ, আবার চেষ্টা করুন");
      return;
    }
    setDone(true);
    setExisting({ status: "pending", admin_note: null });
    toast.success("আবেদন গৃহীত হয়েছে!");
  }

  if (checking) {
    return (
      <div className="min-h-screen gradient-hero grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (existing && !done) {
    const tone = existing.status === "approved" ? "text-success" : existing.status === "rejected" ? "text-destructive" : "text-primary";
    const label = existing.status === "approved" ? "অনুমোদিত ✓" : existing.status === "rejected" ? "প্রত্যাখ্যাত" : "যাচাই চলছে…";
    return (
      <div className="min-h-screen gradient-hero grid place-items-center px-4 pb-24">
        <div className="mx-auto max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-soft">
          <Bike className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-3 font-bangla text-2xl font-extrabold">আপনার আবেদনের স্ট্যাটাস</h2>
          <p className={`mt-2 font-bangla text-lg font-bold ${tone}`}>{label}</p>
          {existing.admin_note && <p className="mt-2 font-bangla text-sm text-muted-foreground">{existing.admin_note}</p>}
          {existing.status === "approved" && (
            <Button onClick={() => navigate({ to: "/rider-hub" })} className="mt-6 h-11 rounded-xl px-6">
              রাইডার ড্যাশবোর্ডে যান
            </Button>
          )}
          {existing.status !== "approved" && (
            <Button onClick={() => navigate({ to: "/" })} variant="outline" className="mt-6 h-11 rounded-xl px-6">
              হোমে ফিরুন
            </Button>
          )}
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen gradient-hero grid place-items-center px-4 pb-24">
        <div className="animate-fade-up mx-auto max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-soft">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/10">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <h2 className="mt-4 font-bangla text-2xl font-extrabold">ধন্যবাদ!</h2>
          <p className="mt-2 font-bangla text-muted-foreground">
            আপনার আবেদন আমরা যাচাই করে দ্রুত ফোন করব। ইতিমধ্যে হটলাইনে যোগাযোগ করতে পারেন — 01400065088
          </p>
          <Button onClick={() => navigate({ to: "/" })} className="mt-6 h-11 rounded-xl px-6">
            হোমে ফিরুন
          </Button>
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero pb-24 md:pb-8">
      <header className="mx-auto flex max-w-3xl items-center gap-3 px-4 pt-6 md:px-8">
        <Link to="/" className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card/80 backdrop-blur">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Logo />
      </header>

      <section className="mx-auto mt-8 max-w-3xl px-4 md:px-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          <span className="font-bangla">রিক্রুটমেন্ট চলছে</span>
        </div>
        <h1 className="mt-3 font-bangla text-3xl font-extrabold md:text-4xl">
          পায়রায় <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">রাইডার হোন</span>
        </h1>
        <p className="mt-2 font-bangla text-muted-foreground">
          ক্লাসের ফাঁকে আয় করুন, বন্ধুদের সাহায্য করুন
        </p>

        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { Icon: Wallet, label: "প্রতি ডেলিভারিতে ইনকাম" },
            { Icon: Clock, label: "নমনীয় সময়" },
            { Icon: Users, label: "স্টুডেন্ট কমিউনিটি" },
          ].map(({ Icon, label }) => (
            <div key={label} className="rounded-2xl border border-border/60 bg-card/70 p-3 text-center backdrop-blur-sm">
              <Icon className="mx-auto h-5 w-5 text-primary" />
              <div className="mt-1.5 font-bangla text-[11px] font-semibold leading-tight">{label}</div>
            </div>
          ))}
        </div>

        <form onSubmit={submit} className="mt-8 space-y-4 rounded-3xl border border-border bg-card p-5 shadow-soft md:p-6">
          <div className="flex items-center gap-2 font-bangla text-lg font-bold">
            <Bike className="h-5 w-5 text-primary" /> আবেদন ফর্ম
          </div>

          <Field label="পূর্ণ নাম *">
            <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="মো. রহিম উদ্দিন" required maxLength={100} />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="মোবাইল নম্বর *">
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="01XXXXXXXXX" inputMode="tel" required maxLength={11} />
            </Field>
            <Field label="স্টুডেন্ট আইডি">
              <Input value={form.student_id} onChange={(e) => set("student_id", e.target.value)} placeholder="20301XXX" maxLength={30} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="হল">
              <Select value={form.hall} onValueChange={(v) => set("hall", v)}>
                <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                <SelectContent>
                  {[...MALE_HALLS, ...FEMALE_HALLS].map((h) => (
                    <SelectItem key={h} value={h}>{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="ডিপার্টমেন্ট">
              <Input value={form.department} onChange={(e) => set("department", e.target.value)} placeholder="CSE, EEE ইত্যাদি" maxLength={80} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="সেমিস্টার / বর্ষ">
              <Input value={form.semester} onChange={(e) => set("semester", e.target.value)} placeholder="যেমন: ২য় বর্ষ" maxLength={20} />
            </Field>
            <Field label="সাপ্তাহিক ফাঁকা সময়">
              <Input value={form.availability} onChange={(e) => set("availability", e.target.value)} placeholder="যেমন: সকাল ১০-১, সন্ধ্যা ৬-৯" maxLength={200} />
            </Field>
          </div>

          <label className="flex items-center gap-2 rounded-xl border border-border p-3">
            <Checkbox checked={form.has_bike} onCheckedChange={(v) => set("has_bike", Boolean(v))} />
            <span className="font-bangla text-sm">আমার নিজের সাইকেল / বাইক আছে</span>
          </label>

          <Field label="কেন রাইডার হতে চান?">
            <Textarea value={form.motivation} onChange={(e) => set("motivation", e.target.value)} placeholder="সংক্ষেপে লিখুন" maxLength={1000} rows={3} />
          </Field>

          <Button type="submit" disabled={submitting} className="h-12 w-full rounded-xl gradient-primary text-primary-foreground">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="font-bangla font-bold">আবেদন জমা দিন</span>}
          </Button>
        </form>
      </section>

      <MobileBottomNav />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="font-bangla text-sm font-semibold">{label}</span>
      {children}
    </label>
  );
}
