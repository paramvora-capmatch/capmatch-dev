// components/filter-section.tsx
'use client';

import React, { memo, useCallback } from 'react';
import AssetTypeFilter from './filters/AssetTypeFilter';
import DealTypeFilter from './filters/DealTypeFilter';
import CapitalTypeFilter from './filters/CapitalTypeFilter';
import DebtRangeFilter from './filters/DebtRangeFilter';
import LocationFilter from './filters/LocationFilter';
import { LenderFilters } from '../contexts/LenderContext';

interface FilterSectionProps {
  formData: LenderFilters;
  onChange: (newData: Partial<LenderFilters>) => void;
  filterType: keyof LenderFilters;
}

const FilterSection: React.FC<FilterSectionProps> = memo(({
  formData,
  onChange,
  filterType
}) => {
  const handleIndividualFilterChange = useCallback((value: string[]) => {
    onChange({ [filterType]: value });
  }, [onChange, filterType]);

  const renderFilterComponent = () => {
    switch (filterType) {
      case 'asset_types':
        return (
          <AssetTypeFilter
            value={formData.asset_types || []}
            onChange={handleIndividualFilterChange} // Pass the wrapped handler
          />
        );
      case 'deal_types':
        return (
          <DealTypeFilter
            value={formData.deal_types || []}
            onChange={handleIndividualFilterChange}
          />
        );
      case 'capital_types':
        return (
          <CapitalTypeFilter
            value={formData.capital_types || []}
            onChange={handleIndividualFilterChange}
          />
        );
      case 'debt_ranges':
        return (
          <DebtRangeFilter
            value={formData.debt_ranges || []}
            onChange={handleIndividualFilterChange}
          />
        );
      case 'locations':
        return (
          <LocationFilter
            value={formData.locations || []}
            onChange={handleIndividualFilterChange}
          />
        );
      default:
        // This case should ideally not be reached if filterType is correctly typed
        console.warn(`FilterSection: Unknown filterType "${filterType}"`);
        return null;
    }
  };

  return (
    <>
      {renderFilterComponent()}
    </>
  );
});

FilterSection.displayName = 'FilterSection';

export default FilterSection;