import { Heart } from "lucide-react";

export function FavoriteHeart({
  active,
  onClick,
  className = "",
  size = 18,
}: {
  active: boolean;
  onClick: (e: React.MouseEvent) => void;
  className?: string;
  size?: number;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick(e);
      }}
      aria-label={active ? "প্রিয় থেকে সরান" : "প্রিয়তে যোগ করুন"}
      className={`grid place-items-center rounded-full bg-white/95 shadow-soft transition-transform hover:scale-110 active:scale-95 ${className}`}
      style={{ width: size + 14, height: size + 14 }}
    >
      <Heart
        className={active ? "fill-destructive text-destructive" : "text-foreground"}
        style={{ width: size, height: size }}
      />
    </button>
  );
}
