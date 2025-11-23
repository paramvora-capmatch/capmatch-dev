"use client";

import { financialDetails } from "@/services/mockOMData";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingDown, PieChart } from "lucide-react";

export default function SourcesUsesPage() {
  const totalSources = financialDetails.sourcesUses.sources.reduce(
    (sum, source) => sum + source.amount,
    0
  );

  const totalUses = financialDetails.sourcesUses.uses.reduce(
    (sum, use) => sum + use.amount,
    0
  );

  const primaryDebtSource =
    financialDetails.sourcesUses.sources.find((source) =>
      /debt|loan/i.test(source.type)
    ) || financialDetails.sourcesUses.sources[0];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (amount: number, total: number) => {
    if (total === 0) return "0.0";
    return ((amount / total) * 100).toFixed(1);
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Sources & Uses</h1>
        <p className="text-gray-600 mt-2">
          Capital structure and funding allocation
        </p>
      </div>

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
              {formatPercentage(primaryDebtSource.amount, totalSources)}%
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
            {financialDetails.sourcesUses.sources.map((source, index) => (
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
                      {source.percentage}%
                    </Badge>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="h-3 rounded-full bg-blue-500"
                    style={{ width: `${source.percentage}%` }}
                  />
                </div>
              </div>
            ))}

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
            {financialDetails.sourcesUses.uses.map((use, index) => (
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
                      {use.percentage}%
                    </Badge>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="h-3 rounded-full bg-green-500"
                    style={{ width: `${use.percentage}%` }}
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
              <div className="space-y-3">
                {financialDetails.sourcesUses.sources.map((source, index) => {
                  const previousAmount = financialDetails.sourcesUses.sources
                    .slice(0, index)
                    .reduce((sum, s) => sum + s.amount, 0);
                  const startHeight = (previousAmount / totalSources) * 200;
                  const height = (source.amount / totalSources) * 200;

                  return (
                    <div key={index} className="flex items-center space-x-4">
                      <div className="w-32 text-sm text-gray-600">
                        {source.type}
                      </div>
                      <div className="flex-1 relative">
                        <div className="relative h-48 bg-gray-100 rounded border">
                          <div
                            className="absolute bottom-0 left-0 w-full bg-blue-500 rounded transition-all duration-300"
                            style={{
                              height: `${height}px`,
                              bottom: `${startHeight}px`,
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {formatCurrency(source.amount)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="w-20 text-right">
                        <div className="text-sm font-medium">
                          {formatCurrency(source.amount)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {source.percentage}%
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
              <div className="space-y-3">
                {financialDetails.sourcesUses.uses.map((use, index) => {
                  const previousAmount = financialDetails.sourcesUses.uses
                    .slice(0, index)
                    .reduce((sum, u) => sum + u.amount, 0);
                  const startHeight = (previousAmount / totalUses) * 200;
                  const height = (use.amount / totalUses) * 200;

                  return (
                    <div key={index} className="flex items-center space-x-4">
                      <div className="w-32 text-sm text-gray-600">
                        {use.type}
                      </div>
                      <div className="flex-1 relative">
                        <div className="relative h-48 bg-gray-100 rounded border">
                          <div
                            className="absolute bottom-0 left-0 w-full bg-green-500 rounded transition-all duration-300"
                            style={{
                              height: `${height}px`,
                              bottom: `${startHeight}px`,
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {formatCurrency(use.amount)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="w-20 text-right">
                        <div className="text-sm font-medium">
                          {formatCurrency(use.amount)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {use.percentage}%
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
              {financialDetails.sourcesUses.sources.map((source) => (
                <div key={source.type} className="flex justify-between items-center">
                  <span className="text-gray-600">{source.type}</span>
                  <Badge className="bg-blue-50 text-blue-800">
                    {formatPercentage(source.amount, totalSources)}%
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
              {[...financialDetails.sourcesUses.uses]
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 3)
                .map((use) => (
                  <div key={use.type} className="flex justify-between items-center">
                    <span className="text-gray-600">{use.type}</span>
                    <Badge className="bg-green-50 text-green-800">
                      {formatPercentage(use.amount, totalUses)}%
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
    </div>
  );
}
