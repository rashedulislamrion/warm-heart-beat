import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { StarInput } from "@/components/Stars";
import { toast } from "sonner";
import { Loader2, Bike, UtensilsCrossed } from "lucide-react";

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
  const [saving, setSaving] = useState(false);

  const showOrderStars = orderType === "food";
  const showRiderStars = !!riderId;

  async function submit() {
    // For parcel with rider: rider_rating is primary. For food: overall rating is primary.
    const primary = showOrderStars ? rating : riderRating;
    if (primary < 1) {
      toast.error("অন্তত ১ স্টার দিন");
      return;
    }
    setSaving(true);
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) {
      setSaving(false);
      toast.error("লগইন করুন");
      return;
    }
    const trimmed = comment.trim().slice(0, 500);
    const finalOrderRating = showOrderStars ? rating : riderRating; // parcels reuse overall rating from rider stars
    const finalRiderRating = showRiderStars ? (riderRating || null) : null;

    const { error } = await supabase.from("reviews" as any).insert({
      user_id: uid,
      order_type: orderType,
      order_id: orderId,
      restaurant_id: restaurantId,
      rider_id: riderId,
      rating: finalOrderRating,
      rider_rating: finalRiderRating,
      comment: trimmed || null,
    });
    setSaving(false);
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
