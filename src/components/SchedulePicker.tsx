import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Clock, Zap } from "lucide-react";

export type Schedule = { mode: "now" | "later"; iso: string | null };

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function toLocalInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SchedulePicker({
  value,
  onChange,
  minMinutes = 30,
}: {
  value: Schedule;
  onChange: (v: Schedule) => void;
  minMinutes?: number;
}) {
  const { minStr, maxStr } = useMemo(() => {
    const min = new Date(Date.now() + minMinutes * 60 * 1000);
    const max = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return { minStr: toLocalInput(min), maxStr: toLocalInput(max) };
  }, [minMinutes]);

  const localValue = value.iso ? toLocalInput(new Date(value.iso)) : "";

  return (
    <div>
      <Label className="mb-3 block">ডেলিভারি সময়</Label>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange({ mode: "now", iso: null })}
          className={`flex flex-col items-center gap-1 rounded-2xl border-2 p-3 transition-all ${
            value.mode === "now"
              ? "border-primary bg-primary/5 text-primary"
              : "border-border bg-card text-muted-foreground hover:border-primary/40"
          }`}
        >
          <Zap className="h-5 w-5" />
          <span className="font-bangla text-sm font-semibold">এখনই</span>
          <span className="font-bangla text-[10px] text-muted-foreground">যত দ্রুত সম্ভব</span>
        </button>
        <button
          type="button"
          onClick={() => {
            const def = new Date(Date.now() + Math.max(minMinutes, 60) * 60 * 1000);
            onChange({ mode: "later", iso: def.toISOString() });
          }}
          className={`flex flex-col items-center gap-1 rounded-2xl border-2 p-3 transition-all ${
            value.mode === "later"
              ? "border-accent bg-accent/5 text-accent"
              : "border-border bg-card text-muted-foreground hover:border-accent/40"
          }`}
        >
          <Clock className="h-5 w-5" />
          <span className="font-bangla text-sm font-semibold">পরে</span>
          <span className="font-bangla text-[10px] text-muted-foreground">সময় বেছে নিন</span>
        </button>
      </div>
      {value.mode === "later" && (
        <div className="mt-3">
          <Input
            type="datetime-local"
            className="h-12 rounded-xl"
            min={minStr}
            max={maxStr}
            value={localValue}
            onChange={(e) => {
              const v = e.target.value;
              onChange({ mode: "later", iso: v ? new Date(v).toISOString() : null });
            }}
          />
          <p className="mt-1.5 font-bangla text-[11px] text-muted-foreground">
            কমপক্ষে {minMinutes} মিনিট পরে, সর্বোচ্চ ৭ দিনের মধ্যে
          </p>
        </div>
      )}
    </div>
  );
}

export function formatSchedule(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleString("bn-BD", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
