"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingDown, PieChart } from "lucide-react";
import { useOMPageHeader } from "@/hooks/useOMPageHeader";
import { useOmContent } from "@/hooks/useOmContent";
import { formatCurrency, formatPercentage, parseNumeric, formatLocale } from "@/lib/om-utils";

// Component to show missing values in red
const MissingValue = ({ children }: { children: React.ReactNode }) => (
  <span className="text-red-600 font-medium">{children}</span>
);

export default function SourcesUsesPage() {
  const { content } = useOmContent();
  
  // Extract equity committed percent
  const equityCommittedPercent = parseNumeric(content?.equityCommittedPercent) ?? null;

  // Build sources & uses from flat fields with parseNumeric
  const sourcesRaw = [
    { type: "Senior Debt", amount: parseNumeric(content?.loanAmountRequested) ?? null },
    { type: "Sponsor Equity", amount: parseNumeric(content?.sponsorEquity) ?? null },
    { type: "Tax Credit Equity", amount: parseNumeric(content?.taxCreditEquity) ?? null },
    { type: "Gap Financing", amount: parseNumeric(content?.gapFinancing) ?? null },
  ];
  
  // Use hardcoded values if all sources are missing
  const hasAnySource = sourcesRaw.some(s => s.amount != null && s.amount > 0);
  const sources = (hasAnySource 
    ? sourcesRaw.filter(s => s.amount != null && s.amount > 0)
    : [
        { type: "Senior Debt", amount: 18000000 },
        { type: "Sponsor Equity", amount: 11800000 },
      ]
  ).map(source => ({
    ...source,
    amount: source.amount ?? 0,
    percentage: 0, // Will be calculated below
    isHardcoded: !hasAnySource || source.amount == null,
  }));
  
  const usesRaw = [
    { type: "Land Acquisition", amount: parseNumeric(content?.landAcquisition) ?? parseNumeric(content?.purchasePrice) ?? null },
    { type: "Base Construction", amount: parseNumeric(content?.baseConstruction) ?? null },
    { type: "Contingency", amount: parseNumeric(content?.contingency) ?? null },
    { type: "Construction Fees", amount: parseNumeric(content?.constructionFees) ?? null },
    { type: "A&E Fees", amount: parseNumeric(content?.aeFees) ?? null },
    { type: "Developer Fee", amount: parseNumeric(content?.developerFee) ?? null },
    { type: "Interest Reserve", amount: parseNumeric(content?.interestReserve) ?? null },
    { type: "Working Capital", amount: parseNumeric(content?.workingCapital) ?? null },
    { type: "Op. Deficit Escrow", amount: parseNumeric(content?.opDeficitEscrow) ?? null },
  ];
  
  // Use hardcoded values if all uses are missing
  const hasAnyUse = usesRaw.some(u => u.amount != null && u.amount > 0);
  const uses = (hasAnyUse
    ? usesRaw.filter(u => u.amount != null && u.amount > 0)
    : [
        { type: "Land Acquisition", amount: 6000000 },
        { type: "Base Construction", amount: 16950000 },
        { type: "Contingency", amount: 847500 },
        { type: "A&E Fees", amount: 859800 },
        { type: "Developer Fee", amount: 678000 },
        { type: "Interest Reserve", amount: 1147500 },
        { type: "Working Capital", amount: 1900000 },
        { type: "Op. Deficit Escrow", amount: 650000 },
      ]
  ).map(use => ({
    ...use,
    amount: use.amount ?? 0,
    percentage: 0, // Will be calculated below
    isHardcoded: !hasAnyUse || use.amount == null,
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
              {totalSources > 0 ? (
                formatCurrency(totalSources)
              ) : (
                <MissingValue>{formatCurrency(29800000)}</MissingValue>
              )}
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
              {totalUses > 0 ? (
                formatCurrency(totalUses)
              ) : (
                <MissingValue>{formatCurrency(29800000)}</MissingValue>
              )}
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
              {leveragePercent != null ? `${leveragePercent}%` : <MissingValue>60.4%</MissingValue>}
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
            {sources.map((source: { type?: string | null; amount?: number | null; percentage?: number | null; isHardcoded?: boolean }, index: number) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {source.type}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm ${source.isHardcoded ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                      {source.isHardcoded ? (
                        <MissingValue>{formatCurrency(source.amount)}</MissingValue>
                      ) : (
                        formatCurrency(source.amount)
                      )}
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

            <div className="pt-2">
              <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                <span className="text-sm font-medium text-blue-700">Equity Committed</span>
                <Badge className="bg-blue-100 text-blue-800">
                  {equityCommittedPercent != null ? (
                    `${equityCommittedPercent}%`
                  ) : (
                    <MissingValue>39.6%</MissingValue>
                  )}
                </Badge>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-900">
                  Total Sources
                </span>
                <Badge className="bg-blue-100 text-blue-800">
                  {totalSources > 0 ? (
                    formatCurrency(totalSources)
                  ) : (
                    <MissingValue>{formatCurrency(29800000)}</MissingValue>
                  )}
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
            {uses.map((use: { type?: string | null; amount?: number | null; percentage?: number | null; isHardcoded?: boolean }, index: number) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {use.type}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm ${use.isHardcoded ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                      {use.isHardcoded ? (
                        <MissingValue>{formatCurrency(use.amount)}</MissingValue>
                      ) : (
                        formatCurrency(use.amount)
                      )}
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
                  {totalUses > 0 ? (
                    formatCurrency(totalUses)
                  ) : (
                    <MissingValue>{formatCurrency(29800000)}</MissingValue>
                  )}
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
          <div className="space-y-8">
            {/* Sources Waterfall */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">
                Capital Sources
              </h4>
              <div className="space-y-4">
                {sources.map((source: { type?: string | null; amount?: number | null; percentage?: number | null; isHardcoded?: boolean }, index: number) => {
                  const sourceTotal = totalSources || 1;
                  const widthPercent = sourceTotal > 0 ? ((source.amount ?? 0) / sourceTotal) * 100 : 0;
                  const previousAmount = sources
                    .slice(0, index)
                    .reduce((sum: number, s: { amount?: number | null }) => sum + (s.amount ?? 0), 0);
                  const leftPercent = sourceTotal > 0 ? (previousAmount / sourceTotal) * 100 : 0;

                  return (
                    <div key={index} className="flex items-center gap-4">
                      <div className="w-32 text-sm font-medium text-gray-700 flex-shrink-0">
                        {source.type}
                      </div>
                      <div className="flex-1 relative h-12 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                        <div
                          className="absolute top-0 left-0 h-full bg-blue-500 rounded-lg transition-all duration-300 flex items-center px-3"
                          style={{
                            width: `${widthPercent}%`,
                            left: `${leftPercent}%`,
                          }}
                        >
                          {widthPercent > 15 && (
                            <span className="text-white font-medium text-sm whitespace-nowrap">
                              {formatCurrency(source.amount)}
                            </span>
                          )}
                        </div>
                        {widthPercent <= 15 && (
                          <div className="absolute inset-0 flex items-center px-3">
                            <span className={`text-sm font-medium ${source.isHardcoded ? 'text-red-600' : 'text-gray-700'}`}>
                              {source.isHardcoded ? (
                                <MissingValue>{formatCurrency(source.amount)}</MissingValue>
                              ) : (
                                formatCurrency(source.amount)
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="w-24 text-right flex-shrink-0">
                        <div className={`text-sm font-semibold ${source.isHardcoded ? 'text-red-600' : 'text-gray-900'}`}>
                          {source.isHardcoded ? (
                            <MissingValue>{formatCurrency(source.amount)}</MissingValue>
                          ) : (
                            formatCurrency(source.amount)
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {source.percentage != null ? `${source.percentage.toFixed(2)}%` : '0%'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Uses Waterfall */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Capital Uses</h4>
              <div className="space-y-4">
                {uses.map((use: { type?: string | null; amount?: number | null; percentage?: number | null; isHardcoded?: boolean }, index: number) => {
                  const usesTotal = totalUses || 1;
                  const widthPercent = usesTotal > 0 ? ((use.amount ?? 0) / usesTotal) * 100 : 0;
                  const previousAmount = uses
                    .slice(0, index)
                    .reduce((sum: number, u: { amount?: number | null }) => sum + (u.amount ?? 0), 0);
                  const leftPercent = usesTotal > 0 ? (previousAmount / usesTotal) * 100 : 0;

                  return (
                    <div key={index} className="flex items-center gap-4">
                      <div className="w-32 text-sm font-medium text-gray-700 flex-shrink-0">
                        {use.type}
                      </div>
                      <div className="flex-1 relative h-12 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                        <div
                          className="absolute top-0 left-0 h-full bg-green-500 rounded-lg transition-all duration-300 flex items-center px-3"
                          style={{
                            width: `${widthPercent}%`,
                            left: `${leftPercent}%`,
                          }}
                        >
                          {widthPercent > 15 && (
                            <span className="text-white font-medium text-sm whitespace-nowrap">
                              {formatCurrency(use.amount)}
                            </span>
                          )}
                        </div>
                        {widthPercent <= 15 && (
                          <div className="absolute inset-0 flex items-center px-3">
                            <span className={`text-sm font-medium ${use.isHardcoded ? 'text-red-600' : 'text-gray-700'}`}>
                              {use.isHardcoded ? (
                                <MissingValue>{formatCurrency(use.amount)}</MissingValue>
                              ) : (
                                formatCurrency(use.amount)
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="w-24 text-right flex-shrink-0">
                        <div className={`text-sm font-semibold ${use.isHardcoded ? 'text-red-600' : 'text-gray-900'}`}>
                          {use.isHardcoded ? (
                            <MissingValue>{formatCurrency(use.amount)}</MissingValue>
                          ) : (
                            formatCurrency(use.amount)
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {use.percentage != null ? `${use.percentage.toFixed(2)}%` : '0%'}
                        </div>
                      </div>
                    </div>
                  );
                })}
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
              {sources.map((source: { type?: string | null; amount?: number | null; isHardcoded?: boolean }, index: number) => {
                const percentage = formatPercentage(source.amount, totalSources, 2);
                return (
                  <div key={`source-${index}`} className="flex justify-between items-center">
                    <span className="text-gray-600">{source.type ?? null}</span>
                    <Badge className="bg-blue-50 text-blue-800">
                      {percentage != null ? (
                        source.isHardcoded ? (
                          <MissingValue>{percentage}%</MissingValue>
                        ) : (
                          `${percentage}%`
                        )
                      ) : null}
                    </Badge>
                  </div>
                );
              })}

              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900">
                    Total Capital
                  </span>
                  <Badge className="bg-gray-100 text-gray-800">
                    {totalSources > 0 ? (
                      formatCurrency(totalSources)
                    ) : (
                      <MissingValue>{formatCurrency(29800000)}</MissingValue>
                    )}
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
                .map((use, index) => {
                  const percentage = formatPercentage(use.amount, totalUses, 2);
                  return (
                    <div key={`use-${index}`} className="flex justify-between items-center">
                      <span className="text-gray-600">{use.type ?? null}</span>
                      <Badge className="bg-green-50 text-green-800">
                        {percentage != null ? (
                          use.isHardcoded ? (
                            <MissingValue>{percentage}%</MissingValue>
                          ) : (
                            `${percentage}%`
                          )
                        ) : null}
                      </Badge>
                    </div>
                  );
                })}

              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900">
                    Total Investment
                  </span>
                  <Badge className="bg-gray-100 text-gray-800">
                    {totalUses > 0 ? (
                      formatCurrency(totalUses)
                    ) : (
                      <MissingValue>{formatCurrency(29800000)}</MissingValue>
                    )}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operating Expenses */}
      <Card>
        <CardHeader>
          <h3 className="text-xl font-semibold">Operating Expenses (Proforma)</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(() => {
              const realEstateTaxes = parseNumeric(content?.realEstateTaxes);
              return (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Real Estate Taxes</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {realEstateTaxes != null ? `$${formatLocale(realEstateTaxes)}` : <MissingValue>$125,000</MissingValue>}
                  </p>
                </div>
              );
            })()}
            {(() => {
              const insurance = parseNumeric(content?.insurance);
              return (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Insurance</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {insurance != null ? `$${formatLocale(insurance)}` : <MissingValue>$45,000</MissingValue>}
                  </p>
                </div>
              );
            })()}
            {(() => {
              const utilitiesCosts = parseNumeric(content?.utilitiesCosts);
              return (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Utilities</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {utilitiesCosts != null ? `$${formatLocale(utilitiesCosts)}` : <MissingValue>$85,000</MissingValue>}
                  </p>
                </div>
              );
            })()}
            {(() => {
              const repairsAndMaintenance = parseNumeric(content?.repairsAndMaintenance);
              return (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Repairs & Maintenance</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {repairsAndMaintenance != null ? `$${formatLocale(repairsAndMaintenance)}` : <MissingValue>$95,000</MissingValue>}
                  </p>
                </div>
              );
            })()}
            {(() => {
              const managementFee = parseNumeric(content?.managementFee);
              return (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Management Fee</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {managementFee != null ? `$${formatLocale(managementFee)}` : <MissingValue>$180,000</MissingValue>}
                  </p>
                </div>
              );
            })()}
            {(() => {
              const generalAndAdmin = parseNumeric(content?.generalAndAdmin);
              return (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">General & Administrative</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {generalAndAdmin != null ? `$${formatLocale(generalAndAdmin)}` : <MissingValue>$65,000</MissingValue>}
                  </p>
                </div>
              );
            })()}
            {(() => {
              const payroll = parseNumeric(content?.payroll);
              return (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Payroll</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {payroll != null ? `$${formatLocale(payroll)}` : <MissingValue>$120,000</MissingValue>}
                  </p>
                </div>
              );
            })()}
            {(() => {
              const reserves = parseNumeric(content?.reserves);
              return (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Reserves</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {reserves != null ? `$${formatLocale(reserves)}` : <MissingValue>$75,000</MissingValue>}
                  </p>
                </div>
              );
            })()}
            {(() => {
              const marketingLeasing = parseNumeric(content?.marketingLeasing);
              return (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Marketing/Leasing</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {marketingLeasing != null ? `$${formatLocale(marketingLeasing)}` : <MissingValue>$55,000</MissingValue>}
                  </p>
                </div>
              );
            })()}
            {(() => {
              const serviceCoordination = parseNumeric(content?.serviceCoordination);
              return (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Service Coordination</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {serviceCoordination != null ? `$${formatLocale(serviceCoordination)}` : <MissingValue>$40,000</MissingValue>}
                  </p>
                </div>
              );
            })()}
          </div>
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-900">Total Operating Expenses</span>
              <Badge className="bg-gray-100 text-gray-800">
                {(() => {
                  const total = 
                    (parseNumeric(content?.realEstateTaxes) ?? 0) +
                    (parseNumeric(content?.insurance) ?? 0) +
                    (parseNumeric(content?.utilitiesCosts) ?? 0) +
                    (parseNumeric(content?.repairsAndMaintenance) ?? 0) +
                    (parseNumeric(content?.managementFee) ?? 0) +
                    (parseNumeric(content?.generalAndAdmin) ?? 0) +
                    (parseNumeric(content?.payroll) ?? 0) +
                    (parseNumeric(content?.reserves) ?? 0) +
                    (parseNumeric(content?.marketingLeasing) ?? 0) +
                    (parseNumeric(content?.serviceCoordination) ?? 0);
                  const hasAnyExpense = 
                    parseNumeric(content?.realEstateTaxes) != null ||
                    parseNumeric(content?.insurance) != null ||
                    parseNumeric(content?.utilitiesCosts) != null ||
                    parseNumeric(content?.repairsAndMaintenance) != null ||
                    parseNumeric(content?.managementFee) != null ||
                    parseNumeric(content?.generalAndAdmin) != null ||
                    parseNumeric(content?.payroll) != null ||
                    parseNumeric(content?.reserves) != null ||
                    parseNumeric(content?.marketingLeasing) != null ||
                    parseNumeric(content?.serviceCoordination) != null;
                  
                  if (hasAnyExpense && total > 0) {
                    return `$${formatLocale(total)}`;
                  } else {
                    return <MissingValue>$885,000</MissingValue>;
                  }
                })()}
              </Badge>
            </div>
          </div>
        </CardContent>
        </Card>
    </div>
  );
}
