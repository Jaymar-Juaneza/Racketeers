import { cn } from "../../lib/utils.js";

const variants = {
  default: "bg-mist text-primary border-line",
  blue: "bg-primary text-white border-primary",
  red: "bg-red-100 text-accent border-red-200",
  green: "bg-emerald-100 text-emerald-700 border-emerald-200",
  amber: "bg-amber-100 text-amber-700 border-amber-200",
  slate: "bg-mist text-muted border-line",
};

export function Badge({ className, variant = "default", ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
