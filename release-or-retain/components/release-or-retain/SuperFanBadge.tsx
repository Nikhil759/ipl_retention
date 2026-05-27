interface SuperFanBadgeProps {
  className?: string;
}

export default function SuperFanBadge({ className = "" }: SuperFanBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide border border-amber-500/40 bg-amber-500/15 text-amber-300 ${className}`}
    >
      ★ Super fan
    </span>
  );
}
