// src/app/project/om/[id]/dashboard/deal-snapshot/capital-stack/page.tsx
"use client";

import React from "react";
import { useOMDashboard } from "@/contexts/OMDashboardContext";
import { MetricCard } from "@/components/om/widgets/MetricCard";
import dynamic from "next/dynamic";

const MiniChart = dynamic(
  () => import("@/components/om/widgets/MiniChart").then((m) => ({ default: m.MiniChart })),
  { ssr: false }
);
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp, FileText, AlertTriangle } from "lucide-react";
import { useOMPageHeader } from "@/hooks/useOMPageHeader";
import { useOmContent } from "@/hooks/useOmContent";
import { formatFixed, parseNumeric, formatCurrency } from "@/lib/om-utils";
import { useOMProject } from "@/hooks/useOMProject";
import { buildCapitalSources, buildCapitalUses } from "@/lib/om-display";

export default function CapitalStackPage() {
	const { project, dealType } = useOMProject();
	const { scenario } = useOMDashboard();
	const { content, insights } = useOmContent();

	// Build capitalStackData from flat fields
	const totalCapitalization =
		parseNumeric(content?.totalCapitalization) ??
		parseNumeric(content?.totalDevelopmentCost) ??
		0;
	const sources = buildCapitalSources(content, dealType);
	const totalSources = sources.reduce((sum, item) => sum + item.amount, 0);
	const uses = buildCapitalUses(content, dealType);
	const totalUses = uses.reduce((sum, item) => sum + item.amount, 0);

	// Build debt terms
	const interestRate = content?.interestRate ?? null;
	const allInRate = content?.allInRate ?? null;
	const rateDisplay =
		allInRate != null
			? `${allInRate}% all-in`
			: interestRate != null
			? `${interestRate}%`
			: null;
	const floorRate =
		content?.floorRate != null ? `${content.floorRate}%` : null;
	const requestedTerm = content?.requestedTerm ?? null;
	const extensions = content?.extensions ?? null;
	const recourse = content?.recoursePreference ?? content?.recourse ?? null;
	const originationFee =
		content?.originationFee ??
		(content?.loanFees
			? typeof content.loanFees === "number"
				? `${content.loanFees}%`
				: content.loanFees
			: null);
	const exitFee = content?.exitFee ?? null;
	const taxInsuranceReserve = content?.taxInsuranceReserve ?? null;
	const capExReserve = content?.capExReserve ?? null;
	const interestReserveDisplay =
		parseNumeric(content?.interestReserve) != null &&
		(parseNumeric(content?.interestReserve) ?? 0) > 0
			? formatCurrency(parseNumeric(content?.interestReserve))
			: null;
	const taxInsuranceReserveDisplay =
		taxInsuranceReserve != null
			? formatCurrency(taxInsuranceReserve)
			: null;
	const capExReserveDisplay =
		capExReserve != null ? formatCurrency(capExReserve) : null;

	const debtTerms = {
		loanType: content?.loanType ?? null,
		lender: content?.lender ?? null,
		rate: rateDisplay,
		floor: floorRate,
		term: requestedTerm != null ? `${requestedTerm} years` : null,
		extension: extensions,
		recourse: recourse,
		origination: originationFee,
		exitFee: exitFee,
		reserves: {
			interest: interestReserveDisplay,
			taxInsurance: taxInsuranceReserveDisplay,
			capEx: capExReserveDisplay,
		},
	};

	// Build scenario data (base/upside/downside all use same data for now)
	const data = {
		totalCapitalization: totalCapitalization || totalSources,
		sources: sources,
		uses: uses,
		debtTerms: debtTerms,
	};

	const primaryDebt = sources[0] ?? null;
	const formatPercent = (value: number | null | undefined) =>
		value != null ? `${formatFixed(value, 2)}%` : null;
	const formatMillions = (value: number | null | undefined) =>
		value != null
			? `$${formatFixed(value / 1_000_000, 1) ?? "0.0"}M`
			: null;

	useOMPageHeader({
		subtitle: project
			? "Breakdown of senior debt, equity, and how total capitalization is deployed."
			: undefined,
	});

	if (!project) return <div>Project not found</div>;

	const sourcesChartData = sources.map(
		(source: { type?: string | null; percentage?: number | null }) => ({
			name: source.type ?? null,
			value: source.percentage ?? 0,
		})
	);

	const usesChartData = uses.map(
		(use: { type?: string | null; percentage?: number | null }) => ({
			name: use.type ?? null,
			value: use.percentage ?? 0,
		})
	);

	return (
		<div className="space-y-8">
			<div className="flex items-center justify-end">
				<div className="text-sm text-gray-500">
					Current Scenario:{" "}
					<span className="font-medium capitalize">{scenario}</span>
				</div>
			</div>

			{/* Summary Metrics */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<MetricCard
					label="Total Capitalization"
					value={data?.totalCapitalization ?? null}
					format="currency"
					size="lg"
					dataSourceFields={[
						"total capitalization",
						"loan amount requested",
						"sponsor equity",
					]}
				/>
				<MetricCard
					label="Loan to Cost"
					value={
						parseNumeric(content?.ltc) ??
						primaryDebt?.percentage ??
						null
					}
					format="percent"
					size="lg"
					dataSourceFields={["loan to cost", "ltv"]}
				/>
				<MetricCard
					label="Equity Contribution"
					value={
						parseNumeric(content?.equityContribution) ??
						(primaryDebt?.percentage != null
							? 100 - primaryDebt.percentage
							: null)
					}
					format="percent"
					size="lg"
					dataSourceFields={["equity contribution", "sponsor equity"]}
				/>
			</div>

			{/* Sources & Uses Overview */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				{/* Sources */}
				<Card>
					<CardHeader dataSourceSection="capital stack">
						<div className="flex items-center">
							<DollarSign className="h-6 w-6 text-blue-600 mr-2" />
							<h3 className="text-xl font-semibold text-gray-800">
								Capital Sources
							</h3>
						</div>
					</CardHeader>
					<CardContent>
						<div className="mb-6">
							<MiniChart
								type="pie"
								data={sourcesChartData}
								height={120}
								colors={["#3B82F6", "#0EA5E9", "#60A5FA", "#93C5FD"]}
							/>
						</div>

						<div className="space-y-3">
							{sources.map(
								(
									source: {
										type?: string | null;
										amount?: number | null;
										percentage?: number | null;
									},
									idx: number
								) => (
									<div
										key={idx}
										className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
									>
										<div>
											<p className="font-medium text-gray-800">
												{source.type}
											</p>
											{source.type?.includes("Loan") &&
												rateDisplay && (
													<p className="text-sm text-gray-600">
														Rate: {rateDisplay}
													</p>
												)}
											{source.type?.includes("Equity") &&
												content?.equityContributionDescription && (
													<p className="text-sm text-gray-600">
														{
															content.equityContributionDescription
														}
													</p>
												)}
										</div>
										<div className="text-right">
											<p className="text-lg font-bold text-gray-800">
												{formatMillions(source.amount)}
											</p>
											<p className="text-sm text-gray-600">
												{formatPercent(
													source.percentage
												)}
											</p>
										</div>
									</div>
								)
							)}
						</div>
					</CardContent>
				</Card>

				{/* Uses */}
				<Card>
					<CardHeader dataSourceSection="sources & uses">
						<div className="flex items-center">
							<TrendingUp className="h-6 w-6 text-blue-600 mr-2" />
							<h3 className="text-xl font-semibold text-gray-800">
								Capital Uses
							</h3>
						</div>
					</CardHeader>
					<CardContent>
						<div className="mb-6">
							<MiniChart
								type="pie"
								data={usesChartData}
								height={120}
								colors={["#1D4ED8", "#2563EB", "#3B82F6", "#60A5FA"]}
							/>
						</div>

						<div className="space-y-3">
							{uses.map(
								(
									use: {
										type?: string | null;
										timing?: string | null;
										amount?: number | null;
										percentage?: number | null;
									},
									idx: number
								) => (
									<div
										key={idx}
										className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
									>
										<div>
											<p className="font-medium text-gray-800">
												{use.type}
											</p>
											<p className="text-sm text-gray-600">
												Timing: {use.timing}
											</p>
										</div>
										<div className="text-right">
											<p className="text-lg font-bold text-gray-800">
												{formatMillions(use.amount)}
											</p>
											<p className="text-sm text-gray-600">
												{formatPercent(use.percentage)}
											</p>
										</div>
									</div>
								)
							)}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Debt Terms */}
			<Card>
				<CardHeader dataSourceSection="key terms">
					<div className="flex items-center">
						<FileText className="h-6 w-6 text-blue-600 mr-2" />
						<h3 className="text-xl font-semibold text-gray-800">
							Debt Terms
						</h3>
					</div>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						<div className="space-y-3">
							<div className="p-3 bg-blue-50 rounded-lg">
								<p className="text-sm text-gray-600">
									Loan Type
								</p>
								<p className="font-medium text-gray-800">
									{data?.debtTerms?.loanType ?? null}
								</p>
							</div>
							<div className="p-3 bg-blue-50 rounded-lg">
								<p className="text-sm text-gray-600">Lender</p>
								<p className="font-medium text-gray-800">
									{data?.debtTerms?.lender ?? null}
								</p>
							</div>
							<div className="p-3 bg-blue-50 rounded-lg">
								<p className="text-sm text-gray-600">Rate</p>
								<p className="font-medium text-gray-800">
									{data?.debtTerms?.rate ?? null}
								</p>
							</div>
						</div>

						<div className="space-y-3">
							<div className="p-3 bg-green-50 rounded-lg">
								<p className="text-sm text-gray-600">
									Floor Rate
								</p>
								<p className="font-medium text-gray-800">
									{data?.debtTerms?.floor ?? null}
								</p>
							</div>
							<div className="p-3 bg-green-50 rounded-lg">
								<p className="text-sm text-gray-600">Term</p>
								<p className="font-medium text-gray-800">
									{data?.debtTerms?.term ?? null}
								</p>
							</div>
							<div className="p-3 bg-green-50 rounded-lg">
								<p className="text-sm text-gray-600">
									Extensions
								</p>
								<p className="font-medium text-gray-800">
									{data?.debtTerms?.extension ?? null}
								</p>
							</div>
						</div>

						<div className="space-y-3">
							<div className="p-3 bg-red-50 rounded-lg">
								<p className="text-sm text-gray-600">
									Recourse
								</p>
								<p className="font-medium text-gray-800">
									{data?.debtTerms?.recourse ?? null}
								</p>
							</div>
							<div className="p-3 bg-red-50 rounded-lg">
								<p className="text-sm text-gray-600">
									Origination Fee
								</p>
								<p className="font-medium text-gray-800">
									{data?.debtTerms?.origination ?? null}
								</p>
							</div>
							<div className="p-3 bg-red-50 rounded-lg">
								<p className="text-sm text-gray-600">
									Exit Fee
								</p>
								<p className="font-medium text-gray-800">
									{data?.debtTerms?.exitFee ?? null}
								</p>
							</div>
						</div>
					</div>

					{/* Reserves */}
					<div className="mt-6 pt-6 border-t border-gray-200">
						<h4 className="text-lg font-semibold text-gray-800 mb-4">
							Lender Reserves
						</h4>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div className="p-3 bg-gray-50 rounded-lg">
								<p className="text-sm text-gray-600">
									Interest Reserve
								</p>
								<p className="font-medium text-gray-800">
									{data?.debtTerms?.reserves?.interest ??
										null}
								</p>
							</div>
							<div className="p-3 bg-gray-50 rounded-lg">
								<p className="text-sm text-gray-600">
									Tax & Insurance
								</p>
								<p className="font-medium text-gray-800">
									{data?.debtTerms?.reserves?.taxInsurance ??
										null}
								</p>
							</div>
							<div className="p-3 bg-gray-50 rounded-lg">
								<p className="text-sm text-gray-600">
									CapEx Reserve
								</p>
								<p className="font-medium text-gray-800">
									{data?.debtTerms?.reserves?.capEx ?? null}
								</p>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Key Risks & Mitigants */}
			<Card>
				<CardHeader>
					<div className="flex items-center">
						<AlertTriangle className="h-6 w-6 text-red-600 mr-2" />
						<h3 className="text-xl font-semibold text-gray-800">
							Key Risks & Mitigants
						</h3>
					</div>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="space-y-3">
							<h4 className="font-medium text-gray-800">
								Construction Risk
							</h4>
							<div className="p-3 bg-red-50 rounded-lg">
								<p className="text-sm text-red-700">
									<strong>Risk:</strong>{" "}
									{insights?.capitalRisk1 ?? null}
								</p>
								<p className="text-sm text-green-700 mt-1">
									<strong>Mitigant:</strong>{" "}
									{insights?.capitalMitigant1 ?? null}
								</p>
							</div>
						</div>

						<div className="space-y-3">
							<h4 className="font-medium text-gray-800">
								Interest Rate Risk
							</h4>
							<div className="p-3 bg-red-50 rounded-lg">
								<p className="text-sm text-red-700">
									<strong>Risk:</strong>{" "}
									{insights?.capitalRisk2 ?? null}
								</p>
								<p className="text-sm text-green-700 mt-1">
									<strong>Mitigant:</strong>{" "}
									{insights?.capitalMitigant2 ?? null}
								</p>
							</div>
						</div>

						<div className="space-y-3">
							<h4 className="font-medium text-gray-800">
								Pre-Leasing Risk
							</h4>
							<div className="p-3 bg-red-50 rounded-lg">
								<p className="text-sm text-red-700">
									<strong>Risk:</strong>{" "}
									{insights?.capitalRisk3 ?? null}
								</p>
								<p className="text-sm text-green-700 mt-1">
									<strong>Mitigant:</strong>{" "}
									{insights?.capitalMitigant3 ?? null}
								</p>
							</div>
						</div>

						<div className="space-y-3">
							<h4 className="font-medium text-gray-800">
								Exit Strategy Risk
							</h4>
							<div className="p-3 bg-red-50 rounded-lg">
								<p className="text-sm text-red-700">
									<strong>Risk:</strong>{" "}
									{insights?.exitStrategyRisk ?? null}
								</p>
								<p className="text-sm text-green-700 mt-1">
									<strong>Mitigant:</strong>{" "}
									{insights?.exitStrategyMitigant ?? null}
								</p>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
