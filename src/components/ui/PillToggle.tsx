// src/components/ui/PillToggle.tsx
"use client";

import React from "react";
import { cn } from "@/utils/cn";

/** UI display level for project/resource permissions. Includes absence ("none") and mixed state ("custom"). */
export type PermissionLevel = "none" | "view" | "edit" | "custom";

/** @deprecated Use PermissionLevel instead */
export type TriPermission = PermissionLevel;

interface PillToggleProps {
  value: PermissionLevel;
  onChange: (value: PermissionLevel) => void;
  size?: "xs" | "sm" | "md";
  className?: string;
  /** When false, only None/View/Edit are shown (backward compatible). Default true. */
  showCustom?: boolean;
}

const textSizeClasses: Record<NonNullable<PillToggleProps["size"]>, string> = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-sm",
};

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
  purple: {
    active: "bg-gradient-to-r from-white to-gray-50 text-indigo-600 shadow-md border-indigo-400",
    inactive:
      "text-gray-600 hover:text-gray-800 hover:bg-white/50 hover:scale-[1.02] hover:border-indigo-200/70 focus-visible:border-indigo-300",
  },
} as const;

type ColorKey = keyof typeof colorClasses;

export const PillToggle: React.FC<PillToggleProps> = ({
  value,
  onChange,
  size = "sm",
  className,
  showCustom = true,
}) => {
  const makeBtn = (
    label: string,
    val: PermissionLevel,
    activeColor: ColorKey
  ) => {
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
      {showCustom && makeBtn("Custom", "custom", "purple")}
    </div>
  );
};

/**
 * Compute the project-level permission display from per-resource permissions.
 * Returns "custom" when permissions are mixed across resource types or if
 * explicit file-level overrides/exclusions exist.
 */
export function computeProjectLevel(
  permissions: Array<{ resource_type: string; permission: "view" | "edit" } | undefined>,
  resourceTypes: readonly string[],
  hasOverrides?: boolean
): PermissionLevel {
  if (hasOverrides) return "custom";
  const perms = resourceTypes.map(
    (rt) => permissions.find((p) => p?.resource_type === rt)?.permission ?? null
  );
  if (perms.every((p) => p === "edit")) return "edit";
  if (perms.every((p) => p === "view")) return "view";
  if (perms.every((p) => p === null)) return "none";
  return "custom";
}

export default PillToggle;
