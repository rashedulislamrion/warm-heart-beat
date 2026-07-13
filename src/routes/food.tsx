import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, UtensilsCrossed, Sparkles } from "lucide-react";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { FloatingActions } from "@/components/FloatingActions";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/food")({
  head: () => ({ meta: [{ title: "খাবার — পায়রা" }] }),
  component: FoodComingSoon,
});

function FoodComingSoon() {
  return (
    <div className="min-h-screen gradient-hero pb-24">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 pt-6">
        <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
        <Logo />
        <div className="w-5" />
      </header>

      <div className="animate-fade-up mx-auto mt-16 max-w-md px-4 text-center">
        <div className="mx-auto mb-6 grid h-24 w-24 place-items-center rounded-full gradient-accent text-accent-foreground shadow-warm animate-float">
          <UtensilsCrossed className="h-12 w-12" />
        </div>
        <h1 className="font-bangla text-3xl font-extrabold">খাবার অর্ডার</h1>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
          <Sparkles className="h-3 w-3" />
          <span className="font-bangla">শীঘ্রই আসছে</span>
        </div>
        <p className="mt-4 font-bangla text-muted-foreground">
          BeatBite, লঙ্গর খানা, Station Food Corner সহ CU'র প্রিয় ৬টি রেস্টুরেন্ট
          — খুব শীঘ্রই এখানে থাকবে।
        </p>
        <Link
          to="/parcel"
          className="mt-6 inline-flex rounded-full gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft"
        >
          পার্সেল পাঠান
        </Link>
      </div>

      <FloatingActions />
      <MobileBottomNav />
    </div>
  );
}
