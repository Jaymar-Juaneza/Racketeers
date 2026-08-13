import { cn } from "../../lib/utils.js";

const variants = {
  default:
    "bg-primary text-white hover:bg-primary-dark focus-visible:ring-primary/40 shadow-sm",
  secondary:
    "bg-secondary text-white hover:bg-blue-700 focus-visible:ring-secondary/40 shadow-sm",
  outline:
    "border border-primary/40 bg-white text-primary hover:bg-light focus-visible:ring-primary/30",
  ghost: "bg-transparent text-primary hover:bg-light focus-visible:ring-primary/20",
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
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-colors",
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
