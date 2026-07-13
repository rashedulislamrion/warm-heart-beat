import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Send, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function playSendChime() {
  try {
    const AnyWin = window as any;
    const Ctx = AnyWin.AudioContext || AnyWin.webkitAudioContext;
    if (!Ctx) return;
    const ctx: AudioContext = AnyWin.__payraAudioCtx || (AnyWin.__payraAudioCtx = new Ctx());
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(1100, now + 0.12);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  } catch {
    // ignore
  }
}

type OrderType = "food" | "parcel";
type Msg = { id: string; sender_id: string; body: string; created_at: string; read_at: string | null };

export function OrderChat({
  orderType,
  orderId,
  currentUserId,
  otherPartyName,
  disabled,
  disabledReason,
}: {
  orderType: OrderType;
  orderId: string;
  currentUserId: string;
  otherPartyName?: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    supabase
      .from("order_messages" as any)
      .select("id, sender_id, body, created_at, read_at")
      .eq("order_type", orderType)
      .eq("order_id", orderId)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) {
          toast.error(error.message);
          setMsgs([]);
          return;
        }
        setMsgs((data ?? []) as unknown as Msg[]);
      });

    const channel = supabase
      .channel(`order_chat:${orderType}:${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "order_messages",
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          const row = payload.new as Msg & { order_type: string };
          if (row.order_type !== orderType) return;
          setMsgs((prev) => {
            if (!prev) return [row];
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row];
          });
        },
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [orderType, orderId]);

  // Mark incoming messages as read
  useEffect(() => {
    if (!msgs) return;
    const unread = msgs.filter((m) => m.sender_id !== currentUserId && !m.read_at).map((m) => m.id);
    if (unread.length === 0) return;
    supabase
      .from("order_messages" as any)
      .update({ read_at: new Date().toISOString() })
      .in("id", unread)
      .then(() => {});
  }, [msgs, currentUserId]);

  // Auto scroll to bottom
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [msgs?.length]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    const { data, error } = await supabase
      .from("order_messages" as any)
      .insert({ order_type: orderType, order_id: orderId, sender_id: currentUserId, body })
      .select("id, sender_id, body, created_at, read_at")
      .single();
    setSending(false);
    if (error) return toast.error(error.message);
    setText("");
    setMsgs((prev) => {
      const row = data as unknown as Msg;
      if (!prev) return [row];
      if (prev.some((m) => m.id === row.id)) return prev;
      return [...prev, row];
    });
  }

  return (
    <div className="flex h-[440px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="flex items-center gap-2 border-b border-border bg-secondary/40 px-4 py-3">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary">
          <MessageCircle className="h-4 w-4" />
        </span>
        <div>
          <div className="text-sm font-bold">{otherPartyName || "চ্যাট"}</div>
          <div className="text-[11px] text-muted-foreground">অর্ডার সংক্রান্ত বার্তা</div>
        </div>
      </div>

      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {msgs === null ? (
          <div className="grid h-full place-items-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : msgs.length === 0 ? (
          <div className="grid h-full place-items-center text-center">
            <div>
              <MessageCircle className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-2 font-bangla text-xs text-muted-foreground">
                {disabled ? disabledReason ?? "চ্যাট এখনও উপলব্ধ নয়" : "বার্তা লিখে শুরু করুন"}
              </p>
            </div>
          </div>
        ) : (
          msgs.map((m) => {
            const mine = m.sender_id === currentUserId;
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                    mine
                      ? "rounded-br-md bg-primary text-primary-foreground"
                      : "rounded-bl-md bg-secondary text-foreground",
                  )}
                >
                  <div className="whitespace-pre-wrap break-words">{m.body}</div>
                  <div
                    className={cn(
                      "mt-1 text-[10px]",
                      mine ? "text-primary-foreground/70" : "text-muted-foreground",
                    )}
                  >
                    {new Date(m.created_at).toLocaleTimeString("bn-BD", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {mine && m.read_at ? " · পঠিত" : ""}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-border bg-background/60 p-2">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={disabled ? disabledReason ?? "চ্যাট বন্ধ" : "বার্তা লিখুন..."}
            disabled={disabled || sending}
            maxLength={1000}
            rows={1}
            className="min-h-[40px] max-h-32 flex-1 resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
          />
          <button
            onClick={send}
            disabled={disabled || sending || !text.trim()}
            className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-soft disabled:opacity-40"
            aria-label="পাঠান"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
