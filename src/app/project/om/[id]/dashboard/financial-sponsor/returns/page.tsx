"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import ReturnsCharts from "@/components/om/ReturnsCharts";
import { useOMPageHeader } from "@/hooks/useOMPageHeader";
import { useOmContent } from "@/hooks/useOmContent";
import { parseNumeric, formatLocale, formatFixed } from "@/lib/om-utils";

export default function ReturnsPage() {
  const { content, insights } = useOmContent();
  
  // Build return projections from flat fields
  const baseIRR = parseNumeric(content?.irr) ?? null;
  const baseEquityMultiple = parseNumeric(content?.equityMultiple) ?? null;
  const stabilizedValue = parseNumeric(content?.stabilizedValue) ?? null;
  const totalDevCost = parseNumeric(content?.totalDevelopmentCost) ?? null;
  
  // Extract NOI/yield fields
  const propertyNoiT12 = parseNumeric(content?.propertyNoiT12) ?? null;
  const trendedNOIYear1 = parseNumeric(content?.trendedNOIYear1) ?? null;
  const untrendedNOIYear1 = parseNumeric(content?.untrendedNOIYear1) ?? null;
  const trendedYield = parseNumeric(content?.trendedYield) ?? null;
  const untrendedYield = parseNumeric(content?.untrendedYield) ?? null;
  const inflationAssumption = parseNumeric(content?.inflationAssumption) ?? null;
  const dscrStressTest = parseNumeric(content?.dscrStressTest) ?? null;
  const exitStrategy = content?.exitStrategy ?? null;
  const expectedHoldPeriod = parseNumeric(content?.expectedHoldPeriod) ?? null;
  const businessPlanSummary = content?.businessPlanSummary ?? null;
  
  const baseProfitMargin = (stabilizedValue && totalDevCost) 
    ? ((stabilizedValue - totalDevCost) / totalDevCost) * 100 
    : null;
  
  // Read risk levels from content (calculated in resume)
  const upsideRisk = content?.riskLevelUpside ?? null;
  const baseRisk = content?.riskLevelBase ?? null;
  const downsideRisk = content?.riskLevelDownside ?? null;
  
  // Use calculated values from content
  const upsideScenario = {
    irr: content?.upsideIRR ?? null,
    multiple: content?.upsideEquityMultiple ?? null,
    profitMargin: content?.upsideProfitMargin ?? null,
  };
  const baseScenario = {
    irr: baseIRR,
    multiple: baseEquityMultiple,
    profitMargin: baseProfitMargin,
  };
  const downsideScenario = {
    irr: content?.downsideIRR ?? null,
    multiple: content?.downsideEquityMultiple ?? null,
    profitMargin: content?.downsideProfitMargin ?? null,
  };

  const getIRRColor = (irr?: number | null) => {
    if (irr == null || Number.isNaN(irr)) return "bg-red-100 text-red-800";
    if (irr >= 25) return "bg-green-100 text-green-800";
    if (irr >= 20) return "bg-blue-100 text-blue-800";
    if (irr >= 15) return "bg-green-100 text-green-800";
    return "bg-red-100 text-red-800";
  };

  const getMultipleColor = (multiple?: number | null) => {
    if (multiple == null || Number.isNaN(multiple)) return "bg-red-100 text-red-800";
    if (multiple >= 2.5) return "bg-green-100 text-green-800";
    if (multiple >= 2.0) return "bg-blue-100 text-blue-800";
    if (multiple >= 1.5) return "bg-green-100 text-green-800";
    return "bg-red-100 text-red-800";
  };

  const getProfitMarginColor = (margin?: number | null) => {
    if (margin == null || Number.isNaN(margin)) return "bg-red-100 text-red-800";
    if (margin >= 30) return "bg-green-100 text-green-800";
    if (margin >= 25) return "bg-blue-100 text-blue-800";
    if (margin >= 20) return "bg-green-100 text-green-800";
    return "bg-red-100 text-red-800";
  };

  useOMPageHeader({
    subtitle: "Scenario IRRs, equity multiples, and sensitivity testing.",
  });

  return (
    <div className="space-y-6">

      {/* Scenario Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-800">
                Upside Scenario
              </h3>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {upsideScenario?.irr != null ? `${formatFixed(upsideScenario.irr, 2)}%` : null}
            </p>
            <p className="text-sm text-gray-500 mt-1">Projected IRR</p>
            <div className="mt-2">
              <Badge className="bg-green-100 text-green-800">
                {upsideScenario?.multiple != null ? `${formatFixed(upsideScenario.multiple, 2)}x Multiple` : null}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <Minus className="h-5 w-5 text-blue-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-800">
                Base Scenario
              </h3>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
              {baseScenario?.irr != null ? `${formatFixed(baseScenario.irr, 2)}%` : null}
            </p>
            <p className="text-sm text-gray-500 mt-1">Projected IRR</p>
            <div className="mt-2">
              <Badge className="bg-blue-100 text-blue-800">
                {baseScenario?.multiple != null ? `${formatFixed(baseScenario.multiple, 2)}x Multiple` : null}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <TrendingDown className="h-5 w-5 text-red-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-800">
                Downside Scenario
              </h3>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">
              {downsideScenario?.irr != null ? `${formatFixed(downsideScenario.irr, 2)}%` : null}
            </p>
            <p className="text-sm text-gray-500 mt-1">Projected IRR</p>
            <div className="mt-2">
              <Badge className="bg-red-100 text-red-800">
                {downsideScenario?.multiple != null ? `${formatFixed(downsideScenario.multiple, 2)}x Multiple` : null}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Scenario Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Upside Scenario */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center">
              <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
              <h3 className="text-xl font-semibold text-gray-800">
                Upside Scenario
              </h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-green-600">
                    {upsideScenario?.irr != null ? `${formatFixed(upsideScenario.irr, 2)}%` : null}
                  </span>
                </div>
                <p className="text-sm text-gray-600">Projected IRR</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Equity Multiple</span>
                  <Badge
                    className={getMultipleColor(upsideScenario?.multiple)}
                  >
                    {upsideScenario?.multiple != null ? `${formatFixed(upsideScenario.multiple, 2)}x` : null}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Profit Margin</span>
                  <Badge
                    className={getProfitMarginColor(upsideScenario?.profitMargin)}
                  >
                    {upsideScenario?.profitMargin != null ? `${formatFixed(upsideScenario.profitMargin, 2)}%` : null}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Risk Level</span>
                  {upsideRisk ? <Badge className="bg-green-100 text-green-800">{upsideRisk}</Badge> : null}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Base Scenario */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center">
              <Minus className="h-5 w-5 text-blue-500 mr-2" />
              <h3 className="text-xl font-semibold text-gray-800">
                Base Scenario
              </h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-blue-600">
                    {baseScenario?.irr != null ? `${formatFixed(baseScenario.irr, 2)}%` : null}
                  </span>
                </div>
                <p className="text-sm text-gray-600">Projected IRR</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Equity Multiple</span>
                  <Badge
                    className={getMultipleColor(baseScenario?.multiple)}
                  >
                    {baseScenario?.multiple != null ? `${formatFixed(baseScenario.multiple, 2)}x` : null}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Profit Margin</span>
                  <Badge
                    className={getProfitMarginColor(baseScenario?.profitMargin)}
                  >
                    {baseScenario?.profitMargin != null ? `${formatFixed(baseScenario.profitMargin, 2)}%` : null}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Risk Level</span>
                  {baseRisk ? <Badge className="bg-blue-100 text-blue-800">{baseRisk}</Badge> : null}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Downside Scenario */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center">
              <TrendingDown className="h-5 w-5 text-red-500 mr-2" />
              <h3 className="text-xl font-semibold text-gray-800">
                Downside Scenario
              </h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-red-600">
                    {downsideScenario?.irr != null ? `${formatFixed(downsideScenario.irr, 2)}%` : null}
                  </span>
                </div>
                <p className="text-sm text-gray-600">Projected IRR</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Equity Multiple</span>
                  <Badge
                    className={getMultipleColor(downsideScenario?.multiple)}
                  >
                    {downsideScenario?.multiple != null ? `${formatFixed(downsideScenario.multiple, 2)}x` : null}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Profit Margin</span>
                  <Badge
                    className={getProfitMarginColor(downsideScenario?.profitMargin)}
                  >
                    {downsideScenario?.profitMargin != null ? `${formatFixed(downsideScenario.profitMargin, 2)}%` : null}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Risk Level</span>
                  {downsideRisk ? <Badge className="bg-red-100 text-red-800">{downsideRisk}</Badge> : null}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sensitivity Analysis Grid */}
      <Card className="hover:shadow-lg transition-shadow mb-8">
        <CardHeader>
          <h3 className="text-xl font-semibold text-gray-800">
            Sensitivity Analysis
          </h3>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-semibold text-gray-800">
                    Scenario
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-800">
                    IRR
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-800">
                    Multiple
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-800">
                    Profit Margin
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-800">
                    Risk Assessment
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <div className="flex items-center">
                      <TrendingUp className="h-4 w-4 text-green-500 mr-2" />
                      <span className="font-medium text-gray-800">Upside</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                  <Badge
                    className={getIRRColor(upsideScenario?.irr)}
                  >
                    {upsideScenario?.irr != null ? `${formatFixed(upsideScenario.irr, 2)}%` : null}
                  </Badge>
                  </td>
                  <td className="py-4 px-4">
                  <Badge
                    className={getMultipleColor(upsideScenario?.multiple)}
                  >
                    {upsideScenario?.multiple != null ? `${formatFixed(upsideScenario.multiple, 2)}x` : null}
                  </Badge>
                  </td>
                  <td className="py-4 px-4">
                  <Badge
                    className={getProfitMarginColor(upsideScenario?.profitMargin)}
                  >
                    {upsideScenario?.profitMargin != null ? `${formatFixed(upsideScenario.profitMargin, 2)}%` : null}
                  </Badge>
                  </td>
                  <td className="py-4 px-4">
                    {upsideRisk ? <Badge className="bg-green-100 text-green-800">{upsideRisk} Risk</Badge> : null}
                  </td>
                </tr>
                <tr className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <div className="flex items-center">
                      <Minus className="h-4 w-4 text-blue-500 mr-2" />
                      <span className="font-medium text-gray-800">Base</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                  <Badge
                    className={getIRRColor(baseScenario?.irr)}
                  >
                    {baseScenario?.irr != null ? `${formatFixed(baseScenario.irr, 2)}%` : null}
                  </Badge>
                  </td>
                  <td className="py-4 px-4">
                  <Badge
                    className={getMultipleColor(baseScenario?.multiple)}
                  >
                    {baseScenario?.multiple != null ? `${formatFixed(baseScenario.multiple, 2)}x` : null}
                  </Badge>
                  </td>
                  <td className="py-4 px-4">
                  <Badge
                    className={getProfitMarginColor(baseScenario?.profitMargin)}
                  >
                    {baseScenario?.profitMargin != null ? `${formatFixed(baseScenario.profitMargin, 2)}%` : null}
                  </Badge>
                  </td>
                  <td className="py-4 px-4">
                    {baseRisk ? <Badge className="bg-blue-100 text-blue-800">{baseRisk} Risk</Badge> : null}
                  </td>
                </tr>
                <tr className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <div className="flex items-center">
                      <TrendingDown className="h-4 w-4 text-red-500 mr-2" />
                      <span className="font-medium text-gray-800">
                        Downside
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                  <Badge
                    className={getIRRColor(downsideScenario?.irr)}
                  >
                    {downsideScenario?.irr != null ? `${formatFixed(downsideScenario.irr, 2)}%` : null}
                  </Badge>
                  </td>
                  <td className="py-4 px-4">
                  <Badge
                    className={getMultipleColor(downsideScenario?.multiple)}
                  >
                    {downsideScenario?.multiple != null ? `${formatFixed(downsideScenario.multiple, 2)}x` : null}
                  </Badge>
                  </td>
                  <td className="py-4 px-4">
                  <Badge
                    className={getProfitMarginColor(downsideScenario?.profitMargin)}
                  >
                    {downsideScenario?.profitMargin != null ? `${formatFixed(downsideScenario.profitMargin, 2)}%` : null}
                  </Badge>
                  </td>
                  <td className="py-4 px-4">
                    {downsideRisk ? <Badge className="bg-red-100 text-red-800">{downsideRisk} Risk</Badge> : null}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Return Drivers */}
      <Card className="hover:shadow-lg transition-shadow mb-8">
        <CardHeader>
          <h3 className="text-xl font-semibold text-gray-800">
            Return Drivers
          </h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">
                Key Success Factors
              </h4>
              <ul className="space-y-2 text-sm text-gray-600">
                {['returnDriver1', 'returnDriver2', 'returnDriver3'].map((field) => {
                  const insight = insights?.[field] ?? null;
                  return insight ? (
                    <li key={field} className="flex items-center">
                      <span className="text-green-500 mr-2">•</span>
                      <span>{insight}</span>
                    </li>
                  ) : null;
                })}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Risk Factors</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                {['returnRisk1', 'returnRisk2', 'returnRisk3'].map((field) => {
                  const insight = insights?.[field] ?? null;
                  return insight ? (
                    <li key={field} className="flex items-center">
                      <span className="text-green-500 mr-2">•</span>
                      <span>{insight}</span>
                    </li>
                  ) : null;
                })}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-3">
                Mitigation Strategies
              </h4>
              <ul className="space-y-2 text-sm text-gray-600">
                {['returnMitigation1', 'returnMitigation2', 'returnMitigation3'].map((field) => {
                  const insight = insights?.[field] ?? null;
                  return insight ? (
                    <li key={field} className="flex items-center">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>{insight}</span>
                    </li>
                  ) : null;
                })}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* NOI & Yield Metrics */}
      {(propertyNoiT12 != null || trendedNOIYear1 != null || untrendedNOIYear1 != null || trendedYield != null || untrendedYield != null || inflationAssumption != null || dscrStressTest != null) && (
        <Card className="hover:shadow-lg transition-shadow mb-8">
          <CardHeader>
            <h3 className="text-xl font-semibold text-gray-800">NOI & Yield Analysis</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {propertyNoiT12 != null && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Current/T12 NOI</p>
                  <p className="text-lg font-semibold text-gray-800">${formatLocale(propertyNoiT12)}</p>
                </div>
              )}
              {trendedNOIYear1 != null && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Trended NOI (Yr 1)</p>
                  <p className="text-lg font-semibold text-gray-800">${formatLocale(trendedNOIYear1)}</p>
                </div>
              )}
              {untrendedNOIYear1 != null && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Untrended NOI (Yr 1)</p>
                  <p className="text-lg font-semibold text-gray-800">${formatLocale(untrendedNOIYear1)}</p>
                </div>
              )}
              {trendedYield != null && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Trended Yield</p>
                  <p className="text-lg font-semibold text-gray-800">{formatFixed(trendedYield, 2)}%</p>
                </div>
              )}
              {untrendedYield != null && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Untrended Yield</p>
                  <p className="text-lg font-semibold text-gray-800">{formatFixed(untrendedYield, 2)}%</p>
                </div>
              )}
              {inflationAssumption != null && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Inflation Assumption</p>
                  <p className="text-lg font-semibold text-gray-800">{formatFixed(inflationAssumption, 2)}%</p>
                </div>
              )}
              {dscrStressTest != null && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">DSCR Stress Test</p>
                  <p className="text-lg font-semibold text-gray-800">{formatFixed(dscrStressTest, 2)}x</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exit Strategy & Hold Period */}
      {(exitStrategy || expectedHoldPeriod != null) && (
        <Card className="hover:shadow-lg transition-shadow mb-8">
          <CardHeader>
            <h3 className="text-xl font-semibold text-gray-800">Exit Strategy</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {exitStrategy && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Exit Strategy</p>
                  <p className="text-sm text-gray-800">{exitStrategy}</p>
                </div>
              )}
              {expectedHoldPeriod != null && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Expected Hold Period</p>
                  <p className="text-lg font-semibold text-gray-800">{expectedHoldPeriod} years</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Business Plan Summary */}
      {businessPlanSummary && (
        <Card className="hover:shadow-lg transition-shadow mb-8">
          <CardHeader>
            <h3 className="text-xl font-semibold text-gray-800">Business Plan Summary</h3>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 leading-relaxed">{businessPlanSummary}</p>
          </CardContent>
        </Card>
      )}

      {/* Interactive Return Charts */}
      <ReturnsCharts />
    </div>
  );
}
