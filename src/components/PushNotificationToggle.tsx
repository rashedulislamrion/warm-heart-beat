import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
  registerPushSW,
} from "@/lib/push-client";

export function PushNotificationToggle() {
  const [supported, setSupported] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return;
    setSupported(true);
    setPerm(Notification.permission);
    (async () => {
      try {
        const reg = await registerPushSW();
        const sub = await reg?.pushManager.getSubscription();
        setSubscribed(!!sub);
      } catch {}
    })();
  }, []);

  if (!supported) return null;

  const onEnable = async () => {
    setBusy(true);
    try {
      const ok = await subscribeToPush();
      if (ok) {
        setSubscribed(true);
        setPerm("granted");
        toast.success("নোটিফিকেশন চালু হয়েছে");
      } else {
        toast.error("অনুমতি দেওয়া হয়নি");
      }
    } catch (e: any) {
      toast.error(e?.message || "চালু করা যায়নি");
    } finally {
      setBusy(false);
    }
  };

  const onDisable = async () => {
    setBusy(true);
    try {
      await unsubscribeFromPush();
      setSubscribed(false);
      toast.success("নোটিফিকেশন বন্ধ হয়েছে");
    } finally {
      setBusy(false);
    }
  };

  if (perm === "denied") {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <BellOff className="h-4 w-4" /> ব্রাউজার সেটিংস থেকে নোটিফিকেশন অনুমতি দিন
      </div>
    );
  }

  return subscribed ? (
    <Button size="sm" variant="outline" onClick={onDisable} disabled={busy} className="gap-2">
      <BellRing className="h-4 w-4" /> নোটিফিকেশন বন্ধ করুন
    </Button>
  ) : (
    <Button size="sm" onClick={onEnable} disabled={busy} className="gap-2">
      <Bell className="h-4 w-4" /> স্ট্যাটাস আপডেট পান
    </Button>
  );
}
