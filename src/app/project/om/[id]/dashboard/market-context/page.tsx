// src/app/project/om/[id]/dashboard/market-context/page.tsx
"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useProjects } from "@/hooks/useProjects";
import { QuadrantGrid } from "@/components/om/QuadrantGrid";
import { Users, Briefcase, Building2, Zap } from "lucide-react";
import PopulationHeatmap from "@/components/om/PopulationHeatmap";
import EmploymentMap from "@/components/om/EmploymentMap";
import SupplyDemandMap from "@/components/om/SupplyDemandMap";
import { useOMPageHeader } from "@/hooks/useOMPageHeader";

export default function MarketContextPage() {
  const params = useParams();
  const projectId = params?.id as string;
  const { getProject } = useProjects();
  const project = projectId ? getProject(projectId) : null;

  useOMPageHeader({
    subtitle: project
      ? "Macro demographics, employment drivers, and supply-demand signals."
      : undefined,
  });

  if (!project) return <div>Project not found</div>;

  const quadrants = [
    {
      id: "macro-demographics",
      title: "Macro & Demographics",
      icon: Users,
      color: "from-blue-400 to-blue-500",
      href: `/project/om/${projectId}/dashboard/market-context/demographics`,
      metrics: (
        <div className="space-y-3">
          <PopulationHeatmap compact={true} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-gray-500">Population</p>
              <p className="text-sm font-medium"><span className="text-red-600">425,000</span></p>
            </div>
            <div>
              <p className="text-xs text-gray-500">5yr Growth</p>
              <p className="text-sm font-medium text-green-600"><span className="text-red-600">+14.2%</span></p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Median Age</p>
              <p className="text-sm font-medium"><span className="text-red-600">32.5</span></p>
            </div>
            <div>
              <p className="text-xs text-gray-500">College Grad%</p>
              <p className="text-sm font-medium"><span className="text-red-600">45%</span></p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "employment-drivers",
      title: "Employment Drivers",
      icon: Briefcase,
      color: "from-green-400 to-green-500",
      href: `/project/om/${projectId}/dashboard/market-context/employment`,
      metrics: (
        <div className="space-y-3">
          <EmploymentMap compact={true} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-gray-500">Unemployment</p>
              <p className="text-sm font-medium text-green-600"><span className="text-red-600">3.2%</span></p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Job Growth</p>
              <p className="text-sm font-medium text-green-600"><span className="text-red-600">+3.5%</span></p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Jobs</p>
              <p className="text-sm font-medium"><span className="text-red-600">42,000</span></p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Avg Growth</p>
              <p className="text-sm font-medium text-green-600"><span className="text-red-600">+8.2%</span></p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "supply-pipeline",
      title: "Supply Pipeline",
      icon: Building2,
      color: "from-blue-400 to-blue-500",
      href: `/project/om/${projectId}/dashboard/market-context/supply-demand`,
      metrics: (
        <div className="space-y-3">
          <SupplyDemandMap compact={true} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-gray-500">Units U/C</p>
              <p className="text-sm font-medium"><span className="text-red-600">2,450</span></p>
            </div>
            <div>
              <p className="text-xs text-gray-500">24mo Pipeline</p>
              <p className="text-sm font-medium"><span className="text-red-600">4,200</span></p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Current Supply</p>
              <p className="text-sm font-medium"><span className="text-red-600">12,500</span></p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Occupancy</p>
              <p className="text-sm font-medium text-green-600"><span className="text-red-600">93.5%</span></p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "regulatory-incentives",
      title: "Regulatory / Incentives",
      icon: Zap,
      color: "from-green-400 to-green-500",
      href: `/project/om/${projectId}/dashboard/market-context/regulatory-incentives`,
      metrics: (
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-green-50 rounded">
              <span className="text-sm">Opportunity Zone</span>
              <span className="text-xs text-green-700 font-medium">
                <span className="text-red-600">Qualified</span>
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
              <span className="text-sm">Tax Abatement</span>
              <span className="text-xs text-blue-700 font-medium">
                <span className="text-red-600">10 Years</span>
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm">Impact Fees</span>
              <span className="text-xs text-gray-700 font-medium"><span className="text-red-600">$12/SF</span></span>
            </div>
          </div>
          <div className="pt-2 border-t">
            <p className="text-xs text-gray-500 mb-1">Total Incentive Value</p>
            <p className="text-xl font-semibold text-green-600"><span className="text-red-600">$2.4M</span></p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <QuadrantGrid quadrants={quadrants} />
    </div>
  );
}
