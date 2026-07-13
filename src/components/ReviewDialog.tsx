import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { StarInput } from "@/components/Stars";
import { toast } from "sonner";
import { Loader2, Bike, UtensilsCrossed, Camera, X } from "lucide-react";

const MAX_PHOTOS = 3;

export function ReviewDialog({
  open,
  onOpenChange,
  orderId,
  orderCode,
  orderType = "food",
  restaurantId = null,
  restaurantName,
  riderId = null,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orderId: string;
  orderCode: string;
  orderType?: "food" | "parcel";
  restaurantId?: string | null;
  restaurantName?: string | null;
  riderId?: string | null;
  onSubmitted: (review: { rating: number; rider_rating: number | null; comment: string | null }) => void;
}) {
  const [rating, setRating] = useState(0);
  const [riderRating, setRiderRating] = useState(0);
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const showOrderStars = orderType === "food";
  const showRiderStars = !!riderId;

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/") && f.size < 5 * 1024 * 1024);
    setPhotos((prev) => [...prev, ...arr].slice(0, MAX_PHOTOS));
  }

  async function uploadPhotos(uid: string): Promise<string[]> {
    if (!photos.length) return [];
    const paths: string[] = [];
    for (const f of photos) {
      const ext = (f.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${uid}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("review-photos").upload(path, f, {
        contentType: f.type,
        upsert: false,
      });
      if (error) throw error;
      paths.push(path);
    }
    return paths;
  }

  async function submit() {
    const primary = showOrderStars ? rating : riderRating;
    if (primary < 1) {
      toast.error("অন্তত ১ স্টার দিন");
      return;
    }
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("লগইন করুন");

      const trimmed = comment.trim().slice(0, 500);
      const finalOrderRating = showOrderStars ? rating : riderRating;
      const finalRiderRating = showRiderStars ? (riderRating || null) : null;
      const photo_urls = await uploadPhotos(uid);

      const { error } = await supabase.from("reviews" as any).insert({
        user_id: uid,
        order_type: orderType,
        order_id: orderId,
        restaurant_id: restaurantId,
        rider_id: riderId,
        rating: finalOrderRating,
        rider_rating: finalRiderRating,
        comment: trimmed || null,
        photo_urls,
      });
      if (error) {
        toast.error(error.message.includes("duplicate") ? "এই অর্ডারে রিভিউ দেওয়া হয়ে গেছে" : "জমা হয়নি");
        return;
      }
      toast.success("রিভিউয়ের জন্য ধন্যবাদ!");
      onSubmitted({ rating: finalOrderRating, rider_rating: finalRiderRating, comment: trimmed || null });
      onOpenChange(false);
      setRating(0);
      setRiderRating(0);
      setComment("");
      setPhotos([]);
    } catch (e: any) {
      toast.error(e?.message || "জমা হয়নি");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-bangla">রিভিউ দিন</DialogTitle>
          <DialogDescription className="font-bangla text-xs">
            অর্ডার <span className="font-mono">{orderCode}</span>
            {restaurantName ? ` — ${restaurantName}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {showOrderStars && (
            <div className="rounded-2xl border border-border bg-card p-3">
              <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                <UtensilsCrossed className="h-4 w-4" />
                <span className="font-bangla font-semibold">খাবারের অভিজ্ঞতা</span>
              </div>
              <div className="flex justify-center">
                <StarInput value={rating} onChange={setRating} />
              </div>
            </div>
          )}
          {showRiderStars && (
            <div className="rounded-2xl border border-border bg-card p-3">
              <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Bike className="h-4 w-4" />
                <span className="font-bangla font-semibold">রাইডারের সেবা</span>
              </div>
              <div className="flex justify-center">
                <StarInput value={riderRating} onChange={setRiderRating} />
              </div>
            </div>
          )}
        </div>

        <Textarea
          placeholder="আপনার মতামত লিখুন (ঐচ্ছিক)"
          maxLength={500}
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="font-bangla text-xs font-semibold text-muted-foreground">
              ছবি ({photos.length}/{MAX_PHOTOS})
            </span>
            {photos.length < MAX_PHOTOS && (
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border bg-secondary/50 px-2 py-1 text-xs font-semibold hover:bg-secondary">
                <Camera className="h-3.5 w-3.5" />
                <span className="font-bangla">যোগ করুন</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => addPhotos(e.target.files)}
                />
              </label>
            )}
          </div>
          {photos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {photos.map((f, i) => (
                <div key={i} className="relative">
                  <img
                    src={URL.createObjectURL(f)}
                    alt=""
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-destructive text-destructive-foreground"
                    aria-label="মুছুন"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>বাতিল</Button>
          <Button onClick={submit} disabled={saving} className="gradient-primary text-primary-foreground">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="font-bangla font-bold">জমা দিন</span>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
