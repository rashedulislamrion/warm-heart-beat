export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className="grid h-9 w-9 place-items-center rounded-2xl gradient-primary text-lg shadow-soft">
        🕊️
      </span>
      <span className="font-bangla text-xl font-extrabold tracking-tight text-foreground">
        পায়রা
      </span>
    </div>
  );
}
