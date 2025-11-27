// components/filters/AssetTypeFilter.tsx
"use client";

import React, { useState, memo, useCallback } from "react";
import { Info } from "lucide-react";
import { cn } from "@/utils/cn";

interface AssetTypeFilterProps {
  value: string[];
  onChange: (newValue: string[]) => void;
}

const AssetTypeFilter: React.FC<AssetTypeFilterProps> = memo(({
  value,
  onChange,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const assetTypeOptions = [
    "Multifamily",
    "Office",
    "Retail",
    "Industrial",
    "Hospitality",
    "Land",
    "Mixed-Use",
    "Self-Storage",
    "Data Center",
    "Medical Office",
    "Senior Housing",
    "Student Housing",
    "Other",
  ];

  const handleToggle = useCallback((option: string) => {
    const newValue = value.includes(option)
      ? value.filter((v) => v !== option)
      : [...value, option];
    onChange(newValue);
  }, [value, onChange]);

  const handleMouseEnter = useCallback(() => {
    setShowTooltip(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setShowTooltip(false);
  }, []);

  return (
    <div className="mb-3">
      <div className="flex items-center mb-2">
        <h3 className="font-semibold text-sm text-gray-800">Asset Type</h3>
        <div className="relative ml-2">
          <button
            type="button"
            className="focus:outline-none text-gray-400 hover:text-gray-600"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            aria-label="Asset Type Information"
          >
            <Info size={16} />
          </button>
          {showTooltip && (
            <div className="absolute z-10 w-64 p-2 mt-2 text-xs rounded-md shadow-lg -translate-x-1/2 left-1/2 bg-white text-gray-800 border border-gray-200">
              Select the property type(s) for your project. Matching lenders
              will be filtered based on your selection.
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {assetTypeOptions.map((option) => (
          <button
            key={option}
            type="button"
            className={cn(
              "px-3 py-1.5 text-sm rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-white",
              value.includes(option)
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            )}
            onClick={() => handleToggle(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
});

AssetTypeFilter.displayName = 'AssetTypeFilter';

export default AssetTypeFilter;
