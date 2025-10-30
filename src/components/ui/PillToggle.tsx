// src/components/ui/PillToggle.tsx
"use client";

import React from "react";

export type TriPermission = "none" | "view" | "edit";

interface PillToggleProps {
  value: TriPermission;
  onChange: (value: TriPermission) => void;
  size?: "xs" | "sm" | "md";
  className?: string;
}

const sizeClasses: Record<NonNullable<PillToggleProps["size"]>, string> = {
  xs: "text-xs px-2 py-1",
  sm: "text-sm px-3 py-1.5",
  md: "text-sm px-3 py-2",
};

export const PillToggle: React.FC<PillToggleProps> = ({
  value,
  onChange,
  size = "sm",
  className,
}) => {
  const base =
    "rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1";

  const makeBtn = (
    label: string,
    val: TriPermission,
    activeClasses: string,
    inactiveClasses: string
  ) => (
    <button
      type="button"
      onClick={() => onChange(val)}
      className={`${sizeClasses[size]} ${base} ${
        value === val ? activeClasses : inactiveClasses
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className={`inline-flex items-center gap-2 ${className || ""}`}>
      {makeBtn(
        "None",
        "none",
        "bg-red-600 text-white border-red-600",
        "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
      )}
      {makeBtn(
        "View",
        "view",
        "bg-blue-600 text-white border-blue-600",
        "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
      )}
      {makeBtn(
        "Edit",
        "edit",
        "bg-green-600 text-white border-green-600",
        "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
      )}
    </div>
  );
};

export default PillToggle;


