import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UtensilsCrossed, Package, ArrowRight, Sparkles, Clock, MapPin, Shield, Search, Bike, LayoutDashboard, User as UserIcon } from "lucide-react";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { FloatingActions } from "@/components/FloatingActions";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DearDash — CU'র নিজস্ব ডেলিভারি প্ল্যাটফর্ম" },
      { name: "description", content: "চট্টগ্রাম বিশ্ববিদ্যালয়ের খাবার ও পার্সেল ডেলিভারি। ছাত্রদের দ্বারা, ছাত্রদের জন্য।" },
    ],
  }),
  component: Home,
});

type AuthState = { loading: boolean; signedIn: boolean; dashboard: { to: string; label: string } };

function useHeaderAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ loading: true, signedIn: false, dashboard: { to: "/profile", label: "প্রোফাইল" } });

  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) {
        if (!cancelled) setState({ loading: false, signedIn: false, dashboard: { to: "/profile", label: "প্রোফাইল" } });
        return;
      }
      const [{ data: isAdmin }, { data: isRider }, { data: isOwner }] = await Promise.all([
        supabase.rpc("has_role", { _user_id: uid, _role: "admin" }),
        supabase.rpc("has_role", { _user_id: uid, _role: "rider" }),
        supabase.rpc("has_role", { _user_id: uid, _role: "restaurant" }),
      ]);
      let dashboard = { to: "/profile", label: "প্রোফাইল" };
      if (isAdmin) dashboard = { to: "/admin", label: "অ্যাডমিন" };
      else if (isOwner) dashboard = { to: "/restaurant-hub", label: "রেস্টুরেন্ট" };
      else if (isRider) dashboard = { to: "/rider-hub", label: "রাইডার" };
      if (!cancelled) setState({ loading: false, signedIn: true, dashboard });
    }
    resolve();
    const { data: sub } = supabase.auth.onAuthStateChange(() => resolve());
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  return state;
}

function Home() {
  const auth = useHeaderAuth();
  const [onlineRiders, setOnlineRiders] = useState<number | null>(null);
  useEffect(() => {
    (supabase.rpc as any)("online_riders_count").then(({ data }: { data: any }) => {
      setOnlineRiders(Number(data ?? 0));
    });
    const id = setInterval(() => {
      (supabase.rpc as any)("online_riders_count").then(({ data }: { data: any }) => {
        setOnlineRiders(Number(data ?? 0));
      });
    }, 30000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="min-h-screen gradient-hero pb-24 md:pb-8">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 pt-6 md:px-8">
        <Logo />
        {auth.loading ? (
          <div className="h-9 w-24 animate-pulse rounded-full bg-card/60" />
        ) : auth.signedIn ? (
          <div className="flex items-center gap-2">
            <Link
              to={auth.dashboard.to}
              className="inline-flex items-center gap-1.5 rounded-full gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="font-bangla">{auth.dashboard.label}</span>
            </Link>
            <Link
              to="/profile"
              aria-label="প্রোফাইল"
              className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card/80 backdrop-blur-md transition-colors hover:bg-card"
            >
              <UserIcon className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <Link
            to="/auth"
            className="rounded-full border border-border bg-card/80 px-4 py-2 text-sm font-semibold backdrop-blur-md transition-colors hover:bg-card"
          >
            লগইন
          </Link>
        )}
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-10 text-center md:px-8 md:pt-16">
        <h1 className="animate-fade-up font-bangla text-4xl font-extrabold leading-tight tracking-tight md:text-6xl" style={{ animationDelay: "60ms" }}>
          ক্যাম্পাসে যেকোনো কিছু <br />
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            মিনিটেই পৌঁছে দিন
          </span>
        </h1>
        <p className="animate-fade-up mx-auto mt-4 max-w-xl font-bangla text-base text-muted-foreground md:text-lg" style={{ animationDelay: "120ms" }}>
          CU'র নিজস্ব ডেলিভারি প্ল্যাটফর্ম • Students Delivering for Students
        </p>

        {/* Live riders */}
        <div className="animate-fade-up mx-auto mt-6 inline-flex items-center gap-2 rounded-full bg-success/10 px-4 py-2 text-sm font-medium text-success" style={{ animationDelay: "180ms" }}>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          <span className="font-bangla">এখন সক্রিয় রাইডার: <b>{onlineRiders ?? "—"}</b> জন</span>
        </div>
      </section>

      {/* Service Cards */}
      <section className="mx-auto mt-12 grid max-w-5xl gap-4 px-4 md:mt-16 md:grid-cols-2 md:gap-6 md:px-8">
        {/* Parcel — highlighted */}
        <Link
          to="/parcel"
          className="animate-fade-up group relative overflow-hidden rounded-3xl gradient-primary p-6 text-primary-foreground shadow-soft transition-all hover:-translate-y-1 hover:shadow-warm md:order-2 md:p-8"
          style={{ animationDelay: "240ms" }}
        >
          <div className="absolute -right-6 -top-6 grid h-32 w-32 place-items-center rounded-full bg-white/10 backdrop-blur-sm md:h-40 md:w-40">
            <Package className="h-14 w-14 opacity-90 md:h-20 md:w-20" />
          </div>
          <span className="inline-flex rounded-full bg-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-sm">
            জনপ্রিয় ⚡
          </span>
          <h2 className="mt-16 font-bangla text-3xl font-extrabold md:mt-20 md:text-4xl">
            পার্সেল পাঠান
          </h2>
          <p className="mt-2 font-bangla text-primary-foreground/85">
            হল থেকে হল, ২০ টাকা থেকে শুরু
          </p>
          <div className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold backdrop-blur-sm transition-transform group-hover:gap-3">
            <span className="font-bangla">এখনই পাঠান</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </Link>

        {/* Food */}
        <Link
          to="/food"
          className="animate-fade-up group relative overflow-hidden rounded-3xl gradient-accent p-6 text-accent-foreground shadow-warm transition-all hover:-translate-y-1 md:order-1 md:p-8"
          style={{ animationDelay: "300ms" }}
        >
          <div className="absolute -right-6 -top-6 grid h-32 w-32 place-items-center rounded-full bg-white/15 backdrop-blur-sm md:h-40 md:w-40">
            <UtensilsCrossed className="h-14 w-14 opacity-95 md:h-20 md:w-20" />
          </div>
          <span className="inline-flex rounded-full bg-white/25 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-sm">
            শীঘ্রই আসছে
          </span>
          <h2 className="mt-16 font-bangla text-3xl font-extrabold md:mt-20 md:text-4xl">
            খাবার অর্ডার
          </h2>
          <p className="mt-2 font-bangla text-accent-foreground/90">
            ৬টি ক্যাম্পাস রেস্টুরেন্ট থেকে
          </p>
          <div className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-white/25 px-4 py-2 text-sm font-semibold backdrop-blur-sm transition-transform group-hover:gap-3">
            <span className="font-bangla">দেখুন</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </Link>
      </section>

      {/* Feature strip */}
      <section className="mx-auto mt-12 grid max-w-5xl grid-cols-3 gap-3 px-4 md:mt-16 md:gap-6 md:px-8">
        {[
          { icon: Clock, label: "১৫-৩০ মিনিট", sub: "দ্রুত ডেলিভারি" },
          { icon: MapPin, label: "১৫+ স্থান", sub: "সব হল কভার" },
          { icon: Shield, label: "নিরাপদ", sub: "যাচাইকৃত রাইডার" },
        ].map(({ icon: Icon, label, sub }, i) => (
          <div
            key={label}
            className="animate-fade-up rounded-2xl border border-border/60 bg-card/70 p-4 text-center backdrop-blur-sm"
            style={{ animationDelay: `${360 + i * 60}ms` }}
          >
            <Icon className="mx-auto h-5 w-5 text-primary" />
            <div className="mt-2 font-bangla text-sm font-bold md:text-base">{label}</div>
            <div className="font-bangla text-[11px] text-muted-foreground">{sub}</div>
          </div>
        ))}
      </section>

      {/* Secondary actions */}
      <section className="mx-auto mt-6 grid max-w-5xl grid-cols-2 gap-3 px-4 md:mt-8 md:gap-4 md:px-8">
        <Link
          to="/track"
          className="animate-fade-up group flex items-center gap-3 rounded-2xl border border-border bg-card/80 p-4 backdrop-blur-sm transition-colors hover:bg-card"
          style={{ animationDelay: "540ms" }}
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Search className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="font-bangla text-sm font-bold">অর্ডার ট্র্যাক</div>
            <div className="font-bangla truncate text-[11px] text-muted-foreground">কোড দিয়ে অবস্থা দেখুন</div>
          </div>
          <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link
          to="/rider"
          className="animate-fade-up group flex items-center gap-3 rounded-2xl border border-border bg-card/80 p-4 backdrop-blur-sm transition-colors hover:bg-card"
          style={{ animationDelay: "600ms" }}
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
            <Bike className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="font-bangla text-sm font-bold">রাইডার হোন</div>
            <div className="font-bangla truncate text-[11px] text-muted-foreground">আয় করুন ক্লাসের ফাঁকে</div>
          </div>
          <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>
      </section>

      <p className="mt-12 text-center font-bangla text-xs text-muted-foreground">
        © DearDash {new Date().getFullYear()} • হটলাইন: 01400065088
      </p>

      <FloatingActions />
      <MobileBottomNav />
    </div>
  );
}
