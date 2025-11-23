// src/app/project/om/[id]/dashboard/deal-snapshot/capital-stack/page.tsx
"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import { useProjects } from '@/hooks/useProjects';
import { useOMDashboard } from '@/contexts/OMDashboardContext';
import { capitalStackData } from '@/services/mockOMData';
import { MetricCard } from '@/components/om/widgets/MetricCard';
import { MiniChart } from '@/components/om/widgets/MiniChart';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { DollarSign, TrendingUp, FileText, AlertTriangle } from 'lucide-react';

export default function CapitalStackPage() {
  const params = useParams();
  const projectId = params?.id as string;
  const { getProject } = useProjects();
  const project = projectId ? getProject(projectId) : null;
  const { scenario } = useOMDashboard();
  const data = capitalStackData[scenario];

  if (!project) return <div>Project not found</div>;

  const sourcesChartData = data.sources.map((source) => ({
    name: source.type,
    value: source.percentage,
  }));

  const usesChartData = data.uses.map((use) => ({
    name: use.type,
    value: use.percentage,
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-800">Capital Stack</h2>
        <div className="text-sm text-gray-500">
          Current Scenario:{" "}
          <span className="font-medium capitalize">{scenario}</span>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          label="Total Capitalization"
          value={data.totalCapitalization}
          format="currency"
          size="lg"
          dataSourceFields={['total capitalization', 'loan amount requested', 'sponsor equity']}
        />
        <MetricCard
          label="Loan to Cost"
          value={data.sources[0].percentage}
          format="percent"
          size="lg"
          dataSourceFields={['loan to cost', 'ltv']}
        />
        <MetricCard
          label="Equity Contribution"
          value={100 - data.sources[0].percentage}
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
            {data.sources.map((source, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-800">{source.type}</p>
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
                    ${(source.amount / 1000000).toFixed(1)}M
                  </p>
                  <p className="text-sm text-gray-600">{source.percentage}%</p>
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
            {data.uses.map((use, idx) => (
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
                    ${(use.amount / 1000000).toFixed(1)}M
                  </p>
                  <p className="text-sm text-gray-600">{use.percentage}%</p>
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
                {data.debtTerms.loanType}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Lender</p>
              <p className="font-medium text-gray-800">
                {data.debtTerms.lender}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Rate</p>
              <p className="font-medium text-gray-800">{data.debtTerms.rate}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">Floor Rate</p>
              <p className="font-medium text-gray-800">
                {data.debtTerms.floor}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">Term</p>
              <p className="font-medium text-gray-800">{data.debtTerms.term}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">Extensions</p>
              <p className="font-medium text-gray-800">
                {data.debtTerms.extension}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-gray-600">Recourse</p>
              <p className="font-medium text-gray-800">
                {data.debtTerms.recourse}
              </p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-gray-600">Origination Fee</p>
              <p className="font-medium text-gray-800">
                {data.debtTerms.origination}
              </p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-gray-600">Exit Fee</p>
              <p className="font-medium text-gray-800">
                {data.debtTerms.exitFee}
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
                {data.debtTerms.reserves.interest}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Tax & Insurance</p>
              <p className="font-medium text-gray-800">
                {data.debtTerms.reserves.taxInsurance}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">CapEx Reserve</p>
              <p className="font-medium text-gray-800">
                {data.debtTerms.reserves.capEx}
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
                <strong>Risk:</strong> Cost overruns and delays could strain
                cash flow
              </p>
              <p className="text-sm text-green-700 mt-1">
                <strong>Mitigant:</strong> Fixed-price GMP contract with
                experienced contractor
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-gray-800">Interest Rate Risk</h4>
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-700">
                <strong>Risk:</strong> Rising SOFR could increase debt service
                costs
              </p>
              <p className="text-sm text-green-700 mt-1">
                <strong>Mitigant:</strong> 12-month interest reserve and rate
                floor protection
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-gray-800">Pre-Leasing Risk</h4>
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-700">
                <strong>Risk:</strong> Insufficient pre-leasing could delay
                permanent financing
              </p>
              <p className="text-sm text-green-700 mt-1">
                <strong>Mitigant:</strong> Strong market fundamentals and
                marketing plan
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-gray-800">Exit Strategy Risk</h4>
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-700">
                <strong>Risk:</strong> Market conditions may not support target
                exit cap rate
              </p>
              <p className="text-sm text-green-700 mt-1">
                <strong>Mitigant:</strong> Multiple exit strategies (sale,
                refinance, hold)
              </p>
            </div>
          </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
