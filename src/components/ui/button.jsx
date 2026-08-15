import { cn } from "../../lib/utils.js";

const variants = {
  default:
    "bg-primary text-white hover:bg-primary-dark hover:-translate-y-0.5 focus-visible:ring-primary/40 shadow-glow",
  secondary:
    "rounded-full border border-secondary/70 bg-white text-secondary-dark hover:border-secondary hover:bg-secondary hover:text-white focus-visible:ring-secondary/40",
  outline:
    "border border-line bg-white text-ink hover:border-primary/30 hover:bg-mist hover:text-primary focus-visible:ring-primary/30",
  ghost: "bg-transparent text-primary hover:bg-mist focus-visible:ring-primary/20",
  danger:
    "bg-accent text-white hover:bg-red-700 focus-visible:ring-accent/40 shadow-sm",
  destructiveOutline:
    "border border-accent/40 bg-white text-accent hover:bg-red-50 focus-visible:ring-accent/30",
};

const sizes = {
  default: "h-10 px-4 py-2 text-sm",
  sm: "h-8 px-3 text-xs",
  lg: "h-12 px-6 text-base",
  icon: "h-10 w-10",
};

export function Button({
  className,
  variant = "default",
  size = "default",
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        "cursor-pointer select-none active:scale-[0.99]",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
