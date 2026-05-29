"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import clsx from "clsx";
import { Loader2 } from "lucide-react";

type Variant = "ghost" | "danger" | "success" | "amber";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "xs" | "sm";
  loading?: boolean;
  label: string;
}

const variants: Record<Variant, string> = {
  ghost: "text-gray-600 hover:text-gray-300 hover:bg-white/8",
  danger: "text-gray-600 hover:text-red-400",
  success: "text-emerald-400 hover:bg-white/8",
  amber: "text-amber-500 hover:text-amber-400",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ variant = "ghost", size = "sm", loading, label, children, className, disabled, ...props }, ref) => (
    <button
      ref={ref}
      title={label}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
        size === "xs" ? "p-0.5" : "p-1",
        variants[variant],
        className
      )}
      {...props}
    >
      {loading ? <Loader2 size={11} className="animate-spin" /> : children}
    </button>
  )
);
IconButton.displayName = "IconButton";
