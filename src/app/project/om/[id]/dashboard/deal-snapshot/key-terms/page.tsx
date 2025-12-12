"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Percent, Clock, Shield, FileText, Sparkles } from "lucide-react";
import { useOMPageHeader } from "@/hooks/useOMPageHeader";
import { useOmContent } from "@/hooks/useOmContent";
import { parseNumeric } from "@/lib/om-utils";

export default function KeyTermsPage() {
  const { content, insights } = useOmContent();
  
  // Extract additional loan term fields
  const interestRateType = content?.interestRateType ?? null;
  const interestOnlyPeriodMonths = parseNumeric(content?.interestOnlyPeriodMonths) ?? null;
  const targetLtvPercent = parseNumeric(content?.targetLtvPercent) ?? null;
  const targetLtcPercent = parseNumeric(content?.targetLtcPercent) ?? null;
  const useOfProceeds = content?.useOfProceeds ?? null;
  const permTakeoutPlanned = content?.permTakeoutPlanned ?? null;

  // Build key terms from flat fields
  const keyTerms = {
    loanType: content?.loanType ?? null,
    rate: content?.allInRate != null ? `${content.allInRate}% all-in` : content?.interestRate != null ? `${content.interestRate}%` : null,
    floor: content?.underwritingRate != null ? `${content.underwritingRate}%` : null,
    term: content?.requestedTerm ?? null,
    extension: null, // Not directly available
    recourse: content?.recoursePreference ?? null,
    origination: "1.00%", // Placeholder
    exitFee: content?.prepaymentPremium ?? null,
    interestRateType,
    interestOnlyPeriodMonths,
    targetLtvPercent,
    targetLtcPercent,
    useOfProceeds,
    permTakeoutPlanned,
    covenants: {
      minDSCR: content?.dscrStressMin != null ? `${content.dscrStressMin.toFixed(2)}x` : null,
      maxLTV: content?.ltvStressMax != null ? `${content.ltvStressMax}%` : null,
      minLiquidity: content?.guarantorLiquidity != null ? `$${Number(content.guarantorLiquidity).toLocaleString()}` : null,
      completionGuaranty: null, // Not directly available
    },
    lenderReserves: {
      interest: content?.interestReserve != null ? `$${Number(content.interestReserve).toLocaleString()}` : null,
      taxInsurance: null, // Not directly available - could calculate from realEstateTaxes + insurance
      capEx: null, // Not directly available
    },
  };
  
  const covenants = keyTerms.covenants;
  const lenderReserves = keyTerms.lenderReserves;
  
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
                {keyTerms?.loanType ?? null}
              </p>
            </div>
            <div className="space-y-2 p-4 bg-white rounded-lg border-2 border-green-200 hover:border-green-400 transition-colors">
              <p className="text-xs font-medium text-green-600">Interest Rate</p>
              <p className="font-bold text-xl text-gray-900">
                {keyTerms?.rate ?? null}
              </p>
            </div>
            <div className="space-y-2 p-4 bg-white rounded-lg border-2 border-blue-200 hover:border-blue-400 transition-colors">
              <p className="text-xs font-medium text-blue-600">Floor Rate</p>
              <p className="font-bold text-xl text-gray-900">
                {keyTerms?.floor ?? null}
              </p>
            </div>
            <div className="space-y-2 p-4 bg-white rounded-lg border-2 border-red-200 hover:border-red-400 transition-colors">
              <p className="text-xs font-medium text-red-600">Term</p>
              <p className="font-bold text-xl text-gray-900">
                {keyTerms?.term ?? null}
              </p>
            </div>
            <div className="space-y-2 p-4 bg-white rounded-lg border-2 border-blue-200 hover:border-blue-400 transition-colors">
              <p className="text-xs font-medium text-blue-600">Extensions</p>
              <p className="font-bold text-xl text-gray-900">
                {keyTerms?.extension ?? null}
              </p>
            </div>
            <div className="space-y-2 p-4 bg-white rounded-lg border-2 border-red-200 hover:border-red-400 transition-colors">
              <p className="text-xs font-medium text-red-600">Recourse</p>
              <p className="font-bold text-xl text-gray-900">
                {keyTerms?.recourse ?? null}
              </p>
            </div>
            {interestRateType && (
              <div className="space-y-2 p-4 bg-white rounded-lg border-2 border-blue-200 hover:border-blue-400 transition-colors">
                <p className="text-xs font-medium text-blue-600">Interest Rate Type</p>
                <p className="font-bold text-xl text-gray-900">{interestRateType}</p>
              </div>
            )}
            {interestOnlyPeriodMonths != null && (
              <div className="space-y-2 p-4 bg-white rounded-lg border-2 border-green-200 hover:border-green-400 transition-colors">
                <p className="text-xs font-medium text-green-600">Interest-Only Period</p>
                <p className="font-bold text-xl text-gray-900">{interestOnlyPeriodMonths} months</p>
              </div>
            )}
            {targetLtvPercent != null && (
              <div className="space-y-2 p-4 bg-white rounded-lg border-2 border-blue-200 hover:border-blue-400 transition-colors">
                <p className="text-xs font-medium text-blue-600">Target LTV</p>
                <p className="font-bold text-xl text-gray-900">{targetLtvPercent}%</p>
              </div>
            )}
            {targetLtcPercent != null && (
              <div className="space-y-2 p-4 bg-white rounded-lg border-2 border-green-200 hover:border-green-400 transition-colors">
                <p className="text-xs font-medium text-green-600">Target LTC</p>
                <p className="font-bold text-xl text-gray-900">{targetLtcPercent}%</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Additional Loan Details */}
      {(useOfProceeds || permTakeoutPlanned) && (
        <Card className="hover:shadow-lg transition-shadow mb-8 border-blue-200 bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <FileText className="h-6 w-6 text-blue-600" />
              <h3 className="text-xl font-semibold text-gray-800">Loan Details</h3>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {useOfProceeds && (
                <div className="p-4 bg-white rounded-lg border-2 border-blue-200">
                  <p className="text-xs font-medium text-blue-600 mb-2">Use of Proceeds</p>
                  <p className="text-sm text-gray-800">{useOfProceeds}</p>
                </div>
              )}
              {permTakeoutPlanned && (
                <div className="p-4 bg-white rounded-lg border-2 border-green-200">
                  <p className="text-xs font-medium text-green-600 mb-2">Perm Takeout Planned</p>
                  <p className="text-sm text-gray-800">{permTakeoutPlanned}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
                    {(() => {
                      const originationFee = content?.loanFees 
                        ? typeof content.loanFees === 'number' 
                          ? `${content.loanFees}%` 
                          : content.loanFees
                        : '1.00%';
                      return originationFee;
                    })()}
                  </Badge>
              </div>
              <div className="flex justify-between items-center p-4 bg-white rounded-lg border-2 border-red-200 hover:border-red-400 transition-colors">
                <span className="text-sm text-gray-700 font-medium">Exit Fee</span>
                  <Badge className="bg-red-100 text-red-800 border-2 border-red-300 font-semibold text-sm px-3 py-1">
                    {keyTerms?.exitFee ?? null}
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
                    {lenderReserves?.interest ?? null}
                  </Badge>
              </div>
              <div className="flex justify-between items-center p-4 bg-white rounded-lg border-2 border-blue-200 hover:border-blue-400 transition-colors">
                <span className="text-sm text-gray-700 font-medium">Tax & Insurance</span>
                  <Badge className="bg-blue-100 text-blue-800 border-2 border-blue-300 font-semibold text-sm px-3 py-1">
                    {lenderReserves?.taxInsurance ?? null}
                  </Badge>
              </div>
              <div className="flex justify-between items-center p-4 bg-white rounded-lg border-2 border-green-200 hover:border-green-400 transition-colors">
                <span className="text-sm text-gray-700 font-medium">CapEx Reserve</span>
                  <Badge className="bg-green-100 text-green-800 border-2 border-green-300 font-semibold text-sm px-3 py-1">
                    {lenderReserves?.capEx ?? null}
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
                {covenants?.minDSCR ?? null}
              </p>
            </div>
            <div className="space-y-2 p-4 bg-white rounded-lg border-2 border-blue-200 hover:border-blue-400 transition-colors">
              <p className="text-xs font-medium text-blue-600">Maximum LTV</p>
              <p className="font-bold text-xl text-gray-900">
                {covenants?.maxLTV ?? null}
              </p>
            </div>
            <div className="space-y-2 p-4 bg-white rounded-lg border-2 border-blue-200 hover:border-blue-400 transition-colors">
              <p className="text-xs font-medium text-blue-600">Minimum Liquidity</p>
              <p className="font-bold text-xl text-gray-900">
                {covenants?.minLiquidity ?? null}
              </p>
            </div>
            <div className="space-y-2 p-4 bg-white rounded-lg border-2 border-red-200 hover:border-red-400 transition-colors">
              <p className="text-xs font-medium text-red-600">Completion Guaranty</p>
              <p className="font-bold text-xl text-gray-900">
                {covenants?.completionGuaranty ?? null}
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
            {insights?.specialProgramsDescription ?? content?.specialProgramsDescription ?? 'Opportunity Zone benefits, Dallas PFC lease, and workforce housing covenant tied to the Hoque structure.'}
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
                  {index === 0 
                    ? (content?.opportunityZone ? 'Qualified' : 'In Structuring')
                    : 'In Structuring'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
