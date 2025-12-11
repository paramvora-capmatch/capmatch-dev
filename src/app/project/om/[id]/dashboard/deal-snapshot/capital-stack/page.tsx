// src/app/project/om/[id]/dashboard/deal-snapshot/capital-stack/page.tsx
"use client";

import React, { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useProjects } from '@/hooks/useProjects';
import { useOMDashboard } from '@/contexts/OMDashboardContext';
import { MetricCard } from '@/components/om/widgets/MetricCard';
import { MiniChart } from '@/components/om/widgets/MiniChart';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { DollarSign, TrendingUp, FileText, AlertTriangle } from 'lucide-react';
import { useOMPageHeader } from '@/hooks/useOMPageHeader';
import { useOmContent } from '@/hooks/useOmContent';
import { formatFixed, getOMValue, parseNumeric } from '@/lib/om-utils';

export default function CapitalStackPage() {
  const params = useParams();
  const projectId = params?.id as string;
  const { getProject } = useProjects();
  const project = projectId ? getProject(projectId) : null;
  const { scenario } = useOMDashboard();
  const { content } = useOmContent();
  
  // Extract values from flat OM content
  const loanAmountRequested = parseNumeric(getOMValue(content, "loanAmountRequested"));
  const sponsorEquity = parseNumeric(getOMValue(content, "sponsorEquity"));
  const taxCreditEquity = parseNumeric(getOMValue(content, "taxCreditEquity")) ?? 0;
  const gapFinancing = parseNumeric(getOMValue(content, "gapFinancing")) ?? 0;
  const totalProjectCost = parseNumeric(getOMValue(content, "totalProjectCost")) ?? parseNumeric(getOMValue(content, "totalDevelopmentCost")) ?? 0;
  const interestRate = parseNumeric(getOMValue(content, "interestRate"));
  const allInRate = parseNumeric(getOMValue(content, "allInRate"));
  const underwritingRate = parseNumeric(getOMValue(content, "underwritingRate"));
  const loanType = getOMValue(content, "loanType");
  const requestedTerm = getOMValue(content, "requestedTerm");
  const interestOnlyPeriodMonths = parseNumeric(getOMValue(content, "interestOnlyPeriodMonths"));
  const amortizationYears = parseNumeric(getOMValue(content, "amortizationYears"));
  const recoursePreference = getOMValue(content, "recoursePreference");
  const prepaymentTerms = getOMValue(content, "prepaymentTerms");
  const prepaymentPremium = getOMValue(content, "prepaymentPremium");
  const interestReserve = parseNumeric(getOMValue(content, "interestReserve"));
  const realEstateTaxes = parseNumeric(getOMValue(content, "realEstateTaxes"));
  const insurance = parseNumeric(getOMValue(content, "insurance"));
  const reserves = parseNumeric(getOMValue(content, "reserves"));
  const targetLtcPercent = parseNumeric(getOMValue(content, "targetLtcPercent"));
  
  // Use items
  const landAcquisition = parseNumeric(getOMValue(content, "landAcquisition")) ?? parseNumeric(getOMValue(content, "purchasePrice")) ?? 0;
  const baseConstruction = parseNumeric(getOMValue(content, "baseConstruction")) ?? parseNumeric(getOMValue(content, "capexBudget")) ?? 0;
  const contingency = parseNumeric(getOMValue(content, "contingency")) ?? 0;
  const ffe = parseNumeric(getOMValue(content, "ffe")) ?? 0;
  const constructionFees = parseNumeric(getOMValue(content, "constructionFees")) ?? 0;
  const aeFees = parseNumeric(getOMValue(content, "aeFees")) ?? 0;
  const thirdPartyReports = parseNumeric(getOMValue(content, "thirdPartyReports")) ?? 0;
  const legalAndOrg = parseNumeric(getOMValue(content, "legalAndOrg")) ?? 0;
  const titleAndRecording = parseNumeric(getOMValue(content, "titleAndRecording")) ?? 0;
  const taxesDuringConstruction = parseNumeric(getOMValue(content, "taxesDuringConstruction")) ?? 0;
  const workingCapital = parseNumeric(getOMValue(content, "workingCapital")) ?? 0;
  const developerFee = parseNumeric(getOMValue(content, "developerFee")) ?? 0;
  const pfcStructuringFee = parseNumeric(getOMValue(content, "pfcStructuringFee")) ?? 0;
  const loanFees = parseNumeric(getOMValue(content, "loanFees")) ?? 0;
  const opDeficitEscrow = parseNumeric(getOMValue(content, "opDeficitEscrow")) ?? 0;
  const leaseUpEscrow = parseNumeric(getOMValue(content, "leaseUpEscrow")) ?? 0;
  const relocationCosts = parseNumeric(getOMValue(content, "relocationCosts")) ?? 0;
  const syndicationCosts = parseNumeric(getOMValue(content, "syndicationCosts")) ?? 0;
  const enviroRemediation = parseNumeric(getOMValue(content, "enviroRemediation")) ?? 0;
  
  // Calculate total capitalization
  const totalCapitalization = useMemo(() => {
    if (totalProjectCost > 0) return totalProjectCost;
    const calculated = (loanAmountRequested ?? 0) + (sponsorEquity ?? 0) + taxCreditEquity + gapFinancing;
    return calculated > 0 ? calculated : null;
  }, [totalProjectCost, loanAmountRequested, sponsorEquity, taxCreditEquity, gapFinancing]);
  
  // Build sources array
  const sources = useMemo(() => {
    const srcs: Array<{ type: string; amount: number; percentage: number; rate?: string; contribution?: string }> = [];
    
    if (loanAmountRequested != null && loanAmountRequested > 0 && totalCapitalization != null) {
      const rateStr = allInRate != null ? `${formatFixed(allInRate, 2)}% all-in` : interestRate != null ? `${formatFixed(interestRate, 2)}%` : null;
      srcs.push({
        type: loanType ?? "Senior Construction Loan",
        amount: loanAmountRequested,
        percentage: (loanAmountRequested / totalCapitalization) * 100,
        rate: rateStr ?? undefined,
        contribution: `${formatFixed((loanAmountRequested / totalCapitalization) * 100, 1)}% of total`
      });
    }
    
    if (sponsorEquity != null && sponsorEquity > 0 && totalCapitalization != null) {
      srcs.push({
        type: "Sponsor Equity",
        amount: sponsorEquity,
        percentage: (sponsorEquity / totalCapitalization) * 100,
        contribution: `${formatFixed((sponsorEquity / totalCapitalization) * 100, 1)}% of total`
      });
    }
    
    if (taxCreditEquity > 0 && totalCapitalization != null) {
      srcs.push({
        type: "Tax Credit Equity",
        amount: taxCreditEquity,
        percentage: (taxCreditEquity / totalCapitalization) * 100,
        contribution: `${formatFixed((taxCreditEquity / totalCapitalization) * 100, 1)}% of total`
      });
    }
    
    if (gapFinancing > 0 && totalCapitalization != null) {
      srcs.push({
        type: "Gap Financing",
        amount: gapFinancing,
        percentage: (gapFinancing / totalCapitalization) * 100,
        contribution: `${formatFixed((gapFinancing / totalCapitalization) * 100, 1)}% of total`
      });
    }
    
    // If no sources found, show placeholder
    if (srcs.length === 0) {
      srcs.push({
        type: "Senior Debt",
        amount: 0,
        percentage: 0,
        contribution: "N/A"
      });
    }
    
    return srcs;
  }, [loanAmountRequested, sponsorEquity, taxCreditEquity, gapFinancing, totalCapitalization, loanType, allInRate, interestRate]);
  
  // Build uses array
  const uses = useMemo(() => {
    const useItems: Array<{ type: string; amount: number; percentage: number; timing?: string }> = [];
    const totalUses = totalCapitalization ?? totalProjectCost;
    
    if (totalUses == null || totalUses === 0) {
      return [{
        type: "Total Project Cost",
        amount: 0,
        percentage: 0,
        timing: "N/A"
      }];
    }
    
    const addUse = (type: string, amount: number, timing: string = "At Closing") => {
      if (amount > 0) {
        useItems.push({
          type,
          amount,
          percentage: (amount / totalUses) * 100,
          timing
        });
      }
    };
    
    addUse("Land Acquisition", landAcquisition, "At Closing");
    addUse("Base Construction", baseConstruction, "During Construction");
    addUse("Contingency", contingency, "During Construction");
    addUse("FF&E", ffe, "During Construction");
    addUse("Construction Fees", constructionFees, "During Construction");
    addUse("A&E Fees", aeFees, "Pre-Construction");
    addUse("Third Party Reports", thirdPartyReports, "Pre-Construction");
    addUse("Legal & Org", legalAndOrg, "Pre-Construction");
    addUse("Title & Recording", titleAndRecording, "At Closing");
    addUse("Taxes During Construction", taxesDuringConstruction, "During Construction");
    addUse("Working Capital", workingCapital, "At Closing");
    addUse("Developer Fee", developerFee, "During Construction");
    addUse("PFC Structuring Fee", pfcStructuringFee, "Pre-Construction");
    addUse("Loan Fees", loanFees, "At Closing");
    addUse("Interest Reserve", interestReserve, "At Closing");
    addUse("Op Deficit Escrow", opDeficitEscrow, "At Closing");
    addUse("Lease-Up Escrow", leaseUpEscrow, "At Closing");
    addUse("Relocation Costs", relocationCosts, "Pre-Construction");
    addUse("Syndication Costs", syndicationCosts, "Pre-Construction");
    addUse("Environmental Remediation", enviroRemediation, "Pre-Construction");
    
    // If no uses found, show placeholder
    if (useItems.length === 0) {
      useItems.push({
        type: "Total Project Cost",
        amount: totalUses,
        percentage: 100,
        timing: "N/A"
      });
    }
    
    return useItems;
  }, [totalCapitalization, totalProjectCost, landAcquisition, baseConstruction, contingency, ffe, constructionFees, aeFees, thirdPartyReports, legalAndOrg, titleAndRecording, taxesDuringConstruction, workingCapital, developerFee, pfcStructuringFee, loanFees, interestReserve, opDeficitEscrow, leaseUpEscrow, relocationCosts, syndicationCosts, enviroRemediation]);
  
  const primaryDebt = sources[0] ?? null;
  const formatPercent = (value: number | null | undefined) =>
    value != null ? `${formatFixed(value, 2)}%` : null;
  const formatMillions = (value: number | null | undefined) =>
    value != null ? `$${formatFixed(value / 1_000_000, 1) ?? "0.0"}M` : null;
  
  // Helper to show missing value in red
  const MissingValue = ({ children }: { children: React.ReactNode }) => (
    <span className="text-red-600">{children}</span>
  );

  useOMPageHeader({
    subtitle: project
      ? "Breakdown of senior debt, equity, and how total capitalization is deployed."
      : undefined,
  });

  if (!project) return <div>Project not found</div>;

  const sourcesChartData = sources.map((source) => ({
    name: source.type ?? "Unknown",
    value: source.percentage ?? 0,
  }));

  const usesChartData = uses.map((use) => ({
    name: use.type ?? "Unknown",
    value: use.percentage ?? 0,
  }));
  
  // Calculate LTC from loan amount and total cost
  const ltcPercent = useMemo(() => {
    if (loanAmountRequested != null && totalProjectCost > 0) {
      return (loanAmountRequested / totalProjectCost) * 100;
    }
    if (targetLtcPercent != null) {
      return targetLtcPercent;
    }
    return null;
  }, [loanAmountRequested, totalProjectCost, targetLtcPercent]);
  
  // Calculate equity contribution
  const equityPercent = useMemo(() => {
    if (ltcPercent != null) {
      return 100 - ltcPercent;
    }
    if (sponsorEquity != null && totalCapitalization != null && totalCapitalization > 0) {
      return (sponsorEquity / totalCapitalization) * 100;
    }
    return null;
  }, [ltcPercent, sponsorEquity, totalCapitalization]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-end">
        <div className="text-sm text-gray-500">
          Current Scenario:{" "}
          <span className="font-medium capitalize">{scenario}</span>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          label="Total Capitalization"
          value={totalCapitalization ?? null}
          format="currency"
          size="lg"
          dataSourceFields={['totalProjectCost', 'totalDevelopmentCost', 'loanAmountRequested', 'sponsorEquity']}
        />
        <MetricCard
          label="Loan to Cost"
          value={ltcPercent ?? null}
          format="percent"
          size="lg"
          dataSourceFields={['targetLtcPercent', 'loanAmountRequested', 'totalProjectCost']}
        />
        <MetricCard
          label="Equity Contribution"
          value={equityPercent ?? null}
          format="percent"
          size="lg"
          dataSourceFields={['sponsorEquity', 'totalCapitalization', 'equityCommittedPercent']}
        />
      </div>

      {/* Sources & Uses Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sources */}
        <Card>
          <CardHeader dataSourceSection="capital stack">
            <div className="flex items-center">
              <DollarSign className="h-6 w-6 text-green-600 mr-2" />
              <h3 className="text-xl font-semibold text-gray-800">
                Capital Sources
              </h3>
            </div>
          </CardHeader>
          <CardContent>

          <div className="mb-6">
            <MiniChart
              type="pie"
              data={sourcesChartData}
              height={120}
              colors={["#3B82F6", "#10B981", "#8B5CF6"]}
            />
          </div>

          <div className="space-y-3">
            {sources.length === 0 ? (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-800">No capital sources found</p>
                <p className="text-sm text-red-600 mt-1">Missing fields: loanAmountRequested, sponsorEquity</p>
              </div>
            ) : (
              sources.map((source, idx: number) => (
                <div
                  key={idx}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-800">
                      {source.type ? source.type : <MissingValue>Unknown Source</MissingValue>}
                    </p>
                    {source.rate && (
                      <p className="text-sm text-gray-600">Rate: {source.rate}</p>
                    )}
                    {source.contribution && (
                      <p className="text-sm text-gray-600">
                        Contribution: {source.contribution}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-800">
                      {source.amount > 0 ? formatMillions(source.amount) : <MissingValue>$0.0M</MissingValue>}
                    </p>
                    <p className="text-sm text-gray-600">
                      {source.percentage > 0 ? formatPercent(source.percentage) : <MissingValue>0.00%</MissingValue>}
                    </p>
                  </div>
                </div>
              ))
            )}
            </div>
          </CardContent>
        </Card>

        {/* Uses */}
        <Card>
          <CardHeader dataSourceSection="sources & uses">
            <div className="flex items-center">
              <TrendingUp className="h-6 w-6 text-blue-600 mr-2" />
              <h3 className="text-xl font-semibold text-gray-800">
                Capital Uses
              </h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
            <MiniChart
              type="pie"
              data={usesChartData}
              height={120}
              colors={["#EF4444", "#F59E0B", "#8B5CF6", "#06B6D4"]}
            />
          </div>

          <div className="space-y-3">
            {uses.length === 0 ? (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-800">No capital uses found</p>
                <p className="text-sm text-red-600 mt-1">Missing fields: totalProjectCost, landAcquisition, baseConstruction</p>
              </div>
            ) : (
              uses.map((use, idx: number) => (
                <div
                  key={idx}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-800">
                      {use.type ? use.type : <MissingValue>Unknown Use</MissingValue>}
                    </p>
                    <p className="text-sm text-gray-600">
                      Timing: {use.timing ? use.timing : <MissingValue>N/A</MissingValue>}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-800">
                      {use.amount > 0 ? formatMillions(use.amount) : <MissingValue>$0.0M</MissingValue>}
                    </p>
                    <p className="text-sm text-gray-600">
                      {use.percentage > 0 ? formatPercent(use.percentage) : <MissingValue>0.00%</MissingValue>}
                    </p>
                  </div>
                </div>
              ))
            )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Debt Terms */}
      <Card>
        <CardHeader dataSourceSection="key terms">
          <div className="flex items-center">
            <FileText className="h-6 w-6 text-blue-600 mr-2" />
            <h3 className="text-xl font-semibold text-gray-800">Debt Terms</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Loan Type</p>
                <p className="font-medium text-gray-800">
                  {loanType ? loanType : <MissingValue>Not specified</MissingValue>}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Lender</p>
                <p className="font-medium text-gray-800">
                  <MissingValue>TBD</MissingValue>
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Rate</p>
                <p className="font-medium text-gray-800">
                  {allInRate != null ? `${formatFixed(allInRate, 2)}% all-in` : 
                   interestRate != null ? `${formatFixed(interestRate, 2)}%` : 
                   <MissingValue>Not specified</MissingValue>}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Floor Rate</p>
                <p className="font-medium text-gray-800">
                  {underwritingRate != null ? `${formatFixed(underwritingRate, 2)}%` : 
                   <MissingValue>Not specified</MissingValue>}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Term</p>
                <p className="font-medium text-gray-800">
                  {requestedTerm ? requestedTerm : 
                   interestOnlyPeriodMonths != null ? `${interestOnlyPeriodMonths} months IO` : 
                   <MissingValue>Not specified</MissingValue>}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Amortization</p>
                <p className="font-medium text-gray-800">
                  {amortizationYears != null ? `${amortizationYears} years` : 
                   <MissingValue>Not specified</MissingValue>}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-600">Recourse</p>
                <p className="font-medium text-gray-800">
                  {recoursePreference ? recoursePreference : <MissingValue>Not specified</MissingValue>}
                </p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-600">Prepayment Terms</p>
                <p className="font-medium text-gray-800">
                  {prepaymentTerms ? prepaymentTerms : <MissingValue>Not specified</MissingValue>}
                </p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-600">Prepayment Premium</p>
                <p className="font-medium text-gray-800">
                  {prepaymentPremium ? prepaymentPremium : <MissingValue>Not specified</MissingValue>}
                </p>
              </div>
            </div>
          </div>

          {/* Reserves */}
          <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">
            Lender Reserves
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Interest Reserve</p>
              <p className="font-medium text-gray-800">
                {interestReserve != null ? formatMillions(interestReserve) : 
                 <MissingValue>Not specified</MissingValue>}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Tax & Insurance</p>
              <p className="font-medium text-gray-800">
                {(realEstateTaxes != null && insurance != null) ? 
                 formatMillions((realEstateTaxes ?? 0) + (insurance ?? 0)) : 
                 <MissingValue>Not specified</MissingValue>}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">CapEx Reserve</p>
              <p className="font-medium text-gray-800">
                {reserves != null ? formatMillions(reserves) : 
                 <MissingValue>Not specified</MissingValue>}
              </p>
            </div>
          </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Risks & Mitigants */}
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <AlertTriangle className="h-6 w-6 text-red-600 mr-2" />
            <h3 className="text-xl font-semibold text-gray-800">
              Key Risks & Mitigants
            </h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="font-medium text-gray-800">Construction Risk</h4>
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-700">
                <strong>Risk:</strong> <span className="text-red-600">Cost overruns and delays could strain
                cash flow</span>
              </p>
              <p className="text-sm text-green-700 mt-1">
                <strong>Mitigant:</strong> <span className="text-red-600">Fixed-price GMP contract with
                experienced contractor</span>
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-gray-800">Interest Rate Risk</h4>
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-700">
                <strong>Risk:</strong> <span className="text-red-600">Rising SOFR could increase debt service
                costs</span>
              </p>
              <p className="text-sm text-green-700 mt-1">
                <strong>Mitigant:</strong> <span className="text-red-600">12-month interest reserve and rate
                floor protection</span>
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-gray-800">Pre-Leasing Risk</h4>
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-700">
                <strong>Risk:</strong> <span className="text-red-600">Insufficient pre-leasing could delay
                permanent financing</span>
              </p>
              <p className="text-sm text-green-700 mt-1">
                <strong>Mitigant:</strong> <span className="text-red-600">Strong market fundamentals and
                marketing plan</span>
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-gray-800">Exit Strategy Risk</h4>
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-700">
                <strong>Risk:</strong> <span className="text-red-600">Market conditions may not support target
                exit cap rate</span>
              </p>
              <p className="text-sm text-green-700 mt-1">
                <strong>Mitigant:</strong> <span className="text-red-600">Multiple exit strategies (sale,
                refinance, hold)</span>
              </p>
            </div>
          </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
