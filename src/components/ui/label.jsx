import { cn } from "../../lib/utils.js";

export function Label({ className, ...props }) {
  return (
    <label
      className={cn(
        "text-sm font-semibold leading-none text-slate-700 peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...props}
    />
  );
}
