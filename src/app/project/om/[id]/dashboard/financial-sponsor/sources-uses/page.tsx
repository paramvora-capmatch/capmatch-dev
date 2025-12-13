"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingDown, PieChart } from "lucide-react";
import { useOMPageHeader } from "@/hooks/useOMPageHeader";
import { useOmContent } from "@/hooks/useOmContent";
import { formatCurrency, formatPercentage, parseNumeric, formatLocale } from "@/lib/om-utils";

export default function SourcesUsesPage() {
  const { content } = useOmContent();
  
  // Extract equity committed percent
  const equityCommittedPercent = parseNumeric(content?.equityCommittedPercent) ?? null;

  // Build sources & uses from flat fields
  const sources = [
    { type: "Senior Debt", amount: content?.loanAmountRequested ?? 0 },
    { type: "Sponsor Equity", amount: content?.sponsorEquity ?? 0 },
    { type: "Tax Credit Equity", amount: content?.taxCreditEquity ?? 0 },
    { type: "Gap Financing", amount: content?.gapFinancing ?? 0 },
  ].filter(s => s.amount > 0).map(source => ({
    ...source,
    percentage: 0, // Will be calculated below
  }));
  
  const uses = [
    { type: "Land Acquisition", amount: content?.landAcquisition ?? content?.purchasePrice ?? 0 },
    { type: "Base Construction", amount: content?.baseConstruction ?? 0 },
    { type: "Contingency", amount: content?.contingency ?? 0 },
    { type: "Construction Fees", amount: content?.constructionFees ?? 0 },
    { type: "A&E Fees", amount: content?.aeFees ?? 0 },
    { type: "Developer Fee", amount: content?.developerFee ?? 0 },
    { type: "Interest Reserve", amount: content?.interestReserve ?? 0 },
    { type: "Working Capital", amount: content?.workingCapital ?? 0 },
    { type: "Op. Deficit Escrow", amount: content?.opDeficitEscrow ?? 0 },
  ].filter(u => u.amount > 0).map(use => ({
    ...use,
    percentage: 0, // Will be calculated below
  }));

  const totalSources = sources.reduce(
    (sum: number, source: { amount?: number | null }) => sum + (source.amount ?? 0),
    0
  );
  const totalUses = uses.reduce(
    (sum: number, use: { amount?: number | null }) => sum + (use.amount ?? 0),
    0
  );

  // Calculate percentages (rounded to 2 decimal places)
  sources.forEach(source => {
    const rawPercentage = totalSources > 0 ? (source.amount ?? 0) / totalSources * 100 : 0;
    source.percentage = Math.round(rawPercentage * 100) / 100; // Round to 2 decimal places
  });
  uses.forEach(use => {
    const rawPercentage = totalUses > 0 ? (use.amount ?? 0) / totalUses * 100 : 0;
    use.percentage = Math.round(rawPercentage * 100) / 100; // Round to 2 decimal places
  });

  const primaryDebtSource =
    (sources.find((source: { type?: string | null }) =>
      /debt|loan/i.test((source.type ?? "").toLowerCase())
    ) ?? sources[0]) ?? null;
  const leveragePercent = formatPercentage(primaryDebtSource?.amount, totalSources, 2);

  useOMPageHeader({
    subtitle: "Detailed breakdown of capital sources and where funds are deployed.",
  });

  return (
    <div className="space-y-6">

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2" dataSourceSection="sources & uses">
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 text-blue-500 mr-2" />
              <h3 className="text-lg font-semibold">Total Sources</h3>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
              {formatCurrency(totalSources)}
            </p>
            <p className="text-sm text-gray-500 mt-1">Capital raised</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2" dataSourceSection="sources & uses">
            <div className="flex items-center">
              <TrendingDown className="h-5 w-5 text-green-500 mr-2" />
              <h3 className="text-lg font-semibold">Total Uses</h3>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(totalUses)}
            </p>
            <p className="text-sm text-gray-500 mt-1">Capital deployed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2" dataSourceFields={['leverage', 'ltv']}>
            <div className="flex items-center">
              <PieChart className="h-5 w-5 text-blue-500 mr-2" />
              <h3 className="text-lg font-semibold">Leverage</h3>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
              {leveragePercent != null ? `${leveragePercent}%` : null}
            </p>
            <p className="text-sm text-gray-500 mt-1">Debt to total capital</p>
          </CardContent>
        </Card>
      </div>

      {/* Sources of Capital */}
      <Card>
        <CardHeader dataSourceSection="capital stack">
          <h3 className="text-xl font-semibold">Sources of Capital</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sources.map((source: { type?: string | null; amount?: number | null; percentage?: number | null }, index: number) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {source.type}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      {formatCurrency(source.amount)}
                    </span>
                    <Badge className="bg-blue-100 text-blue-800">
                      {source.percentage != null ? `${source.percentage.toFixed(2)}%` : null}
                    </Badge>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="h-3 rounded-full bg-blue-500"
                    style={{ width: `${source.percentage ?? 0}%` }}
                  />
                </div>
              </div>
            ))}

            {equityCommittedPercent != null && (
              <div className="pt-2">
                <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                  <span className="text-sm font-medium text-blue-700">Equity Committed</span>
                  <Badge className="bg-blue-100 text-blue-800">
                    {equityCommittedPercent}%
                  </Badge>
                </div>
              </div>
            )}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-900">
                  Total Sources
                </span>
                <Badge className="bg-blue-100 text-blue-800">
                  {formatCurrency(totalSources)}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Uses of Capital */}
      <Card>
        <CardHeader dataSourceSection="sources & uses">
          <h3 className="text-xl font-semibold">Uses of Capital</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {uses.map((use: { type?: string | null; amount?: number | null; percentage?: number | null }, index: number) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {use.type}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      {formatCurrency(use.amount)}
                    </span>
                    <Badge className="bg-green-100 text-green-800">
                      {use.percentage != null ? `${use.percentage.toFixed(2)}%` : null}
                    </Badge>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="h-3 rounded-full bg-green-500"
                    style={{ width: `${use.percentage ?? 0}%` }}
                  />
                </div>
              </div>
            ))}

            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-900">
                  Total Uses
                </span>
                <Badge className="bg-green-100 text-green-800">
                  {formatCurrency(totalUses)}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Waterfall Chart */}
      <Card>
        <CardHeader dataSourceSection="sources & uses">
          <h3 className="text-xl font-semibold">Capital Flow Waterfall</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Sources Waterfall */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">
                Capital Sources
              </h4>
              <div className="space-y-4">
                {sources.map((source: { type?: string | null; amount?: number | null; percentage?: number | null }, index: number) => {
                  const sourceTotal = totalSources || 1;
                  const heightPercent = ((source.amount ?? 0) / sourceTotal) * 100;
                  const cumulativePercent = sources
                    .slice(0, index)
                    .reduce((sum: number, s: { amount?: number | null }) => sum + ((s.amount ?? 0) / sourceTotal * 100), 0);

                  return (
                    <div key={index} className="flex items-center space-x-4">
                      <div className="w-40 text-sm font-medium text-gray-700">
                        {source.type}
                      </div>
                      <div className="flex-1 relative">
                        <div className="relative h-12 bg-gray-100 rounded border-2 border-gray-200 overflow-hidden">
                          <div
                            className="absolute bottom-0 left-0 bg-blue-500 rounded transition-all duration-300 flex items-center justify-center"
                            style={{
                              width: `${heightPercent}%`,
                              height: '100%',
                              left: `${cumulativePercent}%`,
                            }}
                          >
                            {heightPercent > 10 && (
                              <span className="text-white font-semibold text-xs px-2">
                                {source.percentage != null ? `${source.percentage.toFixed(1)}%` : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="w-32 text-right">
                        <div className="text-sm font-semibold text-gray-800">
                          {formatCurrency(source.amount)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {source.percentage != null ? `${source.percentage.toFixed(2)}%` : '0%'}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex items-center space-x-4">
                    <div className="w-40 text-sm font-semibold text-gray-900">
                      Total Sources
                    </div>
                    <div className="flex-1">
                      <div className="h-12 bg-blue-600 rounded border-2 border-blue-700 flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {formatCurrency(totalSources)}
                        </span>
                      </div>
                    </div>
                    <div className="w-32 text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrency(totalSources)}
                      </div>
                      <div className="text-xs text-gray-500">100%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Uses Waterfall */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Capital Uses</h4>
              <div className="space-y-4">
                {uses.map((use: { type?: string | null; amount?: number | null; percentage?: number | null }, index: number) => {
                  const usesTotal = totalUses || 1;
                  const heightPercent = ((use.amount ?? 0) / usesTotal) * 100;
                  const cumulativePercent = uses
                    .slice(0, index)
                    .reduce((sum: number, u: { amount?: number | null }) => sum + ((u.amount ?? 0) / usesTotal * 100), 0);

                  return (
                    <div key={index} className="flex items-center space-x-4">
                      <div className="w-40 text-sm font-medium text-gray-700">
                        {use.type}
                      </div>
                      <div className="flex-1 relative">
                        <div className="relative h-12 bg-gray-100 rounded border-2 border-gray-200 overflow-hidden">
                          <div
                            className="absolute bottom-0 left-0 bg-green-500 rounded transition-all duration-300 flex items-center justify-center"
                            style={{
                              width: `${heightPercent}%`,
                              height: '100%',
                              left: `${cumulativePercent}%`,
                            }}
                          >
                            {heightPercent > 10 && (
                              <span className="text-white font-semibold text-xs px-2">
                                {use.percentage != null ? `${use.percentage.toFixed(1)}%` : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="w-32 text-right">
                        <div className="text-sm font-semibold text-gray-800">
                          {formatCurrency(use.amount)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {use.percentage != null ? `${use.percentage.toFixed(2)}%` : '0%'}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex items-center space-x-4">
                    <div className="w-40 text-sm font-semibold text-gray-900">
                      Total Uses
                    </div>
                    <div className="flex-1">
                      <div className="h-12 bg-green-600 rounded border-2 border-green-700 flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {formatCurrency(totalUses)}
                        </span>
                      </div>
                    </div>
                    <div className="w-32 text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrency(totalUses)}
                      </div>
                      <div className="text-xs text-gray-500">100%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Capital Structure Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader dataSourceSection="capital stack">
            <h3 className="text-xl font-semibold">Capital Structure</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sources.map((source: { type?: string | null; amount?: number | null }, index: number) => (
                <div key={`source-${index}`} className="flex justify-between items-center">
                  <span className="text-gray-600">{source.type ?? null}</span>
                  <Badge className="bg-blue-50 text-blue-800">
                    {formatPercentage(source.amount, totalSources, 2) != null
                      ? `${formatPercentage(source.amount, totalSources, 2)}%`
                      : null}
                  </Badge>
                </div>
              ))}

              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900">
                    Total Capital
                  </span>
                  <Badge className="bg-gray-100 text-gray-800">
                    {formatCurrency(totalSources)}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader dataSourceSection="sources & uses">
            <h3 className="text-xl font-semibold">Investment Allocation</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...uses]
                .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))
                .slice(0, 3)
                .map((use, index) => (
                  <div key={`use-${index}`} className="flex justify-between items-center">
                    <span className="text-gray-600">{use.type ?? null}</span>
                    <Badge className="bg-green-50 text-green-800">
                      {formatPercentage(use.amount, totalUses, 2) != null
                        ? `${formatPercentage(use.amount, totalUses, 2)}%`
                        : null}
                    </Badge>
                  </div>
                ))}

              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900">
                    Total Investment
                  </span>
                  <Badge className="bg-gray-100 text-gray-800">
                    {formatCurrency(totalUses)}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operating Expenses */}
      {(content?.realEstateTaxes != null || content?.insurance != null || content?.utilitiesCosts != null || 
        content?.repairsAndMaintenance != null || content?.managementFee != null || content?.generalAndAdmin != null ||
        content?.payroll != null || content?.reserves != null || content?.marketingLeasing != null || 
        content?.serviceCoordination != null) && (
        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold">Operating Expenses (Proforma)</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {content?.realEstateTaxes != null && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Real Estate Taxes</p>
                  <p className="text-lg font-semibold text-gray-800">${formatLocale(content.realEstateTaxes)}</p>
                </div>
              )}
              {content?.insurance != null && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Insurance</p>
                  <p className="text-lg font-semibold text-gray-800">${formatLocale(content.insurance)}</p>
                </div>
              )}
              {content?.utilitiesCosts != null && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Utilities</p>
                  <p className="text-lg font-semibold text-gray-800">${formatLocale(content.utilitiesCosts)}</p>
                </div>
              )}
              {content?.repairsAndMaintenance != null && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Repairs & Maintenance</p>
                  <p className="text-lg font-semibold text-gray-800">${formatLocale(content.repairsAndMaintenance)}</p>
                </div>
              )}
              {content?.managementFee != null && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Management Fee</p>
                  <p className="text-lg font-semibold text-gray-800">${formatLocale(content.managementFee)}</p>
                </div>
              )}
              {content?.generalAndAdmin != null && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">General & Administrative</p>
                  <p className="text-lg font-semibold text-gray-800">${formatLocale(content.generalAndAdmin)}</p>
                </div>
              )}
              {content?.payroll != null && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Payroll</p>
                  <p className="text-lg font-semibold text-gray-800">${formatLocale(content.payroll)}</p>
                </div>
              )}
              {content?.reserves != null && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Reserves</p>
                  <p className="text-lg font-semibold text-gray-800">${formatLocale(content.reserves)}</p>
                </div>
              )}
              {content?.marketingLeasing != null && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Marketing/Leasing</p>
                  <p className="text-lg font-semibold text-gray-800">${formatLocale(content.marketingLeasing)}</p>
                </div>
              )}
              {content?.serviceCoordination != null && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Service Coordination</p>
                  <p className="text-lg font-semibold text-gray-800">${formatLocale(content.serviceCoordination)}</p>
                </div>
              )}
            </div>
            {(content?.realEstateTaxes != null || content?.insurance != null || content?.utilitiesCosts != null || 
              content?.repairsAndMaintenance != null || content?.managementFee != null || content?.generalAndAdmin != null ||
              content?.payroll != null || content?.reserves != null || content?.marketingLeasing != null || 
              content?.serviceCoordination != null) && (
              content?.totalOperatingExpenses != null && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">Total Operating Expenses</span>
                    <Badge className="bg-gray-100 text-gray-800">
                      ${formatLocale(parseNumeric(content.totalOperatingExpenses))}
                    </Badge>
                  </div>
                </div>
              )
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
