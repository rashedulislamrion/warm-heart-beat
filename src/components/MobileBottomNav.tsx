import { Link, useRouterState } from "@tanstack/react-router";
import { Home, UtensilsCrossed, Package, ScrollText, User } from "lucide-react";

const items: {
  to: "/" | "/food" | "/parcel" | "/orders" | "/profile";
  label: string;
  icon: typeof Home;
  highlight?: boolean;
}[] = [
  { to: "/", label: "হোম", icon: Home },
  { to: "/food", label: "খাবার", icon: UtensilsCrossed },
  { to: "/parcel", label: "পার্সেল", icon: Package, highlight: true },
  { to: "/orders", label: "অর্ডার", icon: ScrollText },
  { to: "/profile", label: "প্রোফাইল", icon: User },
];

export function MobileBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden">
      <div className="grid grid-cols-5">
        {items.map(({ to, label, icon: Icon, highlight }) => {
          const active = pathname === to || (to !== "/" && pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <span
                className={`grid h-9 w-9 place-items-center rounded-full transition-all ${
                  active
                    ? highlight
                      ? "gradient-accent text-accent-foreground shadow-warm"
                      : "gradient-primary text-primary-foreground shadow-soft"
                    : ""
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="font-bangla">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
