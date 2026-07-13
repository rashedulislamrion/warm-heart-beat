import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { StarInput } from "@/components/Stars";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function ReviewDialog({
  open,
  onOpenChange,
  orderId,
  orderCode,
  restaurantId,
  restaurantName,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orderId: string;
  orderCode: string;
  restaurantId: string | null;
  restaurantName?: string | null;
  onSubmitted: (review: { rating: number; comment: string | null }) => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (rating < 1) {
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
    const { error } = await supabase.from("reviews" as any).insert({
      user_id: uid,
      order_type: "food",
      order_id: orderId,
      restaurant_id: restaurantId,
      rating,
      comment: trimmed || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "এই অর্ডারে রিভিউ দেওয়া হয়ে গেছে" : "জমা হয়নি");
      return;
    }
    toast.success("রিভিউয়ের জন্য ধন্যবাদ!");
    onSubmitted({ rating, comment: trimmed || null });
    onOpenChange(false);
    setRating(0);
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

        <div className="flex justify-center py-2">
          <StarInput value={rating} onChange={setRating} />
        </div>

        <Textarea
          placeholder="আপনার মতামত লিখুন (ঐচ্ছিক)"
          maxLength={500}
          rows={4}
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
