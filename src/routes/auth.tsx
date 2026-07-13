import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const searchSchema = z.object({
  redirect: z.string().optional(),
  mode: z.enum(["signin", "signup"]).optional(),
  ref: z.string().trim().max(24).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "লগইন — পায়রা" }] }),
  component: AuthPage,
});

const credSchema = z.object({
  email: z.string().trim().email("সঠিক ইমেইল দিন").max(255),
  password: z.string().min(6, "পাসওয়ার্ড কমপক্ষে ৬ অক্ষর").max(100),
});

function AuthPage() {
  const search = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState((search.ref ?? "").toUpperCase());
  const [loading, setLoading] = useState(false);

  const redirectTo = search.redirect;

  async function landingForCurrentUser(): Promise<string> {
    if (redirectTo) return redirectTo;
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return "/";
      const [{ data: isAdmin }, { data: isRider }, { data: isOwner }] = await Promise.all([
        supabase.rpc("has_role", { _user_id: uid, _role: "admin" }),
        supabase.rpc("has_role", { _user_id: uid, _role: "rider" }),
        supabase.rpc("has_role", { _user_id: uid, _role: "restaurant" }),
      ]);
      if (isAdmin) return "/admin";
      if (isOwner) return "/restaurant-hub";
      if (isRider) return "/rider-hub";
      return "/";
    } catch {
      return "/";
    }
  }

  async function attachReferralIfAny() {
    const code = referralCode.trim().toUpperCase();
    if (!code) return;
    const { error } = await (supabase.rpc as any)("attach_referrer", { _code: code });
    if (error) {
      // Non-fatal: show a soft toast so user knows
      toast(`রেফারেল কোড যুক্ত হয়নি: ${error.message}`);
    } else {
      toast.success("রেফারেল কোড যুক্ত হয়েছে 🎁");
    }
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    const parsed = credSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "সঠিক তথ্য দিন");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        await attachReferralIfAny();
        toast.success("অ্যাকাউন্ট তৈরি হয়েছে!");
        navigate({ to: redirectTo });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        await attachReferralIfAny();
        toast.success("স্বাগতম!");
        navigate({ to: redirectTo });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ভুল হয়েছে");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error.message);
        setLoading(false);
        return;
      }
      if (result.redirected) return;
      toast.success("স্বাগতম!");
      navigate({ to: redirectTo });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google লগইন ব্যর্থ");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen gradient-hero px-4 py-8">
      <div className="mx-auto flex max-w-md flex-col items-center">
        <button onClick={() => navigate({ to: "/" })} className="mb-6">
          <Logo />
        </button>

        <div className="animate-fade-up w-full rounded-3xl border border-border/60 bg-card/90 p-6 shadow-card backdrop-blur-lg md:p-8">
          <h1 className="font-bangla text-2xl font-extrabold">
            {mode === "signin" ? "স্বাগতম!" : "অ্যাকাউন্ট তৈরি করুন"}
          </h1>
          <p className="mt-1 font-bangla text-sm text-muted-foreground">
            {mode === "signin" ? "পায়রায় লগইন করুন" : "CU'র ডেলিভারি প্ল্যাটফর্মে যোগ দিন"}
          </p>

          <Button
            type="button"
            variant="outline"
            className="mt-6 h-12 w-full rounded-xl text-sm font-semibold"
            onClick={handleGoogle}
            disabled={loading}
          >
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google দিয়ে চালিয়ে যান
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>অথবা</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <Label htmlFor="email">ইমেইল</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@student.cu.ac.bd"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1.5 h-12 rounded-xl"
                autoComplete="email"
              />
            </div>
            <div>
              <Label htmlFor="password">পাসওয়ার্ড</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="mt-1.5 h-12 rounded-xl"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>
            {mode === "signup" && (
              <div>
                <Label htmlFor="ref">রেফারেল কোড (ঐচ্ছিক)</Label>
                <Input
                  id="ref"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={12}
                  className="mt-1.5 h-12 rounded-xl uppercase tracking-widest"
                />
                <p className="mt-1 font-bangla text-[11px] text-muted-foreground">
                  বন্ধুর কোড দিলে প্রথম অর্ডারে দু'জনেই ৳৫০ পাবেন
                </p>
              </div>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl gradient-primary text-base font-semibold shadow-soft"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : mode === "signin" ? "লগইন করুন" : "অ্যাকাউন্ট খুলুন"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "নতুন এখানে? " : "অ্যাকাউন্ট আছে? "}
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="font-semibold text-primary hover:underline"
            >
              {mode === "signin" ? "অ্যাকাউন্ট খুলুন" : "লগইন করুন"}
            </button>
          </p>
        </div>

        <p className="mt-4 text-center font-bangla text-xs text-muted-foreground">
          চালিয়ে গিয়ে আপনি আমাদের শর্তাবলী মেনে নিচ্ছেন
        </p>
      </div>
    </div>
  );
}
