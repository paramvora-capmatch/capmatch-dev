// src/components/ui/ButtonSelect.tsx
import React from 'react';
import { cn } from '@/utils/cn';
import { Button } from './Button';

type ButtonOption = string | { label: string; value: string };

const normalizeOption = (option: ButtonOption) =>
  typeof option === "string"
    ? { label: option, value: option }
    : option;

interface ButtonSelectProps {
  label: string;
  options: ReadonlyArray<ButtonOption>;
  selectedValue: string | null | undefined;
  onSelect?: (value: string) => void; // *** Make onSelect optional ***
  required?: boolean;
  className?: string;
  buttonClassName?: string;
  gridCols?: string;
  disabled?: boolean;
  isAutofilled?: boolean; // Add autofill status prop
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
  isAutofilled = false,
}) => {
  // Handler that checks if onSelect exists before calling it
  const handleClick = (option: string) => {
    if (disabled) return;
    if (onSelect) {
      onSelect(option);
    } else {
      console.warn(`ButtonSelect: onSelect handler not provided for label "${label}"`);
    }
  };

  // Apply background color based on autofill status or locked (disabled) state
  const containerBgClass = isAutofilled || disabled
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
            key={option.value}
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