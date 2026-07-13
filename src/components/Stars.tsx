import { Star } from "lucide-react";
import { useState } from "react";

export function StarDisplay({
  value,
  size = 14,
  className = "",
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = value >= n - 0.25;
        const half = !filled && value >= n - 0.75;
        return (
          <Star
            key={n}
            style={{ width: size, height: size }}
            className={
              filled
                ? "fill-accent text-accent"
                : half
                  ? "fill-accent/50 text-accent"
                  : "text-muted-foreground/40"
            }
          />
        );
      })}
    </span>
  );
}

export function StarInput({
  value,
  onChange,
  size = 32,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="inline-flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          className="transition-transform hover:scale-110"
          aria-label={`${n} star`}
        >
          <Star
            style={{ width: size, height: size }}
            className={
              shown >= n
                ? "fill-accent text-accent"
                : "text-muted-foreground/40"
            }
          />
        </button>
      ))}
    </div>
  );
}
