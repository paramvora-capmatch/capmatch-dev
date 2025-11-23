// src/app/project/om/[id]/dashboard/page.tsx
"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useProjects } from "@/hooks/useProjects";
import { QuadrantGrid } from "@/components/om/QuadrantGrid";
import { MetricCard } from "@/components/om/widgets/MetricCard";
import { AIInsightsBar } from "@/components/om/AIInsightsBar";
import { ImageSlideshow } from "@/components/om/ImageSlideshow";
import { useOMDashboard } from "@/contexts/OMDashboardContext";
import { cn } from "@/utils/cn";
import {
  scenarioData,
  timelineData,
  marketContextDetails,
  projectOverview,
} from "@/services/mockOMData";
import {
  DollarSign,
  Building,
  TrendingUp,
  Users,
  TrendingDown,
  Minus,
} from "lucide-react";
import PopulationHeatmap from "@/components/om/PopulationHeatmap";

export default function OMDashboardPage() {
  const params = useParams();
  const projectId = params?.id as string;
  const { getProject } = useProjects();
  const project = projectId ? getProject(projectId) : null;
  const { scenario, setScenario } = useOMDashboard();
  const data = scenarioData[scenario];

  if (!project) {
    return <div>Project not found</div>;
  }

  const propertyStats = projectOverview.propertyStats;
  const populationGrowth = parseFloat(
    marketContextDetails.demographicProfile.growthTrends.populationGrowth5yr
  );
  const jobGrowth = parseFloat(
    marketContextDetails.demographicProfile.growthTrends.jobGrowth5yr
  );
  const quadrants = [
    {
      id: "deal-snapshot",
      title: "Deal Snapshot",
      icon: DollarSign,
      color: "from-blue-400 to-blue-500",
      href: `/project/om/${projectId}/dashboard/deal-snapshot`,
      description: "Capital requirements, key terms, and timeline",
      metrics: (
        <>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              label="Loan Amount"
              value={data.loanAmount}
              format="currency"
              dataSourceFields={['loan amount requested']}
            />
            <MetricCard 
              label="LTV" 
              value={data.ltv} 
              format="percent"
              dataSourceFields={['ltv']}
            />
          </div>
          <div className="mt-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
              Project Timeline
            </p>
            <div className="relative">
              {/* Mini Gantt Timeline */}
              <div className="flex items-center space-x-1 mb-2">
                {timelineData.map((item, idx) => (
                  <div key={idx} className="flex-1 relative">
                    <div className="text-xs text-gray-500 text-center mb-1 truncate">
                      {item.phase.split(" ")[0]}
                    </div>
                    <div
                      className={`h-3 rounded-full ${
                        item.status === "completed"
                          ? "bg-green-500"
                          : item.status === "current"
                          ? "bg-blue-500"
                          : "bg-gray-200"
                      }`}
                    />
                    {item.status === "current" && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                    )}
                  </div>
                ))}
              </div>
              {/* Today marker */}
              <div className="flex justify-center">
                <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                  Today
                </div>
              </div>
            </div>
          </div>
        </>
      ),
    },
    {
      id: "asset-profile",
      title: "Asset Profile",
      icon: Building,
      color: "from-green-400 to-green-500",
      href: `/project/om/${projectId}/dashboard/asset-profile`,
      description: "Property details, unit mix, and comparables",
      metrics: (
        <>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Total Units" value={propertyStats.totalResidentialUnits} />
            <MetricCard
              label="Gross Building Area"
              value={`${propertyStats.grossBuildingArea.toLocaleString()} SF`}
            />
          </div>
          <div className="mt-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
              Property Stats
            </p>
            <div className="space-y-3">
              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2 rounded hover:bg-gray-100 transition-colors duration-200">
                <div className="text-center">
                  <div className="text-xl font-bold text-green-600">
                    {projectOverview.propertyStats.parkingRatio.toFixed(2)}x
                  </div>
                  <div className="text-xs text-gray-500">Parking Ratio</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-600">
                    {projectOverview.propertyStats.affordableUnits}
                  </div>
                  <div className="text-xs text-gray-500">Workforce Units</div>
                </div>
              </div>
            </div>
          </div>
        </>
      ),
    },
    {
      id: "market-context",
      title: "Market Context",
      icon: TrendingUp,
      color: "from-blue-400 to-blue-500",
      href: `/project/om/${projectId}/dashboard/market-context`,
      description: "Demographics, employment, and supply dynamics",
      metrics: (
        <>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              label="Population Growth"
              value={populationGrowth}
              format="percent"
              change={0.4}
            />
            <MetricCard
              label="Job Growth"
              value={jobGrowth}
              format="percent"
              change={0.6}
            />
          </div>
          <div className="mt-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
              Supply Pipeline
            </p>
            <div className="space-y-2">
              {/* Population Heatmap Preview */}
              <div className="h-16 bg-gray-50 rounded-lg overflow-hidden">
                <PopulationHeatmap compact={true} />
              </div>
              {/* Quick supply stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm">
                  <span className="text-gray-500">U/C:</span>
                  <span className="font-medium ml-1">
                    {marketContextDetails.supplyAnalysis.underConstruction.toLocaleString()}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Pipeline:</span>
                  <span className="font-medium ml-1">
                    {marketContextDetails.supplyAnalysis.planned24Months.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      ),
    },
    {
      id: "financial-sponsor",
      title: "Financial & Sponsor",
      icon: Users,
      color: "from-green-400 to-green-500",
      href: `/project/om/${projectId}/dashboard/financial-sponsor`,
      description: "Returns, sponsor track record, and sensitivity",
      metrics: (
        <>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Project IRR" value={data.irr} format="percent" />
            <MetricCard
              label="Equity Multiple"
              value={`${data.equityMultiple}x`}
            />
          </div>
          <div className="mt-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
              Returns by Scenario
            </p>
            <div className="space-y-3">
              {/* Enhanced Scenario Comparison */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    key: "downside",
                    label: "Downside",
                    irr: scenarioData.downside.irr,
                    color: "from-red-400 to-red-500",
                    icon: TrendingDown,
                  },
                  {
                    key: "base",
                    label: "Base",
                    irr: scenarioData.base.irr,
                    color: "from-blue-400 to-blue-500",
                    icon: Minus,
                  },
                  {
                    key: "upside",
                    label: "Upside",
                    irr: scenarioData.upside.irr,
                    color: "from-green-400 to-green-500",
                    icon: TrendingUp,
                  },
                ].map(({ key, label, irr, color, icon: Icon }) => (
                  <div key={key} className="text-center group cursor-pointer">
                    <div
                      className={`bg-gradient-to-br ${color} text-white text-sm p-2 rounded-lg mb-1 shadow-sm group-hover:shadow-lg group-hover:scale-105 transition-all duration-200`}
                    >
                      <Icon className="h-5 w-5 mx-auto group-hover:scale-110 transition-transform duration-200" />
                    </div>
                    <div className="text-xs text-gray-500 mb-1 group-hover:text-gray-700 transition-colors duration-200">
                      {label}
                    </div>
                    <div
                      className={`text-xl font-bold ${
                        key === "downside"
                          ? "text-red-600"
                          : key === "base"
                          ? "text-blue-600"
                          : "text-green-600"
                      } group-hover:scale-110 transition-transform duration-200`}
                    >
                      {irr}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Image Slideshow */}
      {project?.owner_org_id && (
        <ImageSlideshow
          projectId={projectId}
          orgId={project.owner_org_id}
          autoPlayInterval={5000}
          height="h-80 md:h-96"
        />
      )}

      {/* Case Switcher (Downside/Base/Upside) */}
      <div className="flex justify-center">
        <div className="inline-flex items-center bg-white rounded-lg shadow-sm border border-gray-200 p-1">
          <button
            onClick={() => setScenario('downside')}
            className={cn(
              "px-6 py-2 rounded-md text-sm font-medium transition-all duration-200",
              scenario === 'downside'
                ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md"
                : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
            )}
          >
            Downside
          </button>
          <button
            onClick={() => setScenario('base')}
            className={cn(
              "px-6 py-2 rounded-md text-sm font-medium transition-all duration-200",
              scenario === 'base'
                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md"
                : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
            )}
          >
            Base Case
          </button>
          <button
            onClick={() => setScenario('upside')}
            className={cn(
              "px-6 py-2 rounded-md text-sm font-medium transition-all duration-200",
              scenario === 'upside'
                ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md"
                : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
            )}
          >
            Upside
          </button>
        </div>
      </div>

      {/* CapMatch Deal Room Insights */}
      <AIInsightsBar scenario={scenario} />
      
      {/* Quadrant Cards */}
      <QuadrantGrid quadrants={quadrants} />
    </div>
  );
}
