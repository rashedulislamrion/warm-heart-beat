import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Tag, X, Wallet } from "lucide-react";
import { Input } from "@/components/ui/input";

export function PromoAndCredits({
  subtotal,
  orderType,
  onChange,
}: {
  subtotal: number;
  orderType: "food" | "parcel";
  onChange: (v: { promoCode: string | null; promoDiscount: number; creditsUsed: number }) => void;
}) {
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null);
  const [checking, setChecking] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [useCredits, setUseCredits] = useState(false);

  useEffect(() => {
    (supabase.rpc as any)("my_credit_balance").then(({ data }: { data: number | null }) => {
      setBalance(Number(data ?? 0));
    });
  }, []);

  useEffect(() => {
    const promoDiscount = applied?.discount ?? 0;
    const remainingAfterPromo = Math.max(0, subtotal - promoDiscount);
    const creditsUsed = useCredits ? Math.min(balance, remainingAfterPromo) : 0;
    onChange({
      promoCode: applied?.code ?? null,
      promoDiscount,
      creditsUsed,
    });
  }, [applied, useCredits, balance, subtotal, onChange]);

  async function apply() {
    const c = code.trim().toUpperCase();
    if (!c) return;
    setChecking(true);
    const { data, error } = await (supabase.rpc as any)("validate_promo", {
      _code: c,
      _order_type: orderType,
      _subtotal: subtotal,
    });
    setChecking(false);
    if (error) return toast.error(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || !row.promo_id) {
      toast.error(row?.message ?? "কোড গ্রহণযোগ্য নয়");
      return;
    }
    setApplied({ code: row.code, discount: row.discount });
    toast.success(`৳${row.discount} ছাড় প্রয়োগ হয়েছে!`);
  }

  const promoDiscount = applied?.discount ?? 0;
  const remainingAfterPromo = Math.max(0, subtotal - promoDiscount);
  const creditsUsable = Math.min(balance, remainingAfterPromo);
  const creditsUsed = useCredits ? creditsUsable : 0;

  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
      <h2 className="mb-3 font-bangla text-sm font-bold uppercase tracking-wider text-muted-foreground">
        অফার ও ক্রেডিট
      </h2>

      {applied ? (
        <div className="flex items-center justify-between rounded-xl border border-success/40 bg-success/5 p-3">
          <div className="inline-flex items-center gap-2">
            <Tag className="h-4 w-4 text-success" />
            <div>
              <div className="text-sm font-bold text-success">{applied.code}</div>
              <div className="text-xs text-muted-foreground">৳{applied.discount} ছাড়</div>
            </div>
          </div>
          <button
            onClick={() => { setApplied(null); setCode(""); }}
            className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted"
            aria-label="সরান"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="প্রোমো কোড"
            className="h-11 rounded-xl uppercase"
            maxLength={24}
          />
          <button
            onClick={apply}
            disabled={checking || !code.trim()}
            className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : "প্রয়োগ"}
          </button>
        </div>
      )}

      {balance > 0 && (
        <label className="mt-3 flex cursor-pointer items-center justify-between rounded-xl border border-border p-3">
          <div className="inline-flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/10 text-accent">
              <Wallet className="h-4 w-4" />
            </span>
            <div>
              <div className="text-sm font-semibold">ক্রেডিট ব্যবহার</div>
              <div className="text-xs text-muted-foreground">
                ব্যালেন্স ৳{balance} · প্রযোজ্য ৳{creditsUsable}
              </div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={useCredits}
            onChange={(e) => setUseCredits(e.target.checked)}
            disabled={creditsUsable <= 0}
            className="h-5 w-5 accent-primary"
          />
        </label>
      )}

      {(promoDiscount > 0 || creditsUsed > 0) && (
        <div className="mt-3 space-y-1 rounded-xl bg-secondary/40 p-3 text-xs">
          {promoDiscount > 0 && (
            <div className="flex justify-between">
              <span className="font-bangla text-muted-foreground">প্রোমো ছাড়</span>
              <span className="font-bold text-success">−৳{promoDiscount}</span>
            </div>
          )}
          {creditsUsed > 0 && (
            <div className="flex justify-between">
              <span className="font-bangla text-muted-foreground">ক্রেডিট</span>
              <span className="font-bold text-success">−৳{creditsUsed}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
