import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StarDisplay } from "@/components/Stars";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Star, MessageSquare, Store, Bike, Loader2 } from "lucide-react";

export type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  photo_urls: string[] | null;
  owner_reply: string | null;
  owner_reply_at: string | null;
  rider_reply: string | null;
  rider_reply_at: string | null;
  user_id?: string;
};

type SortKey = "recent" | "high" | "low";

export function ReviewList({
  reviews,
  loading,
  canReplyOwner = false,
  canReplyRider = false,
  onReplied,
}: {
  reviews: ReviewRow[] | null;
  loading?: boolean;
  canReplyOwner?: boolean;
  canReplyRider?: boolean;
  onReplied?: () => void;
}) {
  const [minStars, setMinStars] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  const [sort, setSort] = useState<SortKey>("recent");
  const [signed, setSigned] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    if (!reviews) return null;
    let arr = reviews.filter((r) => r.rating >= minStars);
    if (sort === "recent") arr = arr.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    if (sort === "high") arr = arr.sort((a, b) => b.rating - a.rating);
    if (sort === "low") arr = arr.sort((a, b) => a.rating - b.rating);
    return arr;
  }, [reviews, minStars, sort]);

  // Batch-sign photos
  useEffect(() => {
    const missing = new Set<string>();
    (reviews ?? []).forEach((r) => (r.photo_urls ?? []).forEach((p) => { if (!signed[p]) missing.add(p); }));
    if (!missing.size) return;
    const paths = [...missing];
    supabase.storage.from("review-photos").createSignedUrls(paths, 3600).then(({ data }) => {
      if (!data) return;
      const map: Record<string, string> = {};
      data.forEach((d, i) => { if (d.signedUrl) map[paths[i]!] = d.signedUrl; });
      setSigned((prev) => ({ ...prev, ...map }));
    });
  }, [reviews]);

  if (loading || reviews === null) {
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full bg-secondary p-0.5">
          {([0, 5, 4, 3] as const).map((n) => (
            <button
              key={n}
              onClick={() => setMinStars(n)}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                minStars === n ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              {n === 0 ? <span className="font-bangla">সব</span> : <><Star className="h-3 w-3 fill-accent text-accent" /> {n}+</>}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="ml-auto rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold"
        >
          <option value="recent">সাম্প্রতিক</option>
          <option value="high">উঁচু রেটিং</option>
          <option value="low">নিচু রেটিং</option>
        </select>
      </div>

      {filtered && filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center">
          <MessageSquare className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
          <p className="font-bangla text-sm text-muted-foreground">এই ফিল্টারে কোনো রিভিউ নেই</p>
        </div>
      ) : (
        (filtered ?? []).map((rv) => (
          <ReviewCard
            key={rv.id}
            rv={rv}
            signed={signed}
            canReplyOwner={canReplyOwner}
            canReplyRider={canReplyRider}
            onReplied={onReplied}
          />
        ))
      )}
    </div>
  );
}

function ReviewCard({
  rv,
  signed,
  canReplyOwner,
  canReplyRider,
  onReplied,
}: {
  rv: ReviewRow;
  signed: Record<string, string>;
  canReplyOwner: boolean;
  canReplyRider: boolean;
  onReplied?: () => void;
}) {
  const [replying, setReplying] = useState<"owner" | "rider" | null>(null);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveReply(kind: "owner" | "rider") {
    const trimmed = text.trim().slice(0, 500);
    if (!trimmed) return;
    setSaving(true);
    const patch =
      kind === "owner"
        ? { owner_reply: trimmed, owner_reply_at: new Date().toISOString() }
        : { rider_reply: trimmed, rider_reply_at: new Date().toISOString() };
    const { error } = await supabase.from("reviews" as any).update(patch).eq("id", rv.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("উত্তর জমা হয়েছে");
    setReplying(null);
    setText("");
    onReplied?.();
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <StarDisplay value={rv.rating} size={14} />
        <span className="text-[11px] text-muted-foreground">
          {new Date(rv.created_at).toLocaleDateString("bn-BD")}
        </span>
      </div>
      {rv.comment && <p className="mt-2 font-bangla text-sm leading-relaxed">{rv.comment}</p>}

      {rv.photo_urls && rv.photo_urls.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {rv.photo_urls.map((p) =>
            signed[p] ? (
              <a key={p} href={signed[p]} target="_blank" rel="noreferrer">
                <img src={signed[p]} alt="" className="h-20 w-20 rounded-lg object-cover" loading="lazy" />
              </a>
            ) : (
              <div key={p} className="h-20 w-20 animate-pulse rounded-lg bg-muted" />
            )
          )}
        </div>
      )}

      {rv.owner_reply && (
        <div className="mt-3 rounded-xl bg-primary/5 p-3 text-sm">
          <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-primary">
            <Store className="h-3 w-3" /> <span className="font-bangla">রেস্টুরেন্টের উত্তর</span>
            <span className="ml-auto text-muted-foreground">
              {rv.owner_reply_at ? new Date(rv.owner_reply_at).toLocaleDateString("bn-BD") : ""}
            </span>
          </div>
          <p className="font-bangla leading-relaxed">{rv.owner_reply}</p>
        </div>
      )}
      {rv.rider_reply && (
        <div className="mt-2 rounded-xl bg-accent/10 p-3 text-sm">
          <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-accent">
            <Bike className="h-3 w-3" /> <span className="font-bangla">রাইডারের উত্তর</span>
            <span className="ml-auto text-muted-foreground">
              {rv.rider_reply_at ? new Date(rv.rider_reply_at).toLocaleDateString("bn-BD") : ""}
            </span>
          </div>
          <p className="font-bangla leading-relaxed">{rv.rider_reply}</p>
        </div>
      )}

      {(canReplyOwner && !rv.owner_reply) || (canReplyRider && !rv.rider_reply) ? (
        <div className="mt-3">
          {replying === null ? (
            <div className="flex gap-2">
              {canReplyOwner && !rv.owner_reply && (
                <Button size="sm" variant="outline" onClick={() => setReplying("owner")} className="h-8 rounded-lg text-xs">
                  <Store className="mr-1 h-3 w-3" /> উত্তর দিন
                </Button>
              )}
              {canReplyRider && !rv.rider_reply && (
                <Button size="sm" variant="outline" onClick={() => setReplying("rider")} className="h-8 rounded-lg text-xs">
                  <Bike className="mr-1 h-3 w-3" /> উত্তর দিন
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="আপনার উত্তর"
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setReplying(null); setText(""); }}>
                  বাতিল
                </Button>
                <Button size="sm" disabled={saving || !text.trim()} onClick={() => saveReply(replying!)} className="gradient-primary text-primary-foreground">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span className="font-bangla">জমা দিন</span>}
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
