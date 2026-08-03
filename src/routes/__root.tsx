import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { OrderStatusListener } from "@/components/OrderStatusListener";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center gradient-hero px-4">
      <div className="max-w-md text-center">
        <div className="text-7xl">🕊️</div>
        <h1 className="mt-4 text-5xl font-bold">404</h1>
        <p className="mt-2 text-muted-foreground">এই পাতাটি পাওয়া যায়নি</p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-full gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft"
        >
          হোমে ফিরে যান
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">কিছু একটা ভুল হয়েছে</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          পাতাটি লোড হয়নি। আবার চেষ্টা করুন।
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
          >
            আবার চেষ্টা করুন
          </button>
          <a href="/" className="rounded-full border px-5 py-2 text-sm">হোম</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0F766E" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "DearDash" },
      { name: "application-name", content: "DearDash" },
      { title: "DearDash — CU'র নিজস্ব ডেলিভারি প্ল্যাটফর্ম" },
      { name: "description", content: "চট্টগ্রাম বিশ্ববিদ্যালয়ের খাবার ও পার্সেল ডেলিভারি। ছাত্রদের দ্বারা, ছাত্রদের জন্য।" },
      { property: "og:title", content: "DearDash — CU'র নিজস্ব ডেলিভারি প্ল্যাটফর্ম" },
      { property: "og:description", content: "চট্টগ্রাম বিশ্ববিদ্যালয়ের খাবার ও পার্সেল ডেলিভারি। ছাত্রদের দ্বারা, ছাত্রদের জন্য।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "DearDash — CU'র নিজস্ব ডেলিভারি প্ল্যাটফর্ম" },
      { name: "twitter:description", content: "চট্টগ্রাম বিশ্ববিদ্যালয়ের খাবার ও পার্সেল ডেলিভারি। ছাত্রদের দ্বারা, ছাত্রদের জন্য।" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/59454c58-e9db-4da8-bc7d-d7138775e0f3/id-preview-2ad0f24f--8e9d0152-91b7-4855-904d-063f3c426f1f.lovable.app-1783963625687.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/59454c58-e9db-4da8-bc7d-d7138775e0f3/id-preview-2ad0f24f--8e9d0152-91b7-4855-904d-063f3c426f1f.lovable.app-1783963625687.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/favicon-32.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+Bengali:wght@400;500;600;700;800&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="bn">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient, router]);

  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <QueryClientProvider client={queryClient}>
      <div key={pathname} className="animate-page-in">
        <Outlet />
      </div>
      <OrderStatusListener />
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}
