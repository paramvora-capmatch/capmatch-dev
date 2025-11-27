"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import ReturnsCharts from "@/components/om/ReturnsCharts";
import { useOMPageHeader } from "@/hooks/useOMPageHeader";
import { useOmContent } from "@/hooks/useOmContent";

export default function ReturnsPage() {
  const { content } = useOmContent();
  const financialDetails = content?.financialDetails ?? null;
  const returnProjections = financialDetails?.returnProjections ?? null;
  const upsideScenario = returnProjections?.upside ?? null;
  const baseScenario = returnProjections?.base ?? null;
  const downsideScenario = returnProjections?.downside ?? null;

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
              {upsideScenario?.irr != null ? `${upsideScenario.irr}%` : null}
            </p>
            <p className="text-sm text-gray-500 mt-1">Projected IRR</p>
            <div className="mt-2">
            <div className="mt-2">
              <Badge className="bg-green-100 text-green-800">
                {upsideScenario?.multiple != null ? `${upsideScenario.multiple}x Multiple` : null}
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
              {baseScenario?.irr != null ? `${baseScenario.irr}%` : null}
            </p>
            <p className="text-sm text-gray-500 mt-1">Projected IRR</p>
            <div className="mt-2">
            <div className="mt-2">
              <Badge className="bg-blue-100 text-blue-800">
                {baseScenario?.multiple != null ? `${baseScenario.multiple}x Multiple` : null}
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
              {downsideScenario?.irr != null ? `${downsideScenario.irr}%` : null}
            </p>
            <p className="text-sm text-gray-500 mt-1">Projected IRR</p>
            <div className="mt-2">
            <div className="mt-2">
              <Badge className="bg-red-100 text-red-800">
                {downsideScenario?.multiple != null ? `${downsideScenario.multiple}x Multiple` : null}
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
                    {upsideScenario?.irr != null ? `${upsideScenario.irr}%` : null}
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
                    {upsideScenario?.multiple != null ? `${upsideScenario.multiple}x` : null}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Profit Margin</span>
                  <Badge
                    className={getProfitMarginColor(upsideScenario?.profitMargin)}
                  >
                    {upsideScenario?.profitMargin != null ? `${upsideScenario.profitMargin}%` : null}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Risk Level</span>
                  <Badge className="bg-green-100 text-green-800">Low</Badge>
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
                    {baseScenario?.irr != null ? `${baseScenario.irr}%` : null}
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
                    {baseScenario?.multiple != null ? `${baseScenario.multiple}x` : null}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Profit Margin</span>
                  <Badge
                    className={getProfitMarginColor(baseScenario?.profitMargin)}
                  >
                    {baseScenario?.profitMargin != null ? `${baseScenario.profitMargin}%` : null}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Risk Level</span>
                  <Badge className="bg-blue-100 text-blue-800">Medium</Badge>
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
                    {downsideScenario?.irr != null ? `${downsideScenario.irr}%` : null}
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
                    {downsideScenario?.multiple != null ? `${downsideScenario.multiple}x` : null}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Profit Margin</span>
                  <Badge
                    className={getProfitMarginColor(downsideScenario?.profitMargin)}
                  >
                    {downsideScenario?.profitMargin != null ? `${downsideScenario.profitMargin}%` : null}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Risk Level</span>
                  <Badge className="bg-red-100 text-red-800">High</Badge>
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
                    {upsideScenario?.irr != null ? `${upsideScenario.irr}%` : null}
                  </Badge>
                  </td>
                  <td className="py-4 px-4">
                  <Badge
                    className={getMultipleColor(upsideScenario?.multiple)}
                  >
                    {upsideScenario?.multiple != null ? `${upsideScenario.multiple}x` : null}
                  </Badge>
                  </td>
                  <td className="py-4 px-4">
                  <Badge
                    className={getProfitMarginColor(upsideScenario?.profitMargin)}
                  >
                    {upsideScenario?.profitMargin != null ? `${upsideScenario.profitMargin}%` : null}
                  </Badge>
                  </td>
                  <td className="py-4 px-4">
                    <Badge className="bg-green-100 text-green-800">
                      Low Risk
                    </Badge>
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
                    {baseScenario?.irr != null ? `${baseScenario.irr}%` : null}
                  </Badge>
                  </td>
                  <td className="py-4 px-4">
                  <Badge
                    className={getMultipleColor(baseScenario?.multiple)}
                  >
                    {baseScenario?.multiple != null ? `${baseScenario.multiple}x` : null}
                  </Badge>
                  </td>
                  <td className="py-4 px-4">
                  <Badge
                    className={getProfitMarginColor(baseScenario?.profitMargin)}
                  >
                    {baseScenario?.profitMargin != null ? `${baseScenario.profitMargin}%` : null}
                  </Badge>
                  </td>
                  <td className="py-4 px-4">
                    <Badge className="bg-blue-100 text-blue-800">
                      Medium Risk
                    </Badge>
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
                    {downsideScenario?.irr != null ? `${downsideScenario.irr}%` : null}
                  </Badge>
                  </td>
                  <td className="py-4 px-4">
                  <Badge
                    className={getMultipleColor(downsideScenario?.multiple)}
                  >
                    {downsideScenario?.multiple != null ? `${downsideScenario.multiple}x` : null}
                  </Badge>
                  </td>
                  <td className="py-4 px-4">
                  <Badge
                    className={getProfitMarginColor(downsideScenario?.profitMargin)}
                  >
                    {downsideScenario?.profitMargin != null ? `${downsideScenario.profitMargin}%` : null}
                  </Badge>
                  </td>
                  <td className="py-4 px-4">
                    <Badge className="bg-red-100 text-red-800">High Risk</Badge>
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
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">•</span>
                  Strong market fundamentals
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">•</span>
                  Premium location & amenities
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">•</span>
                  Experienced development team
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Risk Factors</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">•</span>
                  Construction cost overruns
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">•</span>
                  Market timing risks
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">•</span>
                  Interest rate volatility
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-3">
                Mitigation Strategies
              </h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <span className="text-blue-500 mr-2">•</span>
                  Fixed-price contracts
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-2">•</span>
                  Pre-leasing commitments
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-2">•</span>
                  Interest rate hedging
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Return Charts */}
      <ReturnsCharts />
    </div>
  );
}
