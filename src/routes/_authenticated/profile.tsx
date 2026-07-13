import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { FloatingActions } from "@/components/FloatingActions";
import { Logo } from "@/components/Logo";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut, Pencil, User as UserIcon, Phone, MapPin, Shield, Gift, Bike, Wallet, Store, Bell } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "প্রোফাইল — পায়রা" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [profile, setProfile] = useState<any>(undefined);
  const [unread, setUnread] = useState<number>(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRider, setIsRider] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
      .then(({ data }) => setProfile(data ?? null));
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" })
      .then(({ data }) => setIsAdmin(Boolean(data)));
    supabase.rpc("has_role", { _user_id: user.id, _role: "rider" })
      .then(({ data }) => setIsRider(Boolean(data)));
    supabase.rpc("has_role", { _user_id: user.id, _role: "restaurant" })
      .then(({ data }) => setIsOwner(Boolean(data)));
    supabase.rpc("my_unread_notification_count")
      .then(({ data }) => setUnread(Number(data ?? 0)));
  }, [user.id]);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("লগআউট হয়েছে");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen gradient-hero pb-24">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 pt-6">
        <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
        <Logo />
        <div className="w-5" />
      </header>

      <div className="mx-auto mt-6 max-w-md px-4">
        {profile === undefined ? (
          <Skeleton className="h-64 w-full rounded-3xl" />
        ) : (
          <div className="animate-fade-up rounded-3xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-full gradient-primary text-2xl font-bold text-primary-foreground">
                {profile?.full_name?.[0]?.toUpperCase() ?? "ও"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-lg font-bold">{profile?.full_name ?? "নাম দিন"}</div>
                <div className="truncate text-sm text-muted-foreground">{user.email}</div>
              </div>
            </div>

            <div className="mt-6 space-y-3 text-sm">
              <Row Icon={UserIcon} label="নাম" value={profile?.full_name ?? "—"} />
              <Row Icon={Phone} label="ফোন" value={profile?.phone ?? "—"} />
              <Row Icon={MapPin} label="ঠিকানা" value={profile?.hall ? `${profile.hall}, ${profile.block_room ?? ""}` : "—"} />
            </div>

            <Link
              to="/profile-setup"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm font-semibold hover:bg-secondary"
            >
              <Pencil className="h-4 w-4" />
              <span className="font-bangla">এডিট করুন</span>
            </Link>

            <Link
              to="/invite"
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl gradient-accent px-4 py-3 text-sm font-bold text-accent-foreground shadow-warm"
            >
              <Gift className="h-4 w-4" />
              <span className="font-bangla">বন্ধু আনুন, ৳৫০ পান</span>
            </Link>

            <Link
              to="/wallet"
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm font-semibold hover:bg-secondary"
            >
              <Wallet className="h-4 w-4" />
              <span className="font-bangla">ওয়ালেট</span>
            </Link>

            {isRider && (
              <Link
                to="/rider-hub"
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent/10 px-4 py-3 text-sm font-semibold text-accent hover:bg-accent/15"
              >
                <Bike className="h-4 w-4" />
                <span className="font-bangla">রাইডার ড্যাশবোর্ড</span>
              </Link>
            )}

            {isOwner && (
              <Link
                to="/restaurant-hub"
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent/10 px-4 py-3 text-sm font-semibold text-accent hover:bg-accent/15"
              >
                <Store className="h-4 w-4" />
                <span className="font-bangla">রেস্টুরেন্ট ড্যাশবোর্ড</span>
              </Link>
            )}

            {isAdmin && (
              <Link
                to="/admin"
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary/10 px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/15"
              >
                <Shield className="h-4 w-4" />
                <span className="font-bangla">অ্যাডমিন ড্যাশবোর্ড</span>
              </Link>
            )}

            <Button
              variant="ghost"
              onClick={signOut}
              className="mt-3 h-11 w-full rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span className="font-bangla">লগআউট</span>
            </Button>
          </div>
        )}
      </div>

      <FloatingActions />
      <MobileBottomNav />
    </div>
  );
}

function Row({ Icon, label, value }: { Icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-secondary/40 px-3 py-2.5">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="font-bangla text-[10px] text-muted-foreground">{label}</div>
        <div className="truncate text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}
