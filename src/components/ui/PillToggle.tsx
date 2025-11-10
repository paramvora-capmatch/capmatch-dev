// src/components/ui/PillToggle.tsx
"use client";

import React from "react";
import { cn } from "@/utils/cn";

export type TriPermission = "none" | "view" | "edit";

interface PillToggleProps {
  value: TriPermission;
  onChange: (value: TriPermission) => void;
  size?: "xs" | "sm" | "md";
  className?: string;
}

const textSizeClasses: Record<NonNullable<PillToggleProps["size"]>, string> = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-sm",
};

export const PillToggle: React.FC<PillToggleProps> = ({
  value,
  onChange,
  size = "sm",
  className,
}) => {
  const makeBtn = (
    label: string,
    val: TriPermission,
    activeColor: "red" | "blue" | "green"
  ) => {
    const colorClasses = {
      red: {
        active: "bg-gradient-to-r from-white to-gray-50 text-red-600 shadow-md border-red-400",
        inactive:
          "text-gray-600 hover:text-gray-800 hover:bg-white/50 hover:scale-[1.02] hover:border-red-200/70 focus-visible:border-red-300",
      },
      blue: {
        active: "bg-gradient-to-r from-white to-gray-50 text-blue-600 shadow-md border-blue-400",
        inactive:
          "text-gray-600 hover:text-gray-800 hover:bg-white/50 hover:scale-[1.02] hover:border-blue-200/70 focus-visible:border-blue-300",
      },
      green: {
        active: "bg-gradient-to-r from-white to-gray-50 text-green-600 shadow-md border-green-400",
        inactive:
          "text-gray-600 hover:text-gray-800 hover:bg-white/50 hover:scale-[1.02] hover:border-green-200/70 focus-visible:border-green-300",
      },
    };

    const classes = colorClasses[activeColor];

    return (
      <button
        type="button"
        onClick={() => onChange(val)}
        className={cn(
          "flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md font-medium transition-all duration-300 border-2 border-transparent",
          textSizeClasses[size],
          value === val ? classes.active : classes.inactive
        )}
        aria-pressed={value === val}
      >
        <span>{label}</span>
      </button>
    );
  };

  return (
    <div className={cn("flex bg-gradient-to-r from-gray-100 to-gray-50 p-1 rounded-lg shadow-inner", className)}>
      {makeBtn("None", "none", "red")}
      {makeBtn("View", "view", "blue")}
      {makeBtn("Edit", "edit", "green")}
    </div>
  );
};

export default PillToggle;


