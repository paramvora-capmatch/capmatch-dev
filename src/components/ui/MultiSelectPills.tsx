// src/components/ui/MultiSelectPills.tsx
import React from 'react';
import { cn } from '@/utils/cn';
import { Button } from './Button';

interface MultiSelectPillsProps {
  label: string;
  options: ReadonlyArray<string>;
  selectedValues: string[];
  onSelect: (values: string[]) => void;
  required?: boolean;
  className?: string;
  buttonClassName?: string;
  gridCols?: string;
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
}) => {
  const handleClick = (option: string) => {
    const isSelected = selectedValues.includes(option);
    if (isSelected) {
      // Remove from selection
      onSelect(selectedValues.filter(v => v !== option));
    } else {
      // Add to selection
      onSelect([...selectedValues, option]);
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className={`grid ${gridCols} gap-2`}>
        {options.map((option) => {
          const isSelected = selectedValues.includes(option);
          return (
            <Button
              key={option}
              type="button"
              variant={isSelected ? 'primary' : 'outline'}
              onClick={() => handleClick(option)}
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

