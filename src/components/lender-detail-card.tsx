// components/lender-detail-card.tsx

'use client';

import { X, Check } from 'lucide-react';
import { Button } from "./ui/Button";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import type { LenderProfile } from "../types/lender";

interface LenderDetailCardProps {
  lender: LenderProfile;
  formData?: Record<string, unknown>;
  onClose: () => void;
  color: string;
  onContactLender?: () => void;
}

export default function LenderDetailCard({
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

  const criteriaMatches = (
    lenderCriteria: string[],
    formCriteria: string[],
    criteriaType: "assetTypes" | "dealTypes" | "capitalTypes" | "debtRange" | "locations"
  ) => {
    if (!formData || !formData[criteriaType] || formData[criteriaType].length === 0) {
      return null;
    }

    if (criteriaType === "locations" && lenderCriteria.includes("nationwide")) {
      return true;
    }

    const anyMatch = formCriteria.some((item) => lenderCriteria.includes(item));
    return anyMatch;
  };

  return (
    <Card className="w-80 shadow-md bg-white rounded-lg border border-gray-200">
      <CardHeader className="relative pb-0 border-b border-gray-100">
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-lg"
          style={{ backgroundColor: color }}
        ></div>
        <div className="flex justify-between items-center pt-3">
          <div className="flex-1">
            <h3 className="font-bold text-2xl text-gray-900">{matchPercentage}% Match</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 rounded-full hover:bg-gray-100">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mt-2 mb-3">
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
          <h4 className="font-semibold text-gray-800 text-base">Lending Criteria</h4>
          <div className="grid grid-cols-[120px_1fr] gap-y-3">
            <div className="text-gray-500">Asset Types:</div>
            <div className="text-gray-900">
              {criteriaMatches(lender.asset_types, formData?.asset_types || [], "assetTypes") === false ? (
                <Badge variant="outline" className="border-red-100 bg-red-50 text-red-500 font-medium">
                  <X className="h-3 w-3 mr-1" />
                  Mismatch
                </Badge>
              ) : criteriaMatches(lender.asset_types, formData?.asset_types || [], "assetTypes") === true ? (
                <Badge variant="outline" className="border-green-100 bg-green-50 text-green-600 font-medium">
                  <Check className="h-3 w-3 mr-1" />
                  Match
                </Badge>
              ) : (
                formatCriteria(lender.asset_types)
              )}
            </div>

            <div className="text-gray-500">Deal Types:</div>
            <div className="text-gray-900">
              {criteriaMatches(lender.deal_types, formData?.deal_types || [], "dealTypes") === false ? (
                <Badge variant="outline" className="border-red-100 bg-red-50 text-red-500 font-medium">
                  <X className="h-3 w-3 mr-1" />
                  Mismatch
                </Badge>
              ) : criteriaMatches(lender.deal_types, formData?.deal_types || [], "dealTypes") === true ? (
                <Badge variant="outline" className="border-green-100 bg-green-50 text-green-600 font-medium">
                  <Check className="h-3 w-3 mr-1" />
                  Match
                </Badge>
              ) : (
                formatCriteria(lender.deal_types)
              )}
            </div>

            <div className="text-gray-500">Capital Types:</div>
            <div className="text-gray-900">
              {criteriaMatches(lender.capital_types, formData?.capital_types || [], "capitalTypes") === false ? (
                <Badge variant="outline" className="border-red-100 bg-red-50 text-red-500 font-medium">
                  <X className="h-3 w-3 mr-1" />
                  Mismatch
                </Badge>
              ) : criteriaMatches(lender.capital_types, formData?.capital_types || [], "capitalTypes") === true ? (
                <Badge variant="outline" className="border-green-100 bg-green-50 text-green-600 font-medium">
                  <Check className="h-3 w-3 mr-1" />
                  Match
                </Badge>
              ) : (
                formatCriteria(lender.capital_types)
              )}
            </div>

            <div className="text-gray-500">Debt Range:</div>
            <div className="text-gray-900 font-medium">
              {criteriaMatches(lender.debt_ranges ?? [], formData?.debt_ranges || [], "debtRange") === false ? (
                <Badge variant="outline" className="border-red-100 bg-red-50 text-red-500 font-medium">
                  <X className="h-3 w-3 mr-1" />
                  Mismatch
                </Badge>
              ) : criteriaMatches(lender.debt_ranges ?? [], formData?.debt_ranges || [], "debtRange") === true ? (
                <Badge variant="outline" className="border-green-100 bg-green-50 text-green-600 font-medium">
                  <Check className="h-3 w-3 mr-1" />
                  Match
                </Badge>
              ) : (
                lender.debt_ranges?.map((range) => formatDebtRange(range)).join(", ")
              )}
            </div>

            <div className="text-gray-500">Loan Amount:</div>
            <div className="text-gray-900 font-medium">
              {formatCurrency(lender.min_deal_size)} - {formatCurrency(lender.max_deal_size)}
            </div>

            <div className="text-gray-500">Locations:</div>
            <div className="text-gray-900">
              {criteriaMatches(lender.locations, formData?.locations || [], "locations") === false ? (
                <Badge variant="outline" className="border-red-100 bg-red-50 text-red-500 font-medium">
                  <X className="h-3 w-3 mr-1" />
                  Mismatch
                </Badge>
              ) : criteriaMatches(lender.locations, formData?.locations || [], "locations") === true ? (
                <Badge variant="outline" className="border-green-100 bg-green-50 text-green-600 font-medium">
                  <Check className="h-3 w-3 mr-1" />
                  Match
                </Badge>
              ) : (
                formatCriteria(lender.locations)
              )}
            </div>
          </div>
        </div>
      </CardContent>
      {/* CardFooter with contact button removed */}
    </Card>
  );
}