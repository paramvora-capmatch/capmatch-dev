// src/components/ui/ButtonSelect.tsx
import React from 'react';
import { cn } from '@/utils/cn';
import { Button } from './Button';

export type ButtonOptionValue = string | number | boolean;
export type ButtonOption = string | { label: string; value: ButtonOptionValue };

const normalizeOption = (option: ButtonOption): { label: string; value: ButtonOptionValue } =>
  typeof option === "string"
    ? { label: option, value: option }
    : option;

interface ButtonSelectProps {
  label: string;
  options: ReadonlyArray<ButtonOption>;
  selectedValue: ButtonOptionValue | null | undefined;
  onSelect?: (value: any) => void; // Relaxed to allow boolean/number/string
  required?: boolean;
  className?: string;
  buttonClassName?: string;
  gridCols?: string;
  disabled?: boolean;
  isAutofilled?: boolean; // Deprecated: use isLocked instead
  isLocked?: boolean; // Use lock status for color coding (green = locked, blue = unlocked)
  hasAutofillBeenRun?: boolean; // Deprecated: colors are now driven purely by lock + value
  /**
   * Marks the field as "touched" even when there is no selected value.
   * Used when AI/user has interacted (e.g. sources set) but no choice picked yet.
   */
  isTouched?: boolean;
}

export const ButtonSelect: React.FC<ButtonSelectProps> = ({
  label,
  options,
  selectedValue,
  onSelect, // Optional now
  required = false,
  className,
  buttonClassName = "text-xs md:text-sm",
  gridCols = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
  disabled = false,
  isAutofilled = false, // Deprecated
  isLocked,
  hasAutofillBeenRun = true,
  isTouched = false,
}) => {
  // Handler that checks if onSelect exists before calling it
  const handleClick = (option: ButtonOptionValue) => {
    if (disabled) return;
    if (onSelect) {
      onSelect(option);
    } else {
      console.warn(`ButtonSelect: onSelect handler not provided for label "${label}"`);
    }
  };

  // Apply background color based on lock status (green = locked, blue = unlocked)
  // Only show colors once a value has been selected; otherwise keep white.
  // Fall back to isAutofilled for backward compatibility.
  const isLockedState = isLocked !== undefined ? isLocked : (isAutofilled || disabled);
  const hasSelection =
    selectedValue !== null &&
    selectedValue !== undefined &&
    selectedValue !== "";

  // Field is considered "active" (needs color) if it either has a selection
  // or has been "touched" (e.g. AI/user set sources but left value empty).
  const hasSignal = hasSelection || isTouched;

  const containerBgClass = !hasSignal
    ? "" // Initial untouched state: white background, no accent border
    : isLockedState
    ? "bg-emerald-50 p-3 rounded-lg border border-emerald-200"
    : "bg-blue-50 p-3 rounded-lg border border-blue-200";

  return (
    <div className={cn("w-full", className)}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className={cn(`grid ${gridCols} gap-2`, containerBgClass)}>
        {options.map((rawOption) => {
          const option = normalizeOption(rawOption);
          const isSelected = selectedValue === option.value;

          return (
          <Button
            key={String(option.value)}
            type="button"
            variant={isSelected ? 'primary' : 'outline'}
            // Use the safe handler
            onClick={() => handleClick(option.value)}
            disabled={disabled}
            className={cn(
              "justify-center w-full px-2 py-1.5 md:px-3 md:py-2 focus:ring-2 focus:ring-offset-1 focus:ring-blue-500",
               isSelected
                ? 'ring-2 ring-blue-500 ring-offset-1 shadow-md'
                : 'text-gray-700 hover:bg-gray-50',
               buttonClassName
            )}
          >
            {option.label}
          </Button>
          );
        })}
      </div>
    </div>
  );
};