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
import { useOmContent } from "@/hooks/useOmContent";
import { parseNumeric, formatLocale } from "@/lib/om-utils";
import { OMEmptyState } from "@/components/om/OMEmptyState";

export default function MarketContextPage() {
	const params = useParams();
	const projectId = params?.id as string;
	const { getProject } = useProjects();
	const project = projectId ? getProject(projectId) : null;
	const { content } = useOmContent();

	useOMPageHeader({
		subtitle: project
			? "Macro demographics, employment drivers, and supply-demand signals."
			: undefined,
	});

	if (!project) return <div>Project not found</div>;

	// Extract values from flat fields only
	const population = parseNumeric(content?.population3Mi) ?? null;
	const popGrowth = content?.popGrowth201020 ?? null;
	const medianAge =
		parseNumeric(content?.medianAge3Mi) ??
		parseNumeric(content?.medianAge1Mi) ??
		null;
	const collegeGrad = content?.bachelorsDegreePercent ?? null;

	const unemployment = content?.unemploymentRate ?? null;
	const jobGrowth = content?.projGrowth202429 ?? null;
	const totalJobs = parseNumeric(content?.totalJobs) ?? null;
	const avgGrowth = content?.avgGrowth ?? null;

	// Supply metrics - read from flat fields only
	const unitsUC = parseNumeric(content?.underConstruction) ?? null;
	const pipeline24mo = parseNumeric(content?.planned24Months) ?? null;
	const currentSupply = parseNumeric(content?.currentInventory) ?? null;
	const occupancy = content?.averageOccupancy ?? null;

	const oppZone = content?.opportunityZone ? "Qualified" : null;
	const taxAbatement = content?.exemptionTerm
		? `${content.exemptionTerm} Years`
		: null;
	const impactFees = content?.impactFees ?? null;
	const totalIncentiveValue = parseNumeric(content?.totalIncentiveValue);
	const totalIncentive = totalIncentiveValue
		? `$${formatLocale(totalIncentiveValue)}`
		: null;

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
							<p className="text-sm font-medium">
								{population != null ? (
									formatLocale(parseNumeric(population)) ??
									population
								) : (
									<OMEmptyState />
								)}
							</p>
						</div>
						<div>
							<p className="text-xs text-gray-500">5yr Growth</p>
							<p className="text-sm font-medium text-green-600">
								{popGrowth != null ? (
									`+${popGrowth}%`
								) : (
									<OMEmptyState />
								)}
							</p>
						</div>
						<div>
							<p className="text-xs text-gray-500">Median Age</p>
							<p className="text-sm font-medium">
								{medianAge != null ? (
									medianAge
								) : (
									<OMEmptyState />
								)}
							</p>
						</div>
						<div>
							<p className="text-xs text-gray-500">
								College Grad%
							</p>
							<p className="text-sm font-medium">
								{collegeGrad != null ? (
									`${collegeGrad}%`
								) : (
									<OMEmptyState />
								)}
							</p>
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
							<p className="text-xs text-gray-500">
								Unemployment
							</p>
							<p className="text-sm font-medium text-green-600">
								{unemployment != null ? (
									`${unemployment}%`
								) : (
									<OMEmptyState />
								)}
							</p>
						</div>
						<div>
							<p className="text-xs text-gray-500">Job Growth</p>
							<p className="text-sm font-medium text-green-600">
								{jobGrowth != null ? (
									`+${jobGrowth}%`
								) : (
									<OMEmptyState />
								)}
							</p>
						</div>
						<div>
							<p className="text-xs text-gray-500">Total Jobs</p>
							<p className="text-sm font-medium">
								{totalJobs != null ? (
									formatLocale(totalJobs)
								) : (
									<OMEmptyState />
								)}
							</p>
						</div>
						<div>
							<p className="text-xs text-gray-500">Avg Growth</p>
							<p className="text-sm font-medium text-green-600">
								{avgGrowth != null ? (
									`+${avgGrowth.toFixed(1)}%`
								) : (
									<OMEmptyState />
								)}
							</p>
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
							<p className="text-sm font-medium">
								{unitsUC != null ? (
									formatLocale(unitsUC)
								) : (
									<OMEmptyState />
								)}
							</p>
						</div>
						<div>
							<p className="text-xs text-gray-500">
								24mo Pipeline
							</p>
							<p className="text-sm font-medium">
								{pipeline24mo != null ? (
									formatLocale(pipeline24mo)
								) : (
									<OMEmptyState />
								)}
							</p>
						</div>
						<div>
							<p className="text-xs text-gray-500">
								Current Supply
							</p>
							<p className="text-sm font-medium">
								{currentSupply != null ? (
									formatLocale(currentSupply)
								) : (
									<OMEmptyState />
								)}
							</p>
						</div>
						<div>
							<p className="text-xs text-gray-500">Occupancy</p>
							<p className="text-sm font-medium text-green-600">
								{occupancy != null ? (
									occupancy
								) : (
									<OMEmptyState />
								)}
							</p>
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
						{oppZone && (
							<div className="flex items-center justify-between p-2 bg-green-50 rounded">
								<span className="text-sm">
									Opportunity Zone
								</span>
								<span className="text-xs text-green-700 font-medium">
									{oppZone}
								</span>
							</div>
						)}
						{taxAbatement && (
							<div className="flex items-center justify-between p-2 bg-blue-50 rounded">
								<span className="text-sm">Tax Abatement</span>
								<span className="text-xs text-blue-700 font-medium">
									{taxAbatement}
								</span>
							</div>
						)}
						{impactFees && (
							<div className="flex items-center justify-between p-2 bg-gray-50 rounded">
								<span className="text-sm">Impact Fees</span>
								<span className="text-xs text-gray-700 font-medium">
									{impactFees}
								</span>
							</div>
						)}
					</div>
					{totalIncentive && (
						<div className="pt-2 border-t">
							<p className="text-xs text-gray-500 mb-1">
								Total Incentive Value
							</p>
							<p className="text-xl font-semibold text-green-600">
								{totalIncentive}
							</p>
						</div>
					)}
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
