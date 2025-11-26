// components/filters/LocationFilter.tsx
"use client";

import React, { useState, memo, useCallback } from "react";
import { Info } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/utils/cn";

interface LocationFilterProps {
  value: string[];
  onChange: (newValue: string[]) => void;
}

const LocationFilter: React.FC<LocationFilterProps> = memo(({ value, onChange }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [showTooltip, setShowTooltip] = useState(false);

  const locationOptions = [
    "nationwide",
    "Northeast",
    "Southeast",
    "Midwest",
    "Southwest",
    "West Coast",
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
        <h3 className={cn("font-semibold text-sm", isDark ? "text-gray-200" : "text-gray-800")}>Locations</h3>
        <div className="relative ml-2">
          <button
            type="button"
            className={cn("focus:outline-none", isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600")}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            aria-label="Location Information"
          >
            <Info size={16} />
          </button>
          {showTooltip && (
            <div className={cn(
              "absolute z-10 w-64 p-2 mt-2 text-xs rounded-md shadow-lg -translate-x-1/2 left-1/2",
              isDark ? "bg-gray-800 text-gray-200 border border-gray-700" : "bg-white text-gray-800 border border-gray-200"
            )}>
              Select the geographic region(s) of your project. Many lenders
              focus on specific regions.
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {locationOptions.map((option) => (
          <button
            key={option}
            type="button"
            className={cn(
              "px-3 py-1.5 text-sm rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
              isDark ? "focus:ring-offset-gray-800" : "focus:ring-offset-white",
              value.includes(option)
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : isDark 
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
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

LocationFilter.displayName = 'LocationFilter';

export default LocationFilter;
