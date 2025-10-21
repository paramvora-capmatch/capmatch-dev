// components/filters/CapitalTypeFilter.tsx
'use client';

import React, { useState } from 'react';
import { ButtonSelect } from '../../components/ui/ButtonSelect';
import { Info } from 'lucide-react';

interface CapitalTypeFilterProps {
  value: string[];
  onChange: (newValue: string[]) => void;
}

const CapitalTypeFilter: React.FC<CapitalTypeFilterProps> = ({ value, onChange }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const capitalTypeOptions = [
    "Senior Debt", "Mezzanine", "Preferred Equity",
    "Common Equity", "JV Equity", "Other"
  ];

  return (
    <div className="mb-3">
      <div className="flex items-center mb-2">
        <h3 className="font-semibold text-sm">Capital Type</h3>
        <div className="relative ml-2">
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            aria-label="Capital Type Information"
          >
            <Info size={16} />
          </button>
          {showTooltip && (
            <div className="absolute z-10 w-64 p-2 mt-2 text-xs bg-white rounded-md shadow-lg border border-gray-200 -translate-x-1/2 left-1/2">
              Select the type of capital structure you&apos;re seeking. Different lenders specialize in different capital types.
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {capitalTypeOptions.map((option) => (
          <button
            key={option}
            type="button"
            className={`px-3 py-1.5 text-sm rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              value.includes(option)
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            onClick={() => {
              const newValue = value.includes(option)
                ? value.filter((v) => v !== option)
                : [...value, option];
              onChange(newValue);
            }}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CapitalTypeFilter;