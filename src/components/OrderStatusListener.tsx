import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const LABELS: Record<string, string> = {
  pending: "অপেক্ষমান",
  confirmed: "নিশ্চিত হয়েছে",
  rider_assigned: "রাইডার অ্যাসাইনড",
  preparing: "প্রস্তুত হচ্ছে",
  picked_up: "পিকআপ হয়েছে",
  delivered: "ডেলিভার্ড",
  cancelled: "বাতিল",
};

/**
 * Global listener: toast the current user when the status of one of their
 * parcels or food orders changes.
 */
export function OrderStatusListener() {
  useEffect(() => {
    let mounted = true;
    let channels: ReturnType<typeof supabase.channel>[] = [];

    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid || !mounted) return;

      const parcelCh = supabase
        .channel(`parcel-status-${uid}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "parcels", filter: `user_id=eq.${uid}` },
          (payload) => {
            const oldStatus = (payload.old as any)?.status;
            const newStatus = (payload.new as any)?.status;
            const code = (payload.new as any)?.order_code;
            if (oldStatus === newStatus || !newStatus) return;
            const label = LABELS[newStatus] ?? newStatus;
            if (newStatus === "delivered") toast.success(`পার্সেল ${code} ডেলিভার্ড ✅`);
            else if (newStatus === "cancelled") toast.error(`পার্সেল ${code} বাতিল হয়েছে`);
            else toast(`পার্সেল ${code}: ${label}`);
          },
        )
        .subscribe();

      const foodCh = supabase
        .channel(`food-status-${uid}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "food_orders", filter: `user_id=eq.${uid}` },
          (payload) => {
            const oldStatus = (payload.old as any)?.status;
            const newStatus = (payload.new as any)?.status;
            const code = (payload.new as any)?.order_code;
            if (oldStatus === newStatus || !newStatus) return;
            const label = LABELS[newStatus] ?? newStatus;
            if (newStatus === "delivered") toast.success(`অর্ডার ${code} ডেলিভার্ড ✅`);
            else if (newStatus === "cancelled") toast.error(`অর্ডার ${code} বাতিল হয়েছে`);
            else toast(`অর্ডার ${code}: ${label}`);
          },
        )
        .subscribe();

      channels = [parcelCh, foodCh];
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        channels.forEach((c) => supabase.removeChannel(c));
        channels = [];
      }
    });

    return () => {
      mounted = false;
      channels.forEach((c) => supabase.removeChannel(c));
      sub.subscription.unsubscribe();
    };
  }, []);

  return null;
}
