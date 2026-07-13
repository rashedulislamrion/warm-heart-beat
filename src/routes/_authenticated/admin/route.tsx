import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Loader2, LayoutDashboard, Store, ArrowLeft, Bike } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "অ্যাডমিন — পায়রা" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "ok" | "denied">("loading");
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      if (error || !data) {
        setState("denied");
        toast.error("অ্যাডমিন অ্যাক্সেস নেই");
        setTimeout(() => navigate({ to: "/" }), 1200);
        return;
      }
      setState("ok");
    })();
  }, [user.id, navigate]);

  if (state === "loading") {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (state === "denied") {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <p className="font-bangla text-lg font-bold">অনুমতি নেই</p>
          <p className="mt-1 text-sm text-muted-foreground">Redirecting…</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { to: "/admin", label: "ড্যাশবোর্ড", Icon: LayoutDashboard },
    { to: "/admin/restaurants", label: "রেস্টুরেন্ট", Icon: Store },
    { to: "/admin/riders", label: "রাইডার", Icon: Bike },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link to="/" className="grid h-9 w-9 place-items-center rounded-lg border border-border">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Logo />
          <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
            admin
          </span>
          <nav className="ml-auto flex gap-1">
            {tabs.map(({ to, label, Icon }) => {
              const active = path === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-bangla hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
