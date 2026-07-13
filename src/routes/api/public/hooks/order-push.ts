import { createFileRoute } from "@tanstack/react-router";

type Body = { order_type?: "food" | "parcel"; order_id?: string };

const STATUS_LABELS: Record<string, string> = {
  pending: "অর্ডার গৃহীত",
  confirmed: "অর্ডার নিশ্চিত হয়েছে",
  preparing: "খাবার তৈরি হচ্ছে",
  ready: "প্রস্তুত হয়েছে",
  picked_up: "রাইডার নিয়েছে",
  on_the_way: "পথে আছে",
  delivered: "ডেলিভার হয়েছে",
  cancelled: "বাতিল হয়েছে",
};

async function loadOrder(admin: any, type: "food" | "parcel", id: string) {
  const table = type === "food" ? "food_orders" : "parcels";
  const { data, error } = await admin
    .from(table)
    .select("id, user_id, status, order_code, receiver_hall")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as { id: string; user_id: string; status: string; order_code: string; receiver_hall: string } | null;
}

export const Route = createFileRoute("/api/public/hooks/order-push")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Body = {};
        try { body = (await request.json()) as Body; } catch {}
        const type = body.order_type;
        const orderId = body.order_id;
        if (!type || !orderId || (type !== "food" && type !== "parcel")) {
          return new Response(JSON.stringify({ error: "invalid payload" }), { status: 400 });
        }

        const [{ supabaseAdmin }, webpushMod] = await Promise.all([
          import("@/integrations/supabase/client.server"),
          import("web-push"),
        ]);
        const webpush = (webpushMod as any).default ?? webpushMod;

        const publicKey = process.env.VAPID_PUBLIC_KEY!;
        const privateKey = process.env.VAPID_PRIVATE_KEY!;
        const subject = process.env.VAPID_SUBJECT || "mailto:notify@payra.app";
        webpush.setVapidDetails(subject, publicKey, privateKey);

        const order = await loadOrder(supabaseAdmin, type, orderId);
        if (!order) return new Response(JSON.stringify({ error: "not found" }), { status: 404 });

        const { data: subs, error: subsErr } = await supabaseAdmin
          .from("push_subscriptions")
          .select("id, endpoint, p256dh, auth")
          .eq("user_id", order.user_id);
        if (subsErr) return new Response(JSON.stringify({ error: subsErr.message }), { status: 500 });
        if (!subs || subs.length === 0) return new Response(JSON.stringify({ ok: true, sent: 0 }));

        const label = STATUS_LABELS[order.status] || order.status;
        const title = type === "food" ? "খাবার অর্ডার আপডেট" : "পার্সেল আপডেট";
        const payload = JSON.stringify({
          title,
          body: `${order.order_code}: ${label}`,
          tag: `order-${order.id}`,
          url: "/orders",
        });

        let sent = 0;
        const stale: string[] = [];
        await Promise.all(
          subs.map(async (s: any) => {
            try {
              await webpush.sendNotification(
                { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                payload,
              );
              sent += 1;
            } catch (e: any) {
              const status = e?.statusCode;
              if (status === 404 || status === 410) stale.push(s.endpoint);
            }
          }),
        );
        if (stale.length) {
          await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", stale);
        }
        return new Response(JSON.stringify({ ok: true, sent, removed: stale.length }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
