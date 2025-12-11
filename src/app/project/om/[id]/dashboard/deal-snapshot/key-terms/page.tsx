"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Percent, Clock, Shield, FileText, Sparkles } from "lucide-react";
import { useOMPageHeader } from "@/hooks/useOMPageHeader";
import { useOmContent } from "@/hooks/useOmContent";
import { getOMValue, parseNumeric, formatFixed } from "@/lib/om-utils";

// Component to show missing values in red
const MissingValue = ({ children }: { children: React.ReactNode }) => (
  <span className="text-red-600 font-medium">{children}</span>
);

export default function KeyTermsPage() {
  const { content } = useOmContent();
  
  // Extract loan term fields from flat schema
  const loanType = getOMValue(content, "loanType");
  const interestRate = parseNumeric(content?.interestRate) ?? null;
  const allInRate = parseNumeric(content?.allInRate) ?? null;
  const underwritingRate = parseNumeric(content?.underwritingRate) ?? null;
  const interestRateType = getOMValue(content, "interestRateType");
  const interestOnlyPeriodMonths = parseNumeric(content?.interestOnlyPeriodMonths) ?? null;
  const targetLtvPercent = parseNumeric(content?.targetLtvPercent) ?? null;
  const targetLtcPercent = parseNumeric(content?.targetLtcPercent) ?? null;
  const requestedTerm = getOMValue(content, "requestedTerm");
  const extensionTerms = getOMValue(content, "extensionTerms");
  const recoursePreference = getOMValue(content, "recoursePreference");
  const prepaymentPremium = getOMValue(content, "prepaymentPremium");
  const useOfProceeds = getOMValue(content, "useOfProceeds");
  const permTakeoutPlanned = getOMValue(content, "permTakeoutPlanned");
  
  // Calculate origination fee from loanFees
  const loanFees = parseNumeric(content?.loanFees) ?? null;
  const loanAmountRequested = parseNumeric(content?.loanAmountRequested) ?? null;
  const originationFeePercent = loanFees != null && loanAmountRequested != null && loanAmountRequested > 0
    ? (loanFees / loanAmountRequested) * 100
    : null;
  
  // Calculate tax & insurance reserve
  const realEstateTaxes = parseNumeric(content?.realEstateTaxes) ?? null;
  const insurance = parseNumeric(content?.insurance) ?? null;
  const taxInsuranceReserve = (realEstateTaxes != null && insurance != null)
    ? realEstateTaxes + insurance
    : null;
  
  // Get CapEx reserve
  const capexBudget = parseNumeric(content?.capexBudget) ?? null;
  
  // Get covenant values
  const dscrStressMin = parseNumeric(content?.dscrStressMin) ?? null;
  const ltvStressMax = parseNumeric(content?.ltvStressMax) ?? null;
  const guarantorLiquidity = parseNumeric(content?.guarantorLiquidity) ?? null;
  const interestReserve = parseNumeric(content?.interestReserve) ?? null;
  
  // Format rate display
  const rateDisplay = allInRate != null 
    ? `${formatFixed(allInRate, 2)}% all-in`
    : interestRate != null 
    ? `${formatFixed(interestRate, 2)}%`
    : null;
  
  // Format floor rate
  const floorDisplay = underwritingRate != null 
    ? `${formatFixed(underwritingRate, 2)}%`
    : null;
  
  // Build special programs from flat fields
  const specialPrograms = [];
  if (content?.opportunityZone === true) {
    specialPrograms.push({ name: "Opportunity Zone", description: "Qualified Opportunity Zone benefits" });
  }
  if (content?.taxExemption === true) {
    specialPrograms.push({ name: "Tax Exemption", description: content?.exemptionStructure || "Tax exemption structure" });
  }
  if (content?.affordableHousing === true) {
    specialPrograms.push({ name: "Affordable Housing", description: `${content?.affordableUnitsNumber || 0} affordable units` });
  }


  useOMPageHeader({
    subtitle: "Quick read on rate, term, recourse, and covenant highlights.",
  });

  return (
    <div className="space-y-6">
      {/* Basic Loan Terms */}
      <Card className="hover:shadow-lg transition-shadow mb-8 border-blue-200 bg-white">
        <CardHeader className="pb-3" dataSourceSection="key terms">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-6 w-6 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-800">
              Loan Structure
            </h3>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2 p-4 bg-white rounded-lg border-2 border-blue-200 hover:border-blue-400 transition-colors">
              <p className="text-xs font-medium text-blue-600">Loan Type</p>
              <p className="font-bold text-xl text-gray-900">
                {loanType ? loanType : <MissingValue>Not specified</MissingValue>}
              </p>
            </div>
            <div className="space-y-2 p-4 bg-white rounded-lg border-2 border-green-200 hover:border-green-400 transition-colors">
              <p className="text-xs font-medium text-green-600">Interest Rate</p>
              <p className="font-bold text-xl text-gray-900">
                {rateDisplay ? rateDisplay : <MissingValue>Not specified</MissingValue>}
              </p>
            </div>
            <div className="space-y-2 p-4 bg-white rounded-lg border-2 border-blue-200 hover:border-blue-400 transition-colors">
              <p className="text-xs font-medium text-blue-600">Floor Rate</p>
              <p className="font-bold text-xl text-gray-900">
                {floorDisplay ? floorDisplay : <MissingValue>Not specified</MissingValue>}
              </p>
            </div>
            <div className="space-y-2 p-4 bg-white rounded-lg border-2 border-red-200 hover:border-red-400 transition-colors">
              <p className="text-xs font-medium text-red-600">Term</p>
              <p className="font-bold text-xl text-gray-900">
                {requestedTerm ? requestedTerm : <MissingValue>Not specified</MissingValue>}
              </p>
            </div>
            <div className="space-y-2 p-4 bg-white rounded-lg border-2 border-blue-200 hover:border-blue-400 transition-colors">
              <p className="text-xs font-medium text-blue-600">Extensions</p>
              <p className="font-bold text-xl text-gray-900">
                {extensionTerms ? extensionTerms : <MissingValue>Not specified</MissingValue>}
              </p>
            </div>
            <div className="space-y-2 p-4 bg-white rounded-lg border-2 border-red-200 hover:border-red-400 transition-colors">
              <p className="text-xs font-medium text-red-600">Recourse</p>
              <p className="font-bold text-xl text-gray-900">
                {recoursePreference ? recoursePreference : <MissingValue>Not specified</MissingValue>}
              </p>
            </div>
            <div className="space-y-2 p-4 bg-white rounded-lg border-2 border-blue-200 hover:border-blue-400 transition-colors">
              <p className="text-xs font-medium text-blue-600">Interest Rate Type</p>
              <p className="font-bold text-xl text-gray-900">
                {interestRateType ? interestRateType : <MissingValue>Not specified</MissingValue>}
              </p>
            </div>
            <div className="space-y-2 p-4 bg-white rounded-lg border-2 border-green-200 hover:border-green-400 transition-colors">
              <p className="text-xs font-medium text-green-600">Interest-Only Period</p>
              <p className="font-bold text-xl text-gray-900">
                {interestOnlyPeriodMonths != null ? `${interestOnlyPeriodMonths} months` : <MissingValue>Not specified</MissingValue>}
              </p>
            </div>
            <div className="space-y-2 p-4 bg-white rounded-lg border-2 border-blue-200 hover:border-blue-400 transition-colors">
              <p className="text-xs font-medium text-blue-600">Target LTV</p>
              <p className="font-bold text-xl text-gray-900">
                {targetLtvPercent != null ? `${formatFixed(targetLtvPercent, 2)}%` : <MissingValue>Not specified</MissingValue>}
              </p>
            </div>
            <div className="space-y-2 p-4 bg-white rounded-lg border-2 border-green-200 hover:border-green-400 transition-colors">
              <p className="text-xs font-medium text-green-600">Target LTC</p>
              <p className="font-bold text-xl text-gray-900">
                {targetLtcPercent != null ? `${formatFixed(targetLtcPercent, 2)}%` : <MissingValue>Not specified</MissingValue>}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Loan Details */}
      <Card className="hover:shadow-lg transition-shadow mb-8 border-blue-200 bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <FileText className="h-6 w-6 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-800">Loan Details</h3>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            <div className="p-4 bg-white rounded-lg border-2 border-blue-200">
              <p className="text-xs font-medium text-blue-600 mb-2">Use of Proceeds</p>
              <p className="text-sm text-gray-800">
                {useOfProceeds ? useOfProceeds : <MissingValue>Not specified</MissingValue>}
              </p>
            </div>
            <div className="p-4 bg-white rounded-lg border-2 border-green-200">
              <p className="text-xs font-medium text-green-600 mb-2">Perm Takeout Planned</p>
              <p className="text-sm text-gray-800">
                {permTakeoutPlanned ? (permTakeoutPlanned === 'true' || permTakeoutPlanned === true ? 'Yes' : permTakeoutPlanned) : <MissingValue>Not specified</MissingValue>}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fees and Reserves */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow border-red-200 bg-white">
          <CardHeader className="pb-3" dataSourceFields={['origination fee', 'exit fee', 'loan fees']}>
            <div className="flex items-center space-x-2">
              <Percent className="h-6 w-6 text-red-600" />
              <h3 className="text-xl font-semibold text-gray-800">Fees</h3>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-white rounded-lg border-2 border-red-200 hover:border-red-400 transition-colors">
                <span className="text-sm text-gray-700 font-medium">Origination Fee</span>
                <Badge className="bg-red-100 text-red-800 border-2 border-red-300 font-semibold text-sm px-3 py-1">
                  {originationFeePercent != null ? `${formatFixed(originationFeePercent, 2)}%` : <MissingValue>Not specified</MissingValue>}
                </Badge>
              </div>
              <div className="flex justify-between items-center p-4 bg-white rounded-lg border-2 border-red-200 hover:border-red-400 transition-colors">
                <span className="text-sm text-gray-700 font-medium">Exit Fee</span>
                <Badge className="bg-red-100 text-red-800 border-2 border-red-300 font-semibold text-sm px-3 py-1">
                  {prepaymentPremium ? prepaymentPremium : <MissingValue>Not specified</MissingValue>}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-blue-200 bg-white">
          <CardHeader className="pb-3" dataSourceSection="lender reserves">
            <div className="flex items-center space-x-2">
              <Shield className="h-6 w-6 text-blue-600" />
              <h3 className="text-xl font-semibold text-gray-800">
                Lender Reserves
              </h3>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-white rounded-lg border-2 border-blue-200 hover:border-blue-400 transition-colors">
                <span className="text-sm text-gray-700 font-medium">Interest Reserve</span>
                <Badge className="bg-blue-100 text-blue-800 border-2 border-blue-300 font-semibold text-sm px-3 py-1">
                  {interestReserve != null ? `$${interestReserve.toLocaleString()}` : <MissingValue>Not specified</MissingValue>}
                </Badge>
              </div>
              <div className="flex justify-between items-center p-4 bg-white rounded-lg border-2 border-blue-200 hover:border-blue-400 transition-colors">
                <span className="text-sm text-gray-700 font-medium">Tax & Insurance</span>
                <Badge className="bg-blue-100 text-blue-800 border-2 border-blue-300 font-semibold text-sm px-3 py-1">
                  {taxInsuranceReserve != null ? `$${taxInsuranceReserve.toLocaleString()}` : <MissingValue>Not specified</MissingValue>}
                </Badge>
              </div>
              <div className="flex justify-between items-center p-4 bg-white rounded-lg border-2 border-green-200 hover:border-green-400 transition-colors">
                <span className="text-sm text-gray-700 font-medium">CapEx Reserve</span>
                <Badge className="bg-green-100 text-green-800 border-2 border-green-300 font-semibold text-sm px-3 py-1">
                  {capexBudget != null ? `$${capexBudget.toLocaleString()}` : <MissingValue>Not specified</MissingValue>}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Covenants */}
      <Card className="hover:shadow-lg transition-shadow border-blue-200 bg-white">
        <CardHeader className="pb-3" dataSourceSection="financial covenants">
          <div className="flex items-center space-x-2">
            <FileText className="h-6 w-6 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-800">
              Financial Covenants
            </h3>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 p-4 bg-white rounded-lg border-2 border-blue-200 hover:border-blue-400 transition-colors">
              <p className="text-xs font-medium text-blue-600">Minimum DSCR</p>
              <p className="font-bold text-xl text-gray-900">
                {dscrStressMin != null ? `${formatFixed(dscrStressMin, 2)}x` : <MissingValue>Not specified</MissingValue>}
              </p>
            </div>
            <div className="space-y-2 p-4 bg-white rounded-lg border-2 border-blue-200 hover:border-blue-400 transition-colors">
              <p className="text-xs font-medium text-blue-600">Maximum LTV</p>
              <p className="font-bold text-xl text-gray-900">
                {ltvStressMax != null ? `${formatFixed(ltvStressMax, 2)}%` : <MissingValue>Not specified</MissingValue>}
              </p>
            </div>
            <div className="space-y-2 p-4 bg-white rounded-lg border-2 border-blue-200 hover:border-blue-400 transition-colors">
              <p className="text-xs font-medium text-blue-600">Minimum Liquidity</p>
              <p className="font-bold text-xl text-gray-900">
                {guarantorLiquidity != null ? `$${guarantorLiquidity.toLocaleString()}` : <MissingValue>Not specified</MissingValue>}
              </p>
            </div>
            <div className="space-y-2 p-4 bg-white rounded-lg border-2 border-red-200 hover:border-red-400 transition-colors">
              <p className="text-xs font-medium text-red-600">Completion Guaranty</p>
              <p className="font-bold text-xl text-gray-900">
                <MissingValue>Not specified</MissingValue>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow mt-8 border-green-200 bg-white">
        <CardHeader className="pb-3" dataSourceFields={['opportunity zone', 'tax exemption', 'affordable housing']}>
          <div className="flex items-center space-x-2">
            <Sparkles className="h-6 w-6 text-green-600" />
            <h3 className="text-xl font-semibold text-gray-800">Special Programs & Incentives</h3>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            <span className="text-red-600">Opportunity Zone benefits, Dallas PFC lease, and workforce housing covenant tied to the Hoque structure.</span>
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {specialPrograms.map((program: { name?: string | null; description?: string | null }, index: number) => (
              <div 
                key={`program-${index}`} 
                className={`flex items-start justify-between rounded-lg p-5 bg-white border-2 transition-all hover:shadow-md ${
                  index === 0 
                    ? 'border-green-300'
                    : index === 1
                    ? 'border-blue-300'
                    : 'border-red-300'
                }`}
              >
                <div className="pr-4">
                  <h4 className={`font-bold text-xl mb-1 ${
                    index === 0 
                      ? 'text-green-900'
                      : index === 1
                      ? 'text-blue-900'
                      : 'text-red-900'
                  }`}>
                    {program?.name ?? null}
                  </h4>
                  <p className={`text-sm mt-1 ${
                    index === 0 
                      ? 'text-green-700'
                      : index === 1
                      ? 'text-blue-700'
                      : 'text-red-700'
                  }`}>
                    {program?.description ?? null}
                  </p>
                </div>
                <Badge className={`whitespace-nowrap border-2 font-semibold text-sm px-3 py-1 ${
                  index === 0
                    ? 'bg-green-100 text-green-800 border-green-300'
                    : index === 1
                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                    : 'bg-red-100 text-red-800 border-red-300'
                }`}>
                  {index === 0 ? <span className="text-red-600">Qualified</span> : <span className="text-red-600">In Structuring</span>}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
