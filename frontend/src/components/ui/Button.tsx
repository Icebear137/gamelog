"use client";

import * as Slot from "@radix-ui/react-slot";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import clsx from "clsx";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "ghost" | "danger" | "outline" | "success";
type Size = "xs" | "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variants: Record<Variant, string> = {
  primary: "bg-violet-600 hover:bg-violet-500 text-white",
  success: "bg-emerald-600 hover:bg-emerald-500 text-white",
  ghost: "text-gray-500 hover:text-gray-300 hover:bg-white/8",
  danger: "text-red-400 hover:text-red-300 hover:bg-red-500/10",
  outline: "border border-white/10 bg-white/5 text-gray-300 hover:bg-white/8",
};

const sizes: Record<Size, string> = {
  xs: "px-2 py-1 text-[11px] rounded-lg gap-1",
  sm: "px-2.5 py-1.5 text-xs rounded-xl gap-1.5",
  md: "px-3 py-2 text-sm rounded-xl gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "ghost", size = "sm", asChild, loading, icon, children, className, disabled, ...props }, ref) => {
    const Comp = asChild ? (Slot.Slot as any) : "button";
    return (
      <Comp
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          "inline-flex items-center justify-center font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed outline-none shrink-0",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : icon}
        {children}
      </Comp>
    );
  }
);
Button.displayName = "Button";
