import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  UtensilsCrossed,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { PushNotificationToggle } from "@/components/PushNotificationToggle";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "নোটিফিকেশন — DearDash" }] }),
  component: NotificationsPage,
});

type Notification = {
  id: string;
  title: string;
  body: string;
  url: string | null;
  type: string;
  read_at: string | null;
  created_at: string;
};

function NotificationsPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [items, setItems] = useState<Notification[] | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    let alive = true;
    supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) toast.error("লোড করা যায়নি");
        setItems((data ?? []) as Notification[]);
      });

    const channel = supabase
      .channel("notifications-inbox")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setItems((prev) => {
            if (!prev) return prev;
            if (payload.eventType === "INSERT") {
              return [payload.new as Notification, ...prev];
            }
            if (payload.eventType === "UPDATE") {
              return prev.map((n) => (n.id === (payload.new as any).id ? (payload.new as Notification) : n));
            }
            if (payload.eventType === "DELETE") {
              return prev.filter((n) => n.id !== (payload.old as any).id);
            }
            return prev;
          });
        },
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  const unreadCount = useMemo(
    () => (items ?? []).filter((n) => !n.read_at).length,
    [items],
  );
  const visible = useMemo(
    () => (items ?? []).filter((n) => filter === "all" || !n.read_at),
    [items, filter],
  );

  async function markRead(id: string) {
    setItems((prev) => prev?.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)) ?? null);
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  }

  async function markAll() {
    const now = new Date().toISOString();
    setItems((prev) => prev?.map((n) => (n.read_at ? n : { ...n, read_at: now })) ?? null);
    const { error } = await supabase.rpc("mark_all_notifications_read");
    if (error) toast.error("করা যায়নি");
    else toast.success("সব পঠিত করা হয়েছে");
  }

  async function remove(id: string) {
    const snapshot = items;
    setItems((prev) => prev?.filter((n) => n.id !== id) ?? null);
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) {
      setItems(snapshot);
      toast.error("মুছে ফেলা যায়নি");
    }
  }

  async function onOpen(n: Notification) {
    if (!n.read_at) await markRead(n.id);
    if (n.url) navigate({ to: n.url as any });
  }

  return (
    <div className="min-h-screen gradient-hero pb-24">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur-lg">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link to="/profile" className="grid h-9 w-9 place-items-center rounded-lg border border-border">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Logo />
          <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
            inbox
          </span>
          <div className="ml-auto">
            <PushNotificationToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
            <button
              onClick={() => setFilter("all")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold font-bangla transition-colors ${
                filter === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              সব
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold font-bangla transition-colors ${
                filter === "unread" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              অপঠিত {unreadCount > 0 && <span className="ml-1">({unreadCount})</span>}
            </button>
          </div>
          {unreadCount > 0 && (
            <Button size="sm" variant="outline" onClick={markAll} className="gap-1.5">
              <CheckCheck className="h-4 w-4" />
              <span className="font-bangla">সব পঠিত</span>
            </Button>
          )}
        </div>

        {items === null ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <ul className="space-y-2">
            {visible.map((n) => (
              <li
                key={n.id}
                className={`group flex items-start gap-3 rounded-2xl border p-4 shadow-sm transition-colors ${
                  n.read_at
                    ? "border-border bg-card"
                    : "border-primary/30 bg-primary/[0.04]"
                }`}
              >
                <div
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                    n.type === "food_order"
                      ? "bg-accent/15 text-accent"
                      : n.type === "parcel"
                      ? "bg-primary/15 text-primary"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {n.type === "food_order" ? (
                    <UtensilsCrossed className="h-5 w-5" />
                  ) : n.type === "parcel" ? (
                    <Package className="h-5 w-5" />
                  ) : (
                    <Bell className="h-5 w-5" />
                  )}
                </div>
                <button onClick={() => onOpen(n)} className="min-w-0 flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-sm font-bold">{n.title}</div>
                    {!n.read_at && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  </div>
                  <div className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{n.body}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                    {formatTime(n.created_at)}
                  </div>
                </button>
                <div className="flex flex-col gap-1">
                  {!n.read_at && (
                    <button
                      onClick={() => markRead(n.id)}
                      className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
                      aria-label="Mark read"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => remove(n.id)}
                    className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
}

function EmptyState({ filter }: { filter: "all" | "unread" }) {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed border-border bg-card/50 p-10 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-secondary text-muted-foreground">
        <BellOff className="h-6 w-6" />
      </div>
      <p className="mt-3 font-bangla text-sm font-semibold">
        {filter === "unread" ? "কোনো অপঠিত নোটিফিকেশন নেই" : "এখনো কোনো নোটিফিকেশন নেই"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        অর্ডার আপডেট এলে এখানে দেখাবে
      </p>
    </div>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "এইমাত্র";
  if (diff < 3600) return `${Math.floor(diff / 60)} মিনিট আগে`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ঘন্টা আগে`;
  return d.toLocaleDateString("bn-BD", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
