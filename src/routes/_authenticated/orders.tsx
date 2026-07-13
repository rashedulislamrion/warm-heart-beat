import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { FloatingActions } from "@/components/FloatingActions";
import { Logo } from "@/components/Logo";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, ArrowLeft, Inbox } from "lucide-react";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({ meta: [{ title: "আমার অর্ডার — পায়রা" }] }),
  component: OrdersPage,
});

type Parcel = {
  id: string; order_code: string; status: string; delivery_charge: number;
  sender_hall: string; receiver_hall: string; created_at: string;
};

const statusMap: Record<string, { label: string; className: string }> = {
  pending: { label: "অপেক্ষমাণ", className: "bg-muted text-muted-foreground" },
  rider_assigned: { label: "রাইডার নিয়োগ", className: "bg-primary/10 text-primary" },
  picked_up: { label: "পিকআপ হয়েছে", className: "bg-accent/10 text-accent" },
  delivered: { label: "ডেলিভার্ড", className: "bg-success/10 text-success" },
  cancelled: { label: "বাতিল", className: "bg-destructive/10 text-destructive" },
};

function OrdersPage() {
  const { user } = Route.useRouteContext();
  const [rows, setRows] = useState<Parcel[] | null>(null);

  useEffect(() => {
    supabase
      .from("parcels")
      .select("id, order_code, status, delivery_charge, sender_hall, receiver_hall, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows((data as Parcel[]) ?? []));
  }, [user.id]);

  return (
    <div className="min-h-screen gradient-hero pb-24">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 pt-6">
        <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
        <Logo />
        <div className="w-5" />
      </header>

      <div className="mx-auto mt-6 max-w-3xl px-4">
        <h1 className="font-bangla text-2xl font-extrabold">আমার অর্ডার</h1>

        <div className="mt-4 space-y-3">
          {rows === null ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)
          ) : rows.length === 0 ? (
            <div className="mt-16 text-center">
              <Inbox className="mx-auto h-14 w-14 text-muted-foreground/40" />
              <p className="mt-4 font-bangla text-muted-foreground">কোনো অর্ডার নেই</p>
              <Link to="/parcel" className="mt-4 inline-flex rounded-full gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-soft">
                <span className="font-bangla">প্রথম পার্সেল পাঠান</span>
              </Link>
            </div>
          ) : (
            rows.map((r) => {
              const s = statusMap[r.status] ?? statusMap.pending!;
              return (
                <div key={r.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl gradient-primary text-primary-foreground">
                        <Package className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate font-bold">{r.order_code}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {r.sender_hall} → {r.receiver_hall}
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {new Date(r.created_at).toLocaleString("bn-BD")}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${s.className}`}>
                        <span className="font-bangla">{s.label}</span>
                      </span>
                      <div className="mt-1 text-sm font-bold text-primary">৳{r.delivery_charge}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <FloatingActions />
      <MobileBottomNav />
    </div>
  );
}
