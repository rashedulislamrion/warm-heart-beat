import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Bike, Phone, Trash2, CheckCircle2, XCircle, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/riders")({
  component: RidersAdmin,
});

type App = {
  id: string;
  full_name: string;
  phone: string;
  student_id: string | null;
  hall: string | null;
  department: string | null;
  semester: string | null;
  availability: string | null;
  has_bike: boolean;
  motivation: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
};

const STATUSES = ["pending", "approved", "rejected"] as const;
const tone: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

function RidersAdmin() {
  const [apps, setApps] = useState<App[] | null>(null);
  const [filter, setFilter] = useState<"all" | (typeof STATUSES)[number]>("all");

  async function load() {
    const { data, error } = await supabase
      .from("rider_applications" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("লোড করতে ব্যর্থ");
      return;
    }
    setApps((data ?? []) as unknown as App[]);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("rider_applications")
      .on("postgres_changes", { event: "*", schema: "public", table: "rider_applications" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from("rider_applications" as any).update({ status }).eq("id", id);
    if (error) toast.error("আপডেট ব্যর্থ");
    else toast.success("স্ট্যাটাস আপডেট");
  }

  async function remove(id: string) {
    if (!confirm("সত্যিই মুছে ফেলবেন?")) return;
    const { error } = await supabase.from("rider_applications" as any).delete().eq("id", id);
    if (error) toast.error("মুছতে ব্যর্থ");
    else toast.success("মুছে ফেলা হয়েছে");
  }

  const shown = apps?.filter((a) => filter === "all" || a.status === filter) ?? null;
  const counts = {
    all: apps?.length ?? 0,
    pending: apps?.filter((a) => a.status === "pending").length ?? 0,
    approved: apps?.filter((a) => a.status === "approved").length ?? 0,
    rejected: apps?.filter((a) => a.status === "rejected").length ?? 0,
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-bangla text-2xl font-extrabold">
            <Bike className="h-6 w-6 text-primary" /> রাইডার আবেদন
          </h1>
          <p className="text-sm text-muted-foreground">মোট {counts.all} • অপেক্ষমান {counts.pending}</p>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সব ({counts.all})</SelectItem>
            <SelectItem value="pending">অপেক্ষমান ({counts.pending})</SelectItem>
            <SelectItem value="approved">অনুমোদিত ({counts.approved})</SelectItem>
            <SelectItem value="rejected">প্রত্যাখ্যাত ({counts.rejected})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {shown === null ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
        </div>
      ) : shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Bike className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-bangla font-bold">কোনো আবেদন নেই</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {shown.map((a) => (
            <div key={a.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bangla text-lg font-bold">{a.full_name}</div>
                  <a href={`tel:${a.phone}`} className="mt-0.5 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                    <Phone className="h-3.5 w-3.5" /> {a.phone}
                  </a>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone[a.status] ?? tone.pending}`}>
                  {a.status === "approved" ? <CheckCircle2 className="h-3 w-3" /> : a.status === "rejected" ? <XCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                  {a.status}
                </span>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                {a.student_id && <Info label="ID" value={a.student_id} />}
                {a.hall && <Info label="হল" value={a.hall} />}
                {a.department && <Info label="ডিপার্টমেন্ট" value={a.department} />}
                {a.semester && <Info label="সেমিস্টার" value={a.semester} />}
                <Info label="বাইক" value={a.has_bike ? "আছে" : "নেই"} />
                <Info label="আবেদন" value={new Date(a.created_at).toLocaleDateString("bn-BD")} />
              </dl>

              {a.availability && (
                <p className="mt-3 rounded-lg bg-muted/50 p-2 font-bangla text-xs">
                  <b>ফাঁকা সময়:</b> {a.availability}
                </p>
              )}
              {a.motivation && (
                <p className="mt-2 rounded-lg bg-muted/50 p-2 font-bangla text-xs">{a.motivation}</p>
              )}

              <div className="mt-4 flex items-center gap-2">
                <Select value={a.status} onValueChange={(v) => updateStatus(a.id, v)}>
                  <SelectTrigger className="h-9 flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" onClick={() => remove(a.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="truncate">
      <span className="text-muted-foreground">{label}:</span> <span className="font-semibold">{value}</span>
    </div>
  );
}
