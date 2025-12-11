// src/app/project/om/[id]/dashboard/deal-snapshot/capital-stack/page.tsx
"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import { useProjects } from '@/hooks/useProjects';
import { useOMDashboard } from '@/contexts/OMDashboardContext';
import { MetricCard } from '@/components/om/widgets/MetricCard';
import { MiniChart } from '@/components/om/widgets/MiniChart';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { DollarSign, TrendingUp, FileText, AlertTriangle } from 'lucide-react';
import { useOMPageHeader } from '@/hooks/useOMPageHeader';
import { useOmContent } from '@/hooks/useOmContent';
import { formatFixed, parseNumeric, formatCurrency } from '@/lib/om-utils';
import { getOMValue } from '@/lib/om-queries';

export default function CapitalStackPage() {
  const params = useParams();
  const projectId = params?.id as string;
  const { getProject } = useProjects();
  const project = projectId ? getProject(projectId) : null;
  const { scenario } = useOMDashboard();
  const { content, insights } = useOmContent();
  
  // Build capitalStackData from flat fields
  const totalCapitalization = parseNumeric(content?.totalCapitalization) ?? parseNumeric(content?.totalDevelopmentCost) ?? 0;
  const loanAmountRequested = parseNumeric(content?.loanAmountRequested) ?? 0;
  const sponsorEquity = parseNumeric(content?.sponsorEquity) ?? 0;
  const taxCreditEquity = parseNumeric(content?.taxCreditEquity) ?? 0;
  const gapFinancing = parseNumeric(content?.gapFinancing) ?? 0;
  
  // Build sources
  const sources = [
    { type: content?.loanType ?? "Senior Loan", amount: loanAmountRequested, percentage: 0 },
    { type: "Sponsor Equity", amount: sponsorEquity, percentage: 0 },
    ...(taxCreditEquity > 0 ? [{ type: "Tax Credit Equity", amount: taxCreditEquity, percentage: 0 }] : []),
    ...(gapFinancing > 0 ? [{ type: "Gap Financing", amount: gapFinancing, percentage: 0 }] : [])
  ].filter(s => s.amount > 0);
  
  // Calculate percentages
  const totalSources = sources.reduce((sum, s) => sum + s.amount, 0);
  sources.forEach(source => {
    source.percentage = totalSources > 0 ? (source.amount / totalSources) * 100 : 0;
  });
  
  // Build uses
  const landAcquisition = parseNumeric(content?.landAcquisition) ?? parseNumeric(content?.purchasePrice) ?? 0;
  const baseConstruction = parseNumeric(content?.baseConstruction) ?? 0;
  const contingency = parseNumeric(content?.contingency) ?? 0;
  const constructionFees = parseNumeric(content?.constructionFees) ?? 0;
  const aeFees = parseNumeric(content?.aeFees) ?? 0;
  const developerFee = parseNumeric(content?.developerFee) ?? 0;
  const interestReserve = parseNumeric(content?.interestReserve) ?? 0;
  const workingCapital = parseNumeric(content?.workingCapital) ?? 0;
  const opDeficitEscrow = parseNumeric(content?.opDeficitEscrow) ?? 0;
  const leaseUpEscrow = parseNumeric(content?.leaseUpEscrow) ?? 0;
  const ffe = parseNumeric(content?.ffe) ?? 0;
  const thirdPartyReports = parseNumeric(content?.thirdPartyReports) ?? 0;
  const legalAndOrg = parseNumeric(content?.legalAndOrg) ?? 0;
  const titleAndRecording = parseNumeric(content?.titleAndRecording) ?? 0;
  const taxesDuringConstruction = parseNumeric(content?.taxesDuringConstruction) ?? 0;
  const loanFees = parseNumeric(content?.loanFees) ?? 0;
  const relocationCosts = parseNumeric(content?.relocationCosts) ?? 0;
  const syndicationCosts = parseNumeric(content?.syndicationCosts) ?? 0;
  const enviroRemediation = parseNumeric(content?.enviroRemediation) ?? 0;
  const pfcStructuringFee = parseNumeric(content?.pfcStructuringFee) ?? 0;
  
  const uses = [
    { type: "Land Acquisition", amount: landAcquisition, percentage: 0, timing: "Month 0" },
    { type: "Base Construction", amount: baseConstruction, percentage: 0, timing: "Months 1-24" },
    { type: "Contingency", amount: contingency, percentage: 0, timing: "Months 1-24" },
    { type: "Construction Fees", amount: constructionFees, percentage: 0, timing: "Months 1-24" },
    { type: "A&E Fees", amount: aeFees, percentage: 0, timing: "Months 1-24" },
    { type: "Developer Fee", amount: developerFee, percentage: 0, timing: "Months 1-24" },
    { type: "Interest Reserve", amount: interestReserve, percentage: 0, timing: "Month 0" },
    { type: "Working Capital", amount: workingCapital, percentage: 0, timing: "Month 0" },
    { type: "Op. Deficit Escrow", amount: opDeficitEscrow, percentage: 0, timing: "Month 0" },
    { type: "Lease-Up Escrow", amount: leaseUpEscrow, percentage: 0, timing: "Month 0" },
    { type: "FF&E", amount: ffe, percentage: 0, timing: "Months 1-24" },
    { type: "Third Party Reports", amount: thirdPartyReports, percentage: 0, timing: "Months 1-24" },
    { type: "Legal & Org", amount: legalAndOrg, percentage: 0, timing: "Months 1-24" },
    { type: "Title & Recording", amount: titleAndRecording, percentage: 0, timing: "Months 1-24" },
    { type: "Taxes During Construction", amount: taxesDuringConstruction, percentage: 0, timing: "Months 1-24" },
    { type: "Loan Fees", amount: loanFees, percentage: 0, timing: "Month 0" },
    { type: "Relocation Costs", amount: relocationCosts, percentage: 0, timing: "Months 1-24" },
    { type: "Syndication Costs", amount: syndicationCosts, percentage: 0, timing: "Months 1-24" },
    { type: "Enviro. Remediation", amount: enviroRemediation, percentage: 0, timing: "Months 1-24" },
    { type: "PFC Structuring Fee", amount: pfcStructuringFee, percentage: 0, timing: "Month 0" }
  ].filter(u => u.amount > 0);
  
  // Calculate use percentages
  const totalUses = uses.reduce((sum, u) => sum + u.amount, 0);
  uses.forEach(use => {
    use.percentage = totalUses > 0 ? (use.amount / totalUses) * 100 : 0;
  });
  
  // Build debt terms
  const interestRate = content?.interestRate ?? null;
  const allInRate = content?.allInRate ?? null;
  const rateDisplay = allInRate != null ? `${allInRate}% all-in` : interestRate != null ? `${interestRate}%` : null;
  const floorRate = content?.floorRate != null ? `${content.floorRate}%` : null;
  const requestedTerm = content?.requestedTerm ?? null;
  const extensions = content?.extensions ?? null;
  const recourse = content?.recoursePreference ?? content?.recourse ?? null;
  const originationFee = content?.originationFee ?? (content?.loanFees ? (typeof content.loanFees === 'number' ? `${content.loanFees}%` : content.loanFees) : null);
  const exitFee = content?.exitFee ?? null;
  const taxInsuranceReserve = content?.taxInsuranceReserve ?? null;
  const capExReserve = content?.capExReserve ?? null;
  const interestReserveDisplay = interestReserve > 0 ? formatCurrency(interestReserve) : null;
  const taxInsuranceReserveDisplay = taxInsuranceReserve != null ? formatCurrency(taxInsuranceReserve) : null;
  const capExReserveDisplay = capExReserve != null ? formatCurrency(capExReserve) : null;
  
  const debtTerms = {
    loanType: content?.loanType ?? null,
    lender: content?.lender ?? null,
    rate: rateDisplay,
    floor: floorRate,
    term: requestedTerm != null ? `${requestedTerm} months` : null,
    extension: extensions,
    recourse: recourse,
    origination: originationFee,
    exitFee: exitFee,
    reserves: {
      interest: interestReserveDisplay,
      taxInsurance: taxInsuranceReserveDisplay,
      capEx: capExReserveDisplay
    }
  };
  
  // Build scenario data (base/upside/downside all use same data for now)
  const data = {
    totalCapitalization: totalCapitalization || totalSources,
    sources: sources,
    uses: uses,
    debtTerms: debtTerms
  };
  
  const primaryDebt = sources[0] ?? null;
  const formatPercent = (value: number | null | undefined) =>
    value != null ? `${value}%` : null;
  const formatMillions = (value: number | null | undefined) =>
    value != null ? `$${formatFixed(value / 1_000_000, 1) ?? "0.0"}M` : null;

  useOMPageHeader({
    subtitle: project
      ? "Breakdown of senior debt, equity, and how total capitalization is deployed."
      : undefined,
  });

  if (!project) return <div>Project not found</div>;

  const sourcesChartData = sources.map((source: { type?: string | null; percentage?: number | null }) => ({
    name: source.type ?? null,
    value: source.percentage ?? 0,
  }));

  const usesChartData = uses.map((use: { type?: string | null; percentage?: number | null }) => ({
    name: use.type ?? null,
    value: use.percentage ?? 0,
  }));

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
          value={data?.totalCapitalization ?? null}
          format="currency"
          size="lg"
          dataSourceFields={['total capitalization', 'loan amount requested', 'sponsor equity']}
        />
        <MetricCard
          label="Loan to Cost"
          value={parseNumeric(content?.loanToCost) ?? (primaryDebt?.percentage ?? null)}
          format="percent"
          size="lg"
          dataSourceFields={['loan to cost', 'ltv']}
        />
        <MetricCard
          label="Equity Contribution"
          value={parseNumeric(content?.equityContribution) ?? (primaryDebt?.percentage != null ? 100 - primaryDebt.percentage : null)}
          format="percent"
          size="lg"
          dataSourceFields={['equity contribution', 'sponsor equity']}
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
            {sources.map((source: { type?: string | null; amount?: number | null; percentage?: number | null }, idx: number) => (
              <div
                key={idx}
                className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-800">{source.type}</p>
                  {source.type?.includes('Loan') && rateDisplay && (
                    <p className="text-sm text-gray-600">Rate: {rateDisplay}</p>
                  )}
                  {source.type?.includes('Equity') && (
                    <p className="text-sm text-gray-600">
                      Contribution: Cash & ground lease
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-800">
                    {formatMillions(source.amount)}
                  </p>
                  <p className="text-sm text-gray-600">{formatPercent(source.percentage)}</p>
                </div>
              </div>
            ))}
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
            {uses.map((use: { type?: string | null; timing?: string | null; amount?: number | null; percentage?: number | null }, idx: number) => (
              <div
                key={idx}
                className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-800">{use.type}</p>
                  <p className="text-sm text-gray-600">Timing: {use.timing}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-800">
                    {formatMillions(use.amount)}
                  </p>
                  <p className="text-sm text-gray-600">{formatPercent(use.percentage)}</p>
                </div>
              </div>
            ))}
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
                  {data?.debtTerms?.loanType ?? null}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Lender</p>
                <p className="font-medium text-gray-800">
                  {data?.debtTerms?.lender ?? null}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Rate</p>
                <p className="font-medium text-gray-800">{data?.debtTerms?.rate ?? null}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Floor Rate</p>
                <p className="font-medium text-gray-800">
                  {data?.debtTerms?.floor ?? null}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Term</p>
                <p className="font-medium text-gray-800">{data?.debtTerms?.term ?? null}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Extensions</p>
                <p className="font-medium text-gray-800">
                  {data?.debtTerms?.extension ?? null}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-600">Recourse</p>
                <p className="font-medium text-gray-800">
                  {data?.debtTerms?.recourse ?? null}
                </p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-600">Origination Fee</p>
                <p className="font-medium text-gray-800">
                  {data?.debtTerms?.origination ?? null}
                </p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-600">Exit Fee</p>
                <p className="font-medium text-gray-800">
                  {data?.debtTerms?.exitFee ?? null}
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
                {data?.debtTerms?.reserves?.interest ?? null}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Tax & Insurance</p>
              <p className="font-medium text-gray-800">
                {data?.debtTerms?.reserves?.taxInsurance ?? null}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">CapEx Reserve</p>
              <p className="font-medium text-gray-800">
                {data?.debtTerms?.reserves?.capEx ?? null}
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
                <strong>Risk:</strong> {getOMValue(content, 'capitalRisk1', insights) ?? 'Cost overruns and delays could strain cash flow'}
              </p>
              <p className="text-sm text-green-700 mt-1">
                <strong>Mitigant:</strong> {getOMValue(content, 'capitalMitigant1', insights) ?? 'Fixed-price GMP contract with experienced contractor'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-gray-800">Interest Rate Risk</h4>
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-700">
                <strong>Risk:</strong> {getOMValue(content, 'capitalRisk2', insights) ?? 'Rising SOFR could increase debt service costs'}
              </p>
              <p className="text-sm text-green-700 mt-1">
                <strong>Mitigant:</strong> {getOMValue(content, 'capitalMitigant2', insights) ?? '12-month interest reserve and rate floor protection'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-gray-800">Pre-Leasing Risk</h4>
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-700">
                <strong>Risk:</strong> {getOMValue(content, 'capitalRisk3', insights) ?? 'Insufficient pre-leasing could delay permanent financing'}
              </p>
              <p className="text-sm text-green-700 mt-1">
                <strong>Mitigant:</strong> {getOMValue(content, 'capitalMitigant3', insights) ?? 'Strong market fundamentals and marketing plan'}
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
