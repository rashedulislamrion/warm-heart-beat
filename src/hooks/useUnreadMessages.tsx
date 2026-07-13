import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Key = `${"food" | "parcel"}:${string}`;

function keyOf(orderType: string, orderId: string): Key {
  return `${orderType as "food" | "parcel"}:${orderId}`;
}

function playBeep() {
  try {
    const AnyWin = window as any;
    const Ctx = AnyWin.AudioContext || AnyWin.webkitAudioContext;
    if (!Ctx) return;
    const ctx: AudioContext = AnyWin.__payraAudioCtx || (AnyWin.__payraAudioCtx = new Ctx());
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    const play = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(0.15, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.02);
    };
    play(880, 0, 0.14);
    play(1180, 0.12, 0.16);
  } catch {
    // ignore
  }
}

/**
 * Tracks unread order_messages counts per order for the current user.
 * Plays a soft chime whenever a new incoming message arrives.
 */
export function useUnreadMessages(userId: string | null | undefined) {
  const [unread, setUnread] = useState<Record<Key, number>>({});
  const mutedOrderRef = useRef<Set<Key>>(new Set());

  useEffect(() => {
    if (!userId) return;
    let alive = true;

    supabase
      .from("order_messages" as any)
      .select("order_type, order_id")
      .is("read_at", null)
      .neq("sender_id", userId)
      .then(({ data }) => {
        if (!alive || !data) return;
        const map: Record<Key, number> = {};
        for (const row of data as any[]) {
          const k = keyOf(row.order_type, row.order_id);
          map[k] = (map[k] ?? 0) + 1;
        }
        setUnread(map);
      });

    const channel = supabase
      .channel(`unread_messages:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "order_messages" },
        (payload) => {
          const row = payload.new as {
            sender_id: string; order_type: string; order_id: string; id: string;
          };
          if (row.sender_id === userId) return;
          const k = keyOf(row.order_type, row.order_id);
          if (mutedOrderRef.current.has(k)) return; // chat is open for this order
          setUnread((prev) => ({ ...prev, [k]: (prev[k] ?? 0) + 1 }));
          playBeep();
        },
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  function clearFor(orderType: "food" | "parcel", orderId: string) {
    const k = keyOf(orderType, orderId);
    mutedOrderRef.current.add(k);
    setUnread((prev) => {
      if (!prev[k]) return prev;
      const next = { ...prev };
      delete next[k];
      return next;
    });
  }

  function unmute(orderType: "food" | "parcel", orderId: string) {
    mutedOrderRef.current.delete(keyOf(orderType, orderId));
  }

  function countFor(orderType: "food" | "parcel", orderId: string) {
    return unread[keyOf(orderType, orderId)] ?? 0;
  }

  const total = Object.values(unread).reduce((a, b) => a + b, 0);

  return { unread, total, clearFor, unmute, countFor };
}
