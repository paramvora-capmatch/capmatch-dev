// src/components/ui/ButtonSelect.tsx
import React from 'react';
import { cn } from '@/utils/cn';
import { Button } from './Button';

interface ButtonSelectProps {
  label: string;
  options: ReadonlyArray<string>;
  selectedValue: string | null | undefined;
  onSelect?: (value: string) => void; // *** Make onSelect optional ***
  required?: boolean;
  className?: string;
  buttonClassName?: string;
  gridCols?: string;
  disabled?: boolean;
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

  return (
    <div className={cn("w-full", className)}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className={`grid ${gridCols} gap-2`}>
        {options.map((option) => (
          <Button
            key={option}
            type="button"
            variant={selectedValue === option ? 'primary' : 'outline'}
            // Use the safe handler
            onClick={() => handleClick(option)}
            disabled={disabled}
            className={cn(
              "justify-center w-full px-2 py-1.5 md:px-3 md:py-2 focus:ring-2 focus:ring-offset-1 focus:ring-blue-500",
               selectedValue === option
                ? 'ring-2 ring-blue-500 ring-offset-1 shadow-md'
                : 'text-gray-700 hover:bg-gray-50',
               buttonClassName
            )}
          >
            {option}
          </Button>
        ))}
      </div>
    </div>
  );
};