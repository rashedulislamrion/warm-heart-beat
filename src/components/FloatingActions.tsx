import { Phone, MessageCircle } from "lucide-react";

const HOTLINE = "01400065088";

export function FloatingActions() {
  return (
    <div className="fixed bottom-24 right-4 z-40 flex flex-col gap-3 md:bottom-6">
      <a
        href={`https://wa.me/88${HOTLINE}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp"
        className="grid h-12 w-12 place-items-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110"
      >
        <MessageCircle className="h-5 w-5" />
      </a>
      <a
        href={`tel:${HOTLINE}`}
        aria-label="Hotline"
        className="animate-pulse-ring grid h-14 w-14 place-items-center rounded-full gradient-accent text-accent-foreground shadow-warm transition-transform hover:scale-110"
      >
        <Phone className="h-6 w-6" />
      </a>
    </div>
  );
}
