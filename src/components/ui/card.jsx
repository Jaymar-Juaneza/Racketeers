import { cn } from "../../lib/utils.js";

export function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return (
    <div
      className={cn("flex flex-col gap-1.5 border-b border-slate-100 p-5", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }) {
  return (
    <h3
      className={cn("text-lg font-bold tracking-tight text-slate-900", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }) {
  return <p className={cn("text-sm text-slate-500", className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn("p-5", className)} {...props} />;
}

export function CardFooter({ className, ...props }) {
  return (
    <div
      className={cn("flex items-center gap-2 border-t border-slate-100 p-5", className)}
      {...props}
    />
  );
}
