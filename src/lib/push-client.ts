import { VAPID_PUBLIC_KEY } from "./push-config";
import { savePushSubscription, removePushSubscription } from "./push.functions";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

function toBase64Url(buf: ArrayBuffer | null): string {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function registerPushSW(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  return await navigator.serviceWorker.register("/sw-push.js", { scope: "/" });
}

export async function getPushPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) return "denied";
  return Notification.permission;
}

export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return false;
  const reg = await registerPushSW();
  if (!reg) return false;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }
  const json = sub.toJSON();
  await savePushSubscription({
    data: {
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh ?? toBase64Url(sub.getKey("p256dh")),
      auth: json.keys?.auth ?? toBase64Url(sub.getKey("auth")),
      user_agent: navigator.userAgent,
    },
  });
  return true;
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    try { await removePushSubscription({ data: { endpoint: sub.endpoint } }); } catch {}
    await sub.unsubscribe();
  }
}
