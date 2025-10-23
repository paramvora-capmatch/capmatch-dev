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

interface ReturnsChartsProps {
  className?: string;
  compact?: boolean;
}

export default function ReturnsCharts({
  className = "",
  compact = false,
}: ReturnsChartsProps) {
  const [activeScenario, setActiveScenario] = useState<
    "base" | "upside" | "downside"
  >("base");

  // Mock data for charts
  const irrData = [
    { scenario: "Base Case", irr: 18.5, multiple: 2.1, color: "#3b82f6" },
    { scenario: "Upside", irr: 24.5, multiple: 2.8, color: "#10b981" },
    { scenario: "Downside", irr: 12.5, multiple: 1.6, color: "#ef4444" },
  ];

  const cashFlowData = [
    { year: "2025", base: -4500000, upside: -4200000, downside: -4800000 },
    { year: "2026", base: -8000000, upside: -7500000, downside: -8500000 },
    { year: "2027", base: -4000000, upside: -3500000, downside: -4500000 },
    { year: "2028", base: 2000000, upside: 2500000, downside: 1500000 },
    { year: "2029", base: 8000000, upside: 9500000, downside: 6500000 },
    { year: "2030", base: 12000000, upside: 15000000, downside: 9500000 },
  ];

  const returnsBreakdown = [
    { name: "Cash Flow", value: 45, color: "#3b82f6" },
    { name: "Asset Appreciation", value: 35, color: "#10b981" },
    { name: "Tax Benefits", value: 12, color: "#f59e0b" },
    { name: "Leverage", value: 8, color: "#8b5cf6" },
  ];

  const quarterlyDelivery = [
    { quarter: "Q3 2025", units: 800, color: "#3b82f6" },
    { quarter: "Q4 2025", units: 1200, color: "#10b981" },
    { quarter: "Q1 2026", units: 950, color: "#f59e0b" },
    { quarter: "Q2 2026", units: 600, color: "#8b5cf6" },
    { quarter: "Q3 2026", units: 650, color: "#ef4444" },
  ];

  const getScenarioData = () => {
    switch (activeScenario) {
      case "upside":
        return { irr: 24.5, multiple: 2.8, profitMargin: 35, color: "#10b981" };
      case "downside":
        return { irr: 12.5, multiple: 1.6, profitMargin: 18, color: "#ef4444" };
      default:
        return { irr: 18.5, multiple: 2.1, profitMargin: 28, color: "#3b82f6" };
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
                irr: 12.5,
                color: "#ef4444",
              },
              { key: "base", label: "Base", irr: 18.5, color: "#3b82f6" },
              { key: "upside", label: "Upside", irr: 24.5, color: "#10b981" },
            ].map(({ key, label, irr, color }) => (
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
          <div className="h-16 bg-gray-50 rounded-lg flex items-end justify-center p-2">
            <div className="flex items-end space-x-1">
              {[-2.5, 0.8, 1.2, 1.4, 15.5].map((value, index) => (
                <div
                  key={index}
                  className="w-3 bg-blue-500 rounded-t"
                  style={{ height: `${Math.max(4, Math.abs(value) * 2)}px` }}
                />
              ))}
            </div>
          </div>
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
        <Card className="hover:shadow-lg transition-shadow">
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
              {currentScenario.irr}%
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Internal Rate of Return
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
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
              {currentScenario.multiple}x
            </p>
            <p className="text-sm text-gray-500 mt-1">Total Return Multiple</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
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
              {currentScenario.profitMargin}%
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
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={irrData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="scenario" />
              <YAxis />
              <Tooltip formatter={(value: number) => [`${value}%`, "IRR"]} />
              <Bar dataKey="irr" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
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
        </CardContent>
      </Card>

      {/* Returns Breakdown and Quarterly Delivery */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <h3 className="text-xl font-semibold text-gray-800">
              Returns Breakdown
            </h3>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <h3 className="text-xl font-semibold text-gray-800">
              Quarterly Delivery Schedule
            </h3>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={quarterlyDelivery}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="quarter" />
                <YAxis />
                <Tooltip formatter={(value: number) => [value, "Units"]} />
                <Bar dataKey="units" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
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
              <ResponsiveContainer width="100%" height={200}>
                <LineChart
                  data={[
                    { growth: "0%", irr: 12.5 },
                    { growth: "2%", irr: 15.8 },
                    { growth: "4%", irr: 18.5 },
                    { growth: "6%", irr: 21.2 },
                    { growth: "8%", irr: 24.5 },
                  ]}
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
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-3">
                Construction Cost Impact
              </h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart
                  data={[
                    { cost: "-20%", irr: 28.5 },
                    { cost: "-10%", irr: 24.5 },
                    { cost: "Base", irr: 18.5 },
                    { cost: "+10%", irr: 14.2 },
                    { cost: "+20%", irr: 10.8 },
                  ]}
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
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
