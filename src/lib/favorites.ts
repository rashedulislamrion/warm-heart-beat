import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useFavorites(userId: string | null | undefined) {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIds(new Set());
      setLoading(false);
      return;
    }
    let alive = true;
    supabase
      .from("favorite_restaurants")
      .select("restaurant_id")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (!alive) return;
        setIds(new Set((data ?? []).map((r) => r.restaurant_id)));
        setLoading(false);
      });
    return () => { alive = false; };
  }, [userId]);

  const toggle = useCallback(
    async (restaurantId: string) => {
      if (!userId) {
        toast.error("লগইন করুন");
        return;
      }
      const isFav = ids.has(restaurantId);
      // optimistic
      setIds((prev) => {
        const next = new Set(prev);
        if (isFav) next.delete(restaurantId);
        else next.add(restaurantId);
        return next;
      });
      if (isFav) {
        const { error } = await supabase
          .from("favorite_restaurants")
          .delete()
          .eq("user_id", userId)
          .eq("restaurant_id", restaurantId);
        if (error) {
          toast.error("সরানো যায়নি");
          setIds((prev) => new Set(prev).add(restaurantId));
        }
      } else {
        const { error } = await supabase
          .from("favorite_restaurants")
          .insert({ user_id: userId, restaurant_id: restaurantId });
        if (error) {
          toast.error("যোগ করা যায়নি");
          setIds((prev) => {
            const next = new Set(prev);
            next.delete(restaurantId);
            return next;
          });
        } else {
          toast.success("প্রিয়তে যোগ হয়েছে ❤️");
        }
      }
    },
    [ids, userId],
  );

  return { ids, toggle, loading };
}

export function useCurrentUserId() {
  const [uid, setUid] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setUid(s?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return uid;
}
