// src/components/ui/MultiSelectPills.tsx
import React from 'react';
import { cn } from '@/utils/cn';
import { Button } from './Button';

interface MultiSelectPillsProps {
  label?: string;
  options: ReadonlyArray<string>;
  selectedValues: string[];
  onSelect: (values: string[]) => void;
  required?: boolean;
  className?: string;
  buttonClassName?: string;
  gridCols?: string;
  disabled?: boolean;
  isAutofilled?: boolean; // Deprecated: use isLocked instead
  isLocked?: boolean; // Use lock status for color coding (green = locked, blue = unlocked)
  hasAutofillBeenRun?: boolean; // Whether autofill has ever been run (affects styling)
}

export const MultiSelectPills: React.FC<MultiSelectPillsProps> = ({
  label,
  options,
  selectedValues,
  onSelect,
  required = false,
  className,
  buttonClassName = "text-xs md:text-sm",
  gridCols = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
  disabled = false,
  isAutofilled = false, // Deprecated
  isLocked,
  hasAutofillBeenRun = true,
}) => {
  const handleClick = (option: string) => {
    if (disabled) return;
    const isSelected = selectedValues.includes(option);
    if (isSelected) {
      // Remove from selection
      onSelect(selectedValues.filter(v => v !== option));
    } else {
      // Add to selection
      onSelect([...selectedValues, option]);
    }
  };

  // Apply background color based on lock status (green = locked, blue = unlocked)
  // Only show colors once at least one value is selected; otherwise keep white.
  // Fall back to isAutofilled for backward compatibility.
  const isLockedState = isLocked !== undefined ? isLocked : (isAutofilled || disabled);
  const hasSelection = Array.isArray(selectedValues) && selectedValues.length > 0;

  const containerBgClass = !hasSelection
    ? "" // Initial empty state: white background, no accent border
    : isLockedState
    ? "bg-emerald-50 p-3 rounded-lg border border-emerald-200"
    : "bg-blue-50 p-3 rounded-lg border border-blue-200";

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className={cn(`grid ${gridCols} gap-2`, containerBgClass)}>
        {options.map((option) => {
          const isSelected = selectedValues.includes(option);
          return (
            <Button
              key={option}
              type="button"
              variant={isSelected ? 'primary' : 'outline'}
              onClick={() => handleClick(option)}
              disabled={disabled}
              className={cn(
                "justify-center w-full px-2 py-1.5 md:px-3 md:py-2 focus:ring-2 focus:ring-offset-1 focus:ring-blue-500",
                isSelected
                  ? 'ring-2 ring-blue-500 ring-offset-1 shadow-md'
                  : 'text-gray-700 hover:bg-gray-50',
                buttonClassName
              )}
            >
              {option}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

