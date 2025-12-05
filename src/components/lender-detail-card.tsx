// components/lender-detail-card.tsx

'use client';

import { X } from 'lucide-react';
import { Button } from "./ui/Button";
import { Card, CardContent, CardHeader } from "./ui/card";
import type { LenderProfile } from "../types/lender";
import { LenderFilters } from "@/stores/useLenderStore";
import { cn } from "@/utils/cn";
import { memo, useMemo } from "react";

interface LenderDetailCardProps {
  lender: LenderProfile;
  formData?: Partial<LenderFilters>;
  onClose: () => void;
  color: string;
  onContactLender?: () => void;
}

function LenderDetailCard({
  lender,
  formData,
  onClose,
  color,
}: LenderDetailCardProps) {
  // Keep existing functionality
  const matchScore = lender.match_score || 0;
  const matchPercentage = Math.round(matchScore * 100);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  };

  const formatCriteria = (criteria: string[]) => {
    return criteria.map(item => item.replace(/_/g, ' ')).join(", ");
  };

  const formatDebtRange = (range: string) => {
    return range.replace(/_/g, ' ');
  };

  // Memoize formatted values to prevent recalculation
  const formattedAssetTypes = useMemo(() => formatCriteria(lender.asset_types), [lender.asset_types]);
  const formattedDealTypes = useMemo(() => formatCriteria(lender.deal_types), [lender.deal_types]);
  const formattedCapitalTypes = useMemo(() => formatCriteria(lender.capital_types), [lender.capital_types]);
  const formattedDebtRanges = useMemo(() => lender.debt_ranges?.map((range) => formatDebtRange(range)).join(", "), [lender.debt_ranges]);
  const formattedLoanAmount = useMemo(() => `${formatCurrency(lender.min_deal_size)} - ${formatCurrency(lender.max_deal_size)}`, [lender.min_deal_size, lender.max_deal_size]);
  const formattedLocations = useMemo(() => formatCriteria(lender.locations), [lender.locations]);

  // Removed criteriaMatches - just show the criteria without match/mismatch badges

  return (
    <Card className="w-80 shadow-xl rounded-lg transition-colors duration-300 bg-white border-gray-200">
      <CardHeader className="relative pb-0 border-b transition-colors duration-300 border-gray-200">
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-lg"
          style={{ backgroundColor: color }}
        ></div>
        <div className="flex justify-between items-center pt-3">
          <div className="flex-1">
            <h3 className="font-bold text-2xl text-gray-900">{matchPercentage}% Match</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden mt-2 mb-3 bg-gray-200">
          <div
            className="h-full rounded-full"
            style={{
              width: `${matchPercentage}%`,
              backgroundColor: color,
            }}
          ></div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm py-4">
        <div className="space-y-3">
          <h4 className="font-semibold text-base text-gray-800">Lending Criteria</h4>
          <div className="grid grid-cols-[120px_1fr] gap-y-3">
            <div className="text-gray-600">Asset Types:</div>
            <div className="text-gray-900">
              {formattedAssetTypes}
            </div>

            <div className="text-gray-600">Deal Types:</div>
            <div className="text-gray-900">
              {formattedDealTypes}
            </div>

            <div className="text-gray-600">Capital Types:</div>
            <div className="text-gray-900">
              {formattedCapitalTypes}
            </div>

            <div className="text-gray-600">Debt Range:</div>
            <div className="font-medium text-gray-900">
              {formattedDebtRanges}
            </div>

            <div className="text-gray-600">Loan Amount:</div>
            <div className="font-medium text-gray-900">
              {formattedLoanAmount}
            </div>

            <div className="text-gray-600">Locations:</div>
            <div className="text-gray-900">
              {formattedLocations}
            </div>
          </div>
        </div>
      </CardContent>
      {/* CardFooter with contact button removed */}
    </Card>
  );
}

// Memoize the component to prevent unnecessary re-renders when props haven't changed
export default memo(LenderDetailCard, (prevProps, nextProps) => {
  // Return true if props are equal (skip re-render), false if different (re-render)
  // Check if lender object reference changed or key properties changed
  if (prevProps.lender !== nextProps.lender) {
    // Deep comparison of lender properties that affect rendering
    if (
      prevProps.lender.lender_id !== nextProps.lender.lender_id ||
      prevProps.lender.match_score !== nextProps.lender.match_score ||
      JSON.stringify(prevProps.lender.asset_types) !== JSON.stringify(nextProps.lender.asset_types) ||
      JSON.stringify(prevProps.lender.deal_types) !== JSON.stringify(nextProps.lender.deal_types) ||
      JSON.stringify(prevProps.lender.capital_types) !== JSON.stringify(nextProps.lender.capital_types) ||
      JSON.stringify(prevProps.lender.debt_ranges) !== JSON.stringify(nextProps.lender.debt_ranges) ||
      prevProps.lender.min_deal_size !== nextProps.lender.min_deal_size ||
      prevProps.lender.max_deal_size !== nextProps.lender.max_deal_size ||
      JSON.stringify(prevProps.lender.locations) !== JSON.stringify(nextProps.lender.locations)
    ) {
      return false; // Props changed, re-render
    }
  }
  
  // Check other props
  if (
    prevProps.color !== nextProps.color ||
    JSON.stringify(prevProps.formData) !== JSON.stringify(nextProps.formData)
  ) {
    return false; // Props changed, re-render
  }
  
  return true; // Props are equal, skip re-render
});