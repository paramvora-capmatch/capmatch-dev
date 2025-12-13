"use client";

import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, BarChart3, Clock } from "lucide-react";
import SupplyDemandMap from "@/components/om/SupplyDemandMap";
import { useOMPageHeader } from "@/hooks/useOMPageHeader";
import { useOmContent } from "@/hooks/useOmContent";
import { parseNumeric, formatLocale, formatFixed } from "@/lib/om-utils";
import { OMEmptyState } from "@/components/om/OMEmptyState";

// Component to show missing values in red
const MissingValue = ({ children }: { children: React.ReactNode }) => (
  <span className="text-red-600 font-medium">{children}</span>
);

export default function SupplyDemandPage() {
  const { content, insights } = useOmContent();
  
  // Extract flat schema fields
  const supplyPipeline = parseNumeric(content?.supplyPipeline) ?? null;
  const monthsOfSupply = parseNumeric(content?.monthsOfSupply) ?? null;
  const submarketAbsorption = parseNumeric(content?.submarketAbsorption) ?? null;
  
  // Calculate average occupancy from rentComps if available
  const rentComps = Array.isArray(content?.rentComps) ? content.rentComps : [];
  const avgOccupancyFromComps = rentComps.length > 0
    ? rentComps.reduce((sum: number, comp: any) => {
        const occ = parseNumeric(comp.occupancyPercent) ?? 0;
        return sum + occ;
      }, 0) / rentComps.length
    : null;

  // Use flat schema values or hardcoded fallbacks
  const currentInventory = parseNumeric(content?.currentSupply) ?? parseNumeric(content?.currentInventory) ?? null;
  const underConstruction = parseNumeric(content?.unitsUnderConstruction) ?? parseNumeric(content?.underConstruction) ?? null;
  const planned24Months = supplyPipeline ?? parseNumeric(content?.planned24Months) ?? null;
  const averageOccupancy = avgOccupancyFromComps ?? content?.averageOccupancy ?? null;

  // Hardcoded delivery by quarter (will be shown in red)
  const hardcodedDeliveryByQuarter = [
    { quarter: 'Q1 2025', units: 450 },
    { quarter: 'Q2 2025', units: 620 },
    { quarter: 'Q3 2025', units: 580 },
    { quarter: 'Q4 2025', units: 720 },
    { quarter: 'Q1 2026', units: 680 },
    { quarter: 'Q2 2026', units: 900 },
  ];
  const deliveryByQuarter = hardcodedDeliveryByQuarter;

  const getOccupancyColor = (occupancy?: string | number | null) => {
    let occ: number;
    if (typeof occupancy === 'number') {
      occ = occupancy;
    } else if (typeof occupancy === 'string') {
      occ = parseFloat(occupancy);
    } else {
      occ = NaN;
    }
    if (Number.isNaN(occ)) return "bg-gray-100 text-gray-800";
    if (occ >= 95) return "bg-green-100 text-green-800";
    if (occ >= 90) return "bg-blue-100 text-blue-800";
    if (occ >= 85) return "bg-red-100 text-red-800";
    return "bg-red-100 text-red-800";
  };

  // Use hardcoded values for calculations if real values are missing
  const displayCurrentInventory = currentInventory ?? 12500;
  const displayUnderConstruction = underConstruction ?? 2450;
  const displayPlanned24Months = planned24Months ?? 4000;
  
  const totalSupply = displayCurrentInventory + displayUnderConstruction + displayPlanned24Months;
  const supplyUtilization =
    totalSupply > 0
      ? ((displayCurrentInventory + displayUnderConstruction) / totalSupply) * 100
      : 0;

  // Calculate the maximum units for histogram scaling
  const maxUnits =
    deliveryByQuarter.length > 0
      ? Math.max(
          ...deliveryByQuarter.map((q: { units?: number | null }) => q.units ?? 0)
        )
      : 0;
  const occupancyPercentValue = parseNumeric(averageOccupancy);

  useOMPageHeader({
    subtitle: "Pipeline deliveries, occupancy, and the market’s supply-demand balance.",
  });

  return (
    <div className="space-y-6">

      {/* Supply Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <Building2 className="h-5 w-5 text-blue-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-800">
                Current Supply
              </h3>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
              {currentInventory != null ? formatLocale(currentInventory) : <MissingValue>12,500</MissingValue>}
            </p>
            <p className="text-sm text-gray-500 mt-1">Available units</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-red-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-800">
                Under Construction
              </h3>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">
              {underConstruction != null ? formatLocale(underConstruction) : <MissingValue>2,450</MissingValue>}
            </p>
            <p className="text-sm text-gray-500 mt-1">Units in progress</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <BarChart3 className="h-5 w-5 text-blue-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-800">
                Planned 24M
              </h3>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
              {planned24Months != null ? formatLocale(planned24Months) : <MissingValue>4,200</MissingValue>}
            </p>
            <p className="text-sm text-gray-500 mt-1">Future units</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <h3 className="text-lg font-semibold text-gray-800">Occupancy</h3>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {averageOccupancy != null ? `${formatFixed(averageOccupancy, 1)}%` : <MissingValue>93.5%</MissingValue>}
            </p>
            <p className="text-sm text-gray-500 mt-1">Current average</p>
          </CardContent>
        </Card>
      </div>

      {/* Supply Pipeline Chart */}
      <Card className="hover:shadow-lg transition-shadow mb-8">
        <CardHeader>
          <h3 className="text-xl font-semibold text-gray-800">
            Supply Pipeline
          </h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Current Inventory
              </span>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  {currentInventory != null ? formatLocale(currentInventory) : <MissingValue>12,500</MissingValue>}{" "}
                  units
                </span>
                <Badge className="bg-blue-100 text-blue-800">Available</Badge>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="h-4 rounded-full bg-blue-500"
                style={{
                  width: `${
                    (displayCurrentInventory / totalSupply) *
                    100
                  }%`,
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Under Construction
              </span>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  {underConstruction != null ? formatLocale(underConstruction) : <MissingValue>2,450</MissingValue>}{" "}
                  units
                </span>
                <Badge className="bg-red-100 text-red-800">
                  In Progress
                </Badge>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="h-4 rounded-full bg-red-500"
                style={{
                  width: `${
                    (displayUnderConstruction / totalSupply) *
                    100
                  }%`,
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Planned 24 Months
              </span>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  {planned24Months != null ? formatLocale(planned24Months) : <MissingValue>4,200</MissingValue>}{" "}
                  units
                </span>
                <Badge className="bg-blue-100 text-blue-800">Planned</Badge>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="h-4 rounded-full bg-blue-500"
                style={{
                  width: `${
                    (displayPlanned24Months / totalSupply) *
                    100
                  }%`,
                }}
              />
            </div>

            <div className="pt-4 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-800">
                  Total Supply
                </span>
                <Badge className="bg-gray-100 text-gray-800">
                  {formatLocale(totalSupply) ?? 0} units
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quarterly Delivery Schedule - Histogram */}
      <Card className="hover:shadow-lg transition-shadow mb-8">
        <CardHeader>
          <h3 className="text-xl font-semibold text-gray-800">
            Quarterly Delivery Schedule
          </h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Histogram Bars */}
            <div className="flex items-end justify-between space-x-4 h-48">
              {deliveryByQuarter.map((quarter: { quarter?: string | null; units?: number | null }, index: number) => {
                  const safeMaxUnits = maxUnits || 1;
                  const barHeight = ((quarter.units ?? 0) / safeMaxUnits) * 100;
                  return (
                    <div
                      key={index}
                      className="flex-1 flex flex-col items-center"
                    >
                      {/* Value Label above Bar */}
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        {quarter.units != null ? formatLocale(quarter.units) : <MissingValue>0</MissingValue>}
                      </div>

                      {/* Bar */}
                      <div
                        className="w-16 bg-blue-600 border border-blue-700 rounded-t-lg transition-all duration-300 hover:bg-blue-700"
                        style={{ height: `${Math.max(barHeight, 20)}px` }}
                      />

                      {/* Quarter Label below Bar */}
                      <div className="mt-2 text-xs font-medium text-gray-600 text-center">
                        {quarter.quarter ? <MissingValue>{quarter.quarter}</MissingValue> : <MissingValue>Q1 2025</MissingValue>}
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            {/* Legend and Summary */}
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span className="text-sm text-gray-600">
                      Delivery Units
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-800">
                    Total:{" "}
                  </span>
                  <Badge className="bg-blue-100 text-blue-800">
                    {formatLocale(deliveryByQuarter.reduce((sum: number, q: { units?: number | null }) => sum + (q.units ?? 0), 0))}{" "}
                    units
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Market Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <h3 className="text-xl font-semibold text-gray-800">
              Supply Utilization
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">
                    {formatFixed(supplyUtilization, 1) ?? "0"}%
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Current supply utilization
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Available Units</span>
                  <Badge variant="outline" className="border-gray-200">
                    {currentInventory != null ? formatLocale(currentInventory) : <MissingValue>12,500</MissingValue>}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Pipeline Units</span>
                  <Badge variant="outline" className="border-gray-200">
                    {(underConstruction != null && planned24Months != null) 
                      ? formatLocale(underConstruction + planned24Months)
                      : <MissingValue>6,650</MissingValue>}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Market</span>
                  <Badge variant="outline" className="border-gray-200">
                    {formatLocale(totalSupply)}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <h3 className="text-xl font-semibold text-gray-800">
              Occupancy Trends
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
                <div className="text-center">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-green-600">
                    {averageOccupancy != null ? `${formatFixed(averageOccupancy, 1)}%` : <MissingValue>93.5%</MissingValue>}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Current market occupancy
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Market Status</span>
                  <Badge
                    className={getOccupancyColor(averageOccupancy)}
                    >
                      {content?.marketStatus ?? null}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Demand Trend</span>
                  <Badge className="bg-green-100 text-green-800">
                    {content?.demandTrend ?? null}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Supply Pressure</span>
                  <Badge className="bg-red-100 text-red-800">
                    {content?.supplyPressure ?? null}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Market Insights */}
      <Card className="hover:shadow-lg transition-shadow mb-8">
        <CardHeader>
          <h3 className="text-xl font-semibold text-gray-800">
            Market Insights
          </h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">
                Supply Strengths
              </h4>
              <ul className="space-y-2 text-sm text-gray-600">
                {['supplyStrength1', 'supplyStrength2', 'supplyStrength3'].map((field) => {
                  const insight = insights?.[field];
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
                Market Opportunities
              </h4>
              <ul className="space-y-2 text-sm text-gray-600">
                {['marketOpportunity1', 'marketOpportunity2', 'marketOpportunity3'].map((field) => {
                  const insight = insights?.[field];
                  return insight ? (
                    <li key={field} className="flex items-center">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>{insight}</span>
                    </li>
                  ) : null;
                })}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Risk Factors</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                {['riskFactor1', 'riskFactor2', 'riskFactor3'].map((field) => {
                  const insight = insights?.[field];
                  return insight ? (
                    <li key={field} className="flex items-center">
                      <span className="text-gray-800 mr-2">•</span>
                      <span className="text-gray-800">{insight}</span>
                    </li>
                  ) : null;
                })}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Supply Map */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <h3 className="text-xl font-semibold text-gray-800">
            Interactive Supply Map
          </h3>
          <p className="text-sm text-gray-600">
            Click on properties to view detailed supply information
          </p>
        </CardHeader>
        <CardContent>
          <SupplyDemandMap />
        </CardContent>
      </Card>
    </div>
  );
}
