"use client";

import { financialDetails } from "@/services/mockOMData";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import ReturnsCharts from "@/components/om/ReturnsCharts";

export default function ReturnsPage() {
  const getIRRColor = (irr: number) => {
    if (irr >= 25) return "bg-green-100 text-green-800";
    if (irr >= 20) return "bg-blue-100 text-blue-800";
    if (irr >= 15) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getMultipleColor = (multiple: number) => {
    if (multiple >= 2.5) return "bg-green-100 text-green-800";
    if (multiple >= 2.0) return "bg-blue-100 text-blue-800";
    if (multiple >= 1.5) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getProfitMarginColor = (margin: number) => {
    if (margin >= 30) return "bg-green-100 text-green-800";
    if (margin >= 25) return "bg-blue-100 text-blue-800";
    if (margin >= 20) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Return Projections</h1>
        <p className="text-gray-600 mt-2">
          Comprehensive return analysis across multiple scenarios
        </p>
      </div>

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
              {financialDetails.returnProjections.upside.irr}%
            </p>
            <p className="text-sm text-gray-500 mt-1">Projected IRR</p>
            <div className="mt-2">
              <Badge className="bg-green-100 text-green-800">
                {financialDetails.returnProjections.upside.multiple}x Multiple
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
              {financialDetails.returnProjections.base.irr}%
            </p>
            <p className="text-sm text-gray-500 mt-1">Projected IRR</p>
            <div className="mt-2">
              <Badge className="bg-blue-100 text-blue-800">
                {financialDetails.returnProjections.base.multiple}x Multiple
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
              {financialDetails.returnProjections.downside.irr}%
            </p>
            <p className="text-sm text-gray-500 mt-1">Projected IRR</p>
            <div className="mt-2">
              <Badge className="bg-red-100 text-red-800">
                {financialDetails.returnProjections.downside.multiple}x Multiple
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
                    {financialDetails.returnProjections.upside.irr}%
                  </span>
                </div>
                <p className="text-sm text-gray-600">Projected IRR</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Equity Multiple</span>
                  <Badge
                    className={getMultipleColor(
                      financialDetails.returnProjections.upside.multiple
                    )}
                  >
                    {financialDetails.returnProjections.upside.multiple}x
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Profit Margin</span>
                  <Badge
                    className={getProfitMarginColor(
                      financialDetails.returnProjections.upside.profitMargin
                    )}
                  >
                    {financialDetails.returnProjections.upside.profitMargin}%
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
                    {financialDetails.returnProjections.base.irr}%
                  </span>
                </div>
                <p className="text-sm text-gray-600">Projected IRR</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Equity Multiple</span>
                  <Badge
                    className={getMultipleColor(
                      financialDetails.returnProjections.base.multiple
                    )}
                  >
                    {financialDetails.returnProjections.base.multiple}x
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Profit Margin</span>
                  <Badge
                    className={getProfitMarginColor(
                      financialDetails.returnProjections.base.profitMargin
                    )}
                  >
                    {financialDetails.returnProjections.base.profitMargin}%
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
                    {financialDetails.returnProjections.downside.irr}%
                  </span>
                </div>
                <p className="text-sm text-gray-600">Projected IRR</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Equity Multiple</span>
                  <Badge
                    className={getMultipleColor(
                      financialDetails.returnProjections.downside.multiple
                    )}
                  >
                    {financialDetails.returnProjections.downside.multiple}x
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Profit Margin</span>
                  <Badge
                    className={getProfitMarginColor(
                      financialDetails.returnProjections.downside.profitMargin
                    )}
                  >
                    {financialDetails.returnProjections.downside.profitMargin}%
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
                      className={getIRRColor(
                        financialDetails.returnProjections.upside.irr
                      )}
                    >
                      {financialDetails.returnProjections.upside.irr}%
                    </Badge>
                  </td>
                  <td className="py-4 px-4">
                    <Badge
                      className={getMultipleColor(
                        financialDetails.returnProjections.upside.multiple
                      )}
                    >
                      {financialDetails.returnProjections.upside.multiple}x
                    </Badge>
                  </td>
                  <td className="py-4 px-4">
                    <Badge
                      className={getProfitMarginColor(
                        financialDetails.returnProjections.upside.profitMargin
                      )}
                    >
                      {financialDetails.returnProjections.upside.profitMargin}%
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
                      className={getIRRColor(
                        financialDetails.returnProjections.base.irr
                      )}
                    >
                      {financialDetails.returnProjections.base.irr}%
                    </Badge>
                  </td>
                  <td className="py-4 px-4">
                    <Badge
                      className={getMultipleColor(
                        financialDetails.returnProjections.base.multiple
                      )}
                    >
                      {financialDetails.returnProjections.base.multiple}x
                    </Badge>
                  </td>
                  <td className="py-4 px-4">
                    <Badge
                      className={getProfitMarginColor(
                        financialDetails.returnProjections.base.profitMargin
                      )}
                    >
                      {financialDetails.returnProjections.base.profitMargin}%
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
                      className={getIRRColor(
                        financialDetails.returnProjections.downside.irr
                      )}
                    >
                      {financialDetails.returnProjections.downside.irr}%
                    </Badge>
                  </td>
                  <td className="py-4 px-4">
                    <Badge
                      className={getMultipleColor(
                        financialDetails.returnProjections.downside.multiple
                      )}
                    >
                      {financialDetails.returnProjections.downside.multiple}x
                    </Badge>
                  </td>
                  <td className="py-4 px-4">
                    <Badge
                      className={getProfitMarginColor(
                        financialDetails.returnProjections.downside.profitMargin
                      )}
                    >
                      {financialDetails.returnProjections.downside.profitMargin}
                      %
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
                  <span className="text-yellow-500 mr-2">•</span>
                  Construction cost overruns
                </li>
                <li className="flex items-center">
                  <span className="text-yellow-500 mr-2">•</span>
                  Market timing risks
                </li>
                <li className="flex items-center">
                  <span className="text-yellow-500 mr-2">•</span>
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
