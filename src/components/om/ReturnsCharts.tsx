"use client";

import React, { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";
import { useOmContent } from "@/hooks/useOmContent";

interface ReturnsChartsProps {
  className?: string;
  compact?: boolean;
}

export default function ReturnsCharts({
  className = "",
  compact = false,
}: ReturnsChartsProps) {
  const { content } = useOmContent();
  const [activeScenario, setActiveScenario] = useState<
    "base" | "upside" | "downside"
  >("base");

  // Build IRR data from content
  const baseIRR = content?.irr ?? null;
  const upsideIRR = content?.upsideIRR ?? null;
  const downsideIRR = content?.downsideIRR ?? null;
  const baseMultiple = content?.equityMultiple ?? null;
  const upsideMultiple = content?.upsideEquityMultiple ?? null;
  const downsideMultiple = content?.downsideEquityMultiple ?? null;

  const irrData = [
    { scenario: "Base Case", irr: baseIRR ?? 0, multiple: baseMultiple ?? 0, color: "#3b82f6" },
    { scenario: "Upside", irr: upsideIRR ?? 0, multiple: upsideMultiple ?? 0, color: "#10b981" },
    { scenario: "Downside", irr: downsideIRR ?? 0, multiple: downsideMultiple ?? 0, color: "#ef4444" },
  ].filter(item => item.irr > 0 || item.multiple > 0);

  // Build cash flow data from fiveYearCashFlow
  const fiveYearCashFlow = content?.fiveYearCashFlow;
  const cashFlowData = fiveYearCashFlow && Array.isArray(fiveYearCashFlow) 
    ? fiveYearCashFlow.map((value: number, index: number) => ({
        year: `202${5 + index}`,
        base: value,
        upside: upsideIRR && baseIRR ? value * (upsideIRR / baseIRR) : value,
        downside: downsideIRR && baseIRR ? value * (downsideIRR / baseIRR) : value,
      }))
    : [];

  // Build returns breakdown from content
  const returnsBreakdownData = content?.returnsBreakdown;
  const returnsBreakdown = returnsBreakdownData && typeof returnsBreakdownData === 'object'
    ? [
        { name: "Cash Flow", value: returnsBreakdownData.cashFlow ?? 0, color: "#3b82f6" },
        { name: "Asset Appreciation", value: returnsBreakdownData.assetAppreciation ?? 0, color: "#10b981" },
        { name: "Tax Benefits", value: returnsBreakdownData.taxBenefits ?? 0, color: "#f59e0b" },
        { name: "Leverage", value: returnsBreakdownData.leverage ?? 0, color: "#8b5cf6" },
      ].filter(item => item.value > 0)
    : [];

  // Build quarterly delivery from content
  const quarterlySchedule = content?.quarterlyDeliverySchedule;
  const quarterlyDelivery = quarterlySchedule && Array.isArray(quarterlySchedule)
    ? quarterlySchedule.map((item: any, index: number) => ({
        quarter: item.quarter ?? `Q${(index % 4) + 1} 202${5 + Math.floor(index / 4)}`,
        units: item.units ?? 0,
        color: ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"][index % 5],
      }))
    : [];

  const getScenarioData = () => {
    switch (activeScenario) {
      case "upside":
        return { 
          irr: upsideIRR ?? null, 
          multiple: upsideMultiple ?? null, 
          profitMargin: content?.upsideProfitMargin ?? null, 
          color: "#10b981" 
        };
      case "downside":
        return { 
          irr: downsideIRR ?? null, 
          multiple: downsideMultiple ?? null, 
          profitMargin: content?.downsideProfitMargin ?? null, 
          color: "#ef4444" 
        };
      default:
        const baseProfitMargin = content?.stabilizedValue && content?.totalDevelopmentCost
          ? ((content.stabilizedValue - content.totalDevelopmentCost) / content.totalDevelopmentCost) * 100
          : null;
        return { 
          irr: baseIRR ?? null, 
          multiple: baseMultiple ?? null, 
          profitMargin: baseProfitMargin, 
          color: "#3b82f6" 
        };
    }
  };

  const currentScenario = getScenarioData();

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-800">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              className="text-sm"
              style={{ color: entry.color as string }}
            >
              {entry.name}: ${(entry.value as number)?.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (compact) {
    return (
      <div className={`space-y-3 ${className}`}>
        {/* Compact IRR Comparison */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-800 text-center">
            IRR by Scenario
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                key: "downside",
                label: "Downside",
                irr: downsideIRR,
                color: "#ef4444",
              },
              { key: "base", label: "Base", irr: baseIRR, color: "#3b82f6" },
              { key: "upside", label: "Upside", irr: upsideIRR, color: "#10b981" },
            ].filter(item => item.irr != null).map(({ key, label, irr, color }) => (
              <div key={key} className="text-center">
                <div className="text-xs text-gray-500 mb-1">{label}</div>
                <div className="text-lg font-bold" style={{ color }}>
                  {irr}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Compact Cash Flow Preview */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-800 text-center">
            Cash Flow Trend
          </h4>
          {fiveYearCashFlow && fiveYearCashFlow.length > 0 ? (
            <div className="h-16 bg-gray-50 rounded-lg flex items-end justify-center p-2">
              <div className="flex items-end space-x-1">
                {fiveYearCashFlow.slice(0, 5).map((value: number, index: number) => {
                  const normalizedValue = value / 1000000; // Convert to millions for display
                  return (
                    <div
                      key={index}
                      className="w-3 bg-blue-500 rounded-t"
                      style={{ height: `${Math.max(4, Math.abs(normalizedValue) * 2)}px` }}
                    />
                  );
                })}
              </div>
            </div>
          ) : null}
          <div className="text-xs text-gray-500 text-center">
            5-Year Projection
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Scenario Selector */}
      <div className="flex justify-center space-x-2">
        {[
          {
            key: "downside",
            label: "Downside",
            icon: TrendingDown,
            color: "bg-red-100 text-red-800",
          },
          {
            key: "base",
            label: "Base Case",
            icon: Minus,
            color: "bg-blue-100 text-blue-800",
          },
          {
            key: "upside",
            label: "Upside",
            icon: TrendingUp,
            color: "bg-green-100 text-green-800",
          },
        ].map(({ key, label, icon: Icon, color }) => (
          <button
            key={key}
            onClick={() =>
              setActiveScenario(key as "base" | "upside" | "downside")
            }
            className={`flex items-center px-4 py-2 rounded-lg border transition-all ${
              activeScenario === key
                ? `${color} border-current`
                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
            }`}
          >
            <Icon className="h-4 w-4 mr-2" />
            {label}
          </button>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-xl overflow-hidden bg-white border border-gray-200 transition-all duration-300 hover:border-blue-200 hover:shadow-lg hover:-translate-y-0.5">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <TrendingUp
                className="h-5 w-5 mr-2"
                style={{ color: currentScenario.color }}
              />
              <h3 className="text-lg font-semibold text-gray-800">
                Projected IRR
              </h3>
            </div>
          </CardHeader>
          <CardContent>
            <p
              className="text-3xl font-bold"
              style={{ color: currentScenario.color }}
            >
              {currentScenario.irr != null ? `${currentScenario.irr}%` : 'N/A'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Internal Rate of Return
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl overflow-hidden bg-white border border-gray-200 transition-all duration-300 hover:border-blue-200 hover:shadow-lg hover:-translate-y-0.5">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <BarChart3
                className="h-5 w-5 mr-2"
                style={{ color: currentScenario.color }}
              />
              <h3 className="text-lg font-semibold text-gray-800">
                Equity Multiple
              </h3>
            </div>
          </CardHeader>
          <CardContent>
            <p
              className="text-3xl font-bold"
              style={{ color: currentScenario.color }}
            >
              {currentScenario.multiple != null ? `${currentScenario.multiple}x` : 'N/A'}
            </p>
            <p className="text-sm text-gray-500 mt-1">Total Return Multiple</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl overflow-hidden bg-white border border-gray-200 transition-all duration-300 hover:border-blue-200 hover:shadow-lg hover:-translate-y-0.5">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <PieChartIcon
                className="h-5 w-5 mr-2"
                style={{ color: currentScenario.color }}
              />
              <h3 className="text-lg font-semibold text-gray-800">
                Profit Margin
              </h3>
            </div>
          </CardHeader>
          <CardContent>
            <p
              className="text-3xl font-bold"
              style={{ color: currentScenario.color }}
            >
              {currentScenario.profitMargin != null ? `${currentScenario.profitMargin}%` : 'N/A'}
            </p>
            <p className="text-sm text-gray-500 mt-1">Net Profit Margin</p>
          </CardContent>
        </Card>
      </div>

      {/* IRR Comparison Chart */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <h3 className="text-xl font-semibold text-gray-800">
            IRR Comparison by Scenario
          </h3>
        </CardHeader>
        <CardContent>
          {irrData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={irrData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="scenario" />
                <YAxis />
                <Tooltip formatter={(value: number) => [`${value}%`, "IRR"]} />
                <Bar dataKey="irr" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No IRR data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cash Flow Projections */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <h3 className="text-xl font-semibold text-gray-800">
            Cash Flow Projections
          </h3>
        </CardHeader>
        <CardContent>
          {cashFlowData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="base"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.6}
                  name="Base Case"
                />
                <Area
                  type="monotone"
                  dataKey="upside"
                  stackId="1"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.6}
                  name="Upside"
                />
                <Area
                  type="monotone"
                  dataKey="downside"
                  stackId="1"
                  stroke="#ef4444"
                  fill="#ef4444"
                  fillOpacity={0.6}
                  name="Downside"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No cash flow data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Returns Breakdown and Quarterly Delivery */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-xl overflow-hidden bg-white border border-gray-200 transition-all duration-300 hover:border-blue-200 hover:shadow-lg hover:-translate-y-0.5">
          <CardHeader>
            <h3 className="text-xl font-semibold text-gray-800">
              Returns Breakdown
            </h3>
          </CardHeader>
          <CardContent>
            {returnsBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={returnsBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({
                      name,
                      percent,
                    }: {
                      name: string;
                      percent: number;
                    }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {returnsBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, "Contribution"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No returns breakdown data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl overflow-hidden bg-white border border-gray-200 transition-all duration-300 hover:border-blue-200 hover:shadow-lg hover:-translate-y-0.5">
          <CardHeader>
            <h3 className="text-xl font-semibold text-gray-800">
              Quarterly Delivery Schedule
            </h3>
          </CardHeader>
          <CardContent>
            {quarterlyDelivery.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={quarterlyDelivery}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="quarter" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => [value, "Units"]} />
                  <Bar dataKey="units" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No quarterly delivery data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sensitivity Analysis */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <h3 className="text-xl font-semibold text-gray-800">
            Sensitivity Analysis
          </h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">
                Rent Growth Impact
              </h4>
              {content?.sensitivityAnalysis?.rentGrowthImpact && Array.isArray(content.sensitivityAnalysis.rentGrowthImpact) && content.sensitivityAnalysis.rentGrowthImpact.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart
                    data={content.sensitivityAnalysis.rentGrowthImpact.map((item: any) => ({
                      growth: item.growth ?? '0%',
                      irr: item.irr ?? 0,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="growth" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number) => [`${value}%`, "IRR"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="irr"
                      stroke="#3b82f6"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-gray-500">
                  No rent growth impact data available
                </div>
              )}
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-3">
                Construction Cost Impact
              </h4>
              {content?.sensitivityAnalysis?.constructionCostImpact && Array.isArray(content.sensitivityAnalysis.constructionCostImpact) && content.sensitivityAnalysis.constructionCostImpact.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart
                    data={content.sensitivityAnalysis.constructionCostImpact.map((item: any) => ({
                      cost: item.cost ?? 'Base',
                      irr: item.irr ?? 0,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="cost" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number) => [`${value}%`, "IRR"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="irr"
                      stroke="#ef4444"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-gray-500">
                  No construction cost impact data available
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
