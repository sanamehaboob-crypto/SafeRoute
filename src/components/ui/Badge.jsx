import React from "react";
import { cn } from "../../utils/cn";

export const Badge = ({ className, variant = "default", children, ...props }) => {
  const variants = {
    default: "bg-slate-100 text-slate-800",
    safe: "bg-green-100 text-green-800",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-800",
    primary: "bg-indigo-100 text-indigo-800",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
