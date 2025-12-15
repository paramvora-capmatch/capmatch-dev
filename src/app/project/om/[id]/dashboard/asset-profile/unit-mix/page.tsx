"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Home, DollarSign, Users } from "lucide-react";
import { useOMPageHeader } from "@/hooks/useOMPageHeader";
import { useOmContent } from "@/hooks/useOmContent";
import { formatLocale, formatFixed, parseNumeric } from "@/lib/om-utils";

type UnitMixUnit = {
	count?: number | null;
	avgSF?: number | null;
	rentRange?: string | null;
	deposit?: string | null;
};

export default function UnitMixPage() {
	const { content, insights } = useOmContent();

	// Access flat residentialUnitMix array directly
	const residentialUnitMix = Array.isArray(content?.residentialUnitMix)
		? content.residentialUnitMix
		: [];

	// Transform flat array to unit mix details structure for UI
	const unitMixDetails: Record<string, UnitMixUnit> = {};
	residentialUnitMix.forEach((unit: any) => {
		const unitType = unit.unitType || unit.type || "unknown";
		unitMixDetails[unitType] = {
			count: unit.unitCount || unit.units || 0,
			avgSF: unit.avgSF || unit.averageUnitSize || 0,
			rentRange: unit.monthlyRent ? `$${unit.monthlyRent}` : null,
			deposit: unit.deposit || null,
		};
	});

	const unitEntries = Object.entries(unitMixDetails) as [
		string,
		UnitMixUnit
	][];
	const totalUnits = unitEntries.reduce(
		(sum: number, [, unit]: [string, UnitMixUnit]) =>
			sum + (unit.count ?? 0),
		0
	);

	const totalRentableSF = unitEntries.reduce(
		(sum: number, [, unit]: [string, UnitMixUnit]) =>
			sum + (unit.count ?? 0) * (unit.avgSF ?? 0),
		0
	);

	const blendedAverageRent =
		totalUnits > 0
			? unitEntries.reduce(
					(sum: number, [, unit]: [string, UnitMixUnit]) => {
						const rentRange = unit.rentRange ?? "0";
						const [low, high] = rentRange
							.split("-")
							.map(
								(r: string) =>
									parseFloat(r.replace(/[^\d.]/g, "")) || 0
							);
						const avg = (low + high) / 2;
						return sum + avg * (unit.count ?? 0);
					},
					0
			  ) / totalUnits
			: 0;
	const blendedAverageRentDisplay =
		totalUnits > 0 ? Math.round(blendedAverageRent) : null;
	const avgSF =
		totalUnits > 0 ? Math.round(totalRentableSF / totalUnits) : null;

	const getUnitTypeColor = (
		type: string,
		format: "hex" | "tailwind" = "hex"
	) => {
		// Vibrant color palette with both hex and Tailwind values
		const colorMap: { [key: string]: { hex: string; tailwind: string } } = {
			studios: { hex: "#3B82F6", tailwind: "bg-blue-500" }, // Blue
			studio: { hex: "#3B82F6", tailwind: "bg-blue-500" },
			oneBed: { hex: "#10B981", tailwind: "bg-green-500" }, // Green
			"1bed": { hex: "#10B981", tailwind: "bg-green-500" },
			"1-bed": { hex: "#10B981", tailwind: "bg-green-500" },
			"1-bedroom": { hex: "#10B981", tailwind: "bg-green-500" },
			twoBed: { hex: "#8B5CF6", tailwind: "bg-purple-500" }, // Purple
			"2bed": { hex: "#8B5CF6", tailwind: "bg-purple-500" },
			"2-bed": { hex: "#8B5CF6", tailwind: "bg-purple-500" },
			"2-bedroom": { hex: "#8B5CF6", tailwind: "bg-purple-500" },
			threeBed: { hex: "#F59E0B", tailwind: "bg-amber-500" }, // Amber
			"3bed": { hex: "#F59E0B", tailwind: "bg-amber-500" },
			"3-bed": { hex: "#F59E0B", tailwind: "bg-amber-500" },
			"3-bedroom": { hex: "#F59E0B", tailwind: "bg-amber-500" },
			fourBed: { hex: "#EF4444", tailwind: "bg-red-500" }, // Red
			"4bed": { hex: "#EF4444", tailwind: "bg-red-500" },
			"4-bed": { hex: "#EF4444", tailwind: "bg-red-500" },
			"4-bedroom": { hex: "#EF4444", tailwind: "bg-red-500" },
		};

		// Try exact match first
		const lowerType = type.toLowerCase();
		if (colorMap[lowerType]) {
			return format === "hex"
				? colorMap[lowerType].hex
				: colorMap[lowerType].tailwind;
		}

		// Try partial match for variations
		for (const [key, value] of Object.entries(colorMap)) {
			if (lowerType.includes(key) || key.includes(lowerType)) {
				return format === "hex" ? value.hex : value.tailwind;
			}
		}

		// Fallback: generate consistent color from string hash
		const vibrantColors = [
			{ hex: "#3B82F6", tailwind: "bg-blue-500" }, // Blue
			{ hex: "#10B981", tailwind: "bg-green-500" }, // Green
			{ hex: "#8B5CF6", tailwind: "bg-purple-500" }, // Purple
			{ hex: "#F59E0B", tailwind: "bg-amber-500" }, // Amber
			{ hex: "#EF4444", tailwind: "bg-red-500" }, // Red
			{ hex: "#EC4899", tailwind: "bg-pink-500" }, // Pink
			{ hex: "#06B6D4", tailwind: "bg-cyan-500" }, // Cyan
			{ hex: "#84CC16", tailwind: "bg-lime-500" }, // Lime
		];

		// Hash the string to get a consistent color
		let hash = 0;
		for (let i = 0; i < type.length; i++) {
			hash = type.charCodeAt(i) + ((hash << 5) - hash);
		}
		const colorIndex = Math.abs(hash) % vibrantColors.length;
		const selectedColor = vibrantColors[colorIndex];

		return format === "hex" ? selectedColor.hex : selectedColor.tailwind;
	};

	const getUnitTypeLabel = (type: string) => {
		const labels: { [key: string]: string } = {
			studios: "Studio",
			oneBed: "1 Bedroom",
			twoBed: "2 Bedroom",
		};
		return labels[type] || type;
	};

	const calculatePieChartSegment = (
		count: number,
		total: number,
		startAngle: number
	) => {
		const percentage = count / total;
		const angle = percentage * 360;
		const endAngle = startAngle + angle;

		const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
		const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
		const x2 = 50 + 40 * Math.cos((endAngle * Math.PI) / 180);
		const y2 = 50 + 40 * Math.sin((endAngle * Math.PI) / 180);

		const largeArcFlag = angle > 180 ? 1 : 0;

		return {
			path: `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`,
			percentage: Math.round(percentage * 10000) / 100, // Round to 2 decimal places
			startAngle,
			endAngle,
		};
	};

	let currentAngle = 0;
	// Use residentialUnitMix array for detailed unit mix
	const detailedUnitMix = residentialUnitMix.map((unit: any) => ({
		code: unit.unitType || unit.type || "",
		type: unit.unitType || unit.type || "",
		units: unit.unitCount || unit.units || 0,
		avgSF: unit.avgSF || unit.averageUnitSize || 0,
	}));
	const pieSegments =
		totalUnits > 0
			? unitEntries.map(([type, unit]: [string, UnitMixUnit]) => {
					const segment = calculatePieChartSegment(
						unit.count ?? 0,
						totalUnits,
						currentAngle
					);
					currentAngle += ((unit.count ?? 0) / totalUnits) * 360;
					return { type, unit, ...segment };
			  })
			: [];

	useOMPageHeader({
		subtitle:
			"Distribution of unit types, sizes, rents, and pricing insights.",
	});

	return (
		<div className="space-y-6">
			{/* Unit Overview */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
				<Card className="hover:shadow-lg transition-shadow">
					<CardHeader
						className="pb-2"
						dataSourceFields={["total residential units"]}
					>
						<div className="flex items-center">
							<Home className="h-5 w-5 text-blue-500 mr-2" />
							<h3 className="text-lg font-semibold text-gray-800">
								Total Units
							</h3>
						</div>
					</CardHeader>
					<CardContent>
						<p className="text-3xl font-bold text-blue-600">
							{content?.totalResidentialUnits ?? totalUnits}
						</p>
						<p className="text-sm text-gray-500 mt-1">
							Residential units
						</p>
					</CardContent>
				</Card>

				<Card className="hover:shadow-lg transition-shadow">
					<CardHeader
						className="pb-2"
						dataSourceFields={["total residential nrsf"]}
					>
						<div className="flex items-center">
							<Users className="h-5 w-5 text-green-500 mr-2" />
							<h3 className="text-lg font-semibold text-gray-800">
								Total SF
							</h3>
						</div>
					</CardHeader>
					<CardContent>
						<p className="text-3xl font-bold text-green-600">
							{formatLocale(
								content?.totalResidentialNRSF ?? totalRentableSF
							) ?? 0}
						</p>
						<p className="text-sm text-gray-500 mt-1">
							Rentable square feet
						</p>
					</CardContent>
				</Card>

				<Card className="hover:shadow-lg transition-shadow">
					<CardHeader className="pb-2">
						<div className="flex items-center">
							<DollarSign className="h-5 w-5 text-blue-500 mr-2" />
							<h3 className="text-lg font-semibold text-gray-800">
								Avg Rent
							</h3>
						</div>
					</CardHeader>
					<CardContent>
						<p className="text-3xl font-bold text-blue-600">
							{blendedAverageRentDisplay != null
								? `$${
										formatLocale(
											blendedAverageRentDisplay
										) ?? 0
								  }`
								: null}
						</p>
						<p className="text-sm text-gray-500 mt-1">
							Per unit average
						</p>
					</CardContent>
				</Card>

				<Card className="hover:shadow-lg transition-shadow">
					<CardHeader className="pb-2">
						<h3 className="text-lg font-semibold text-gray-800">
							Avg SF
						</h3>
					</CardHeader>
					<CardContent>
						<p className="text-3xl font-bold text-red-600">
							{avgSF ?? null}
						</p>
						<p className="text-sm text-gray-500 mt-1">
							Per unit average
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Unit Mix Details */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
				{/* Unit Breakdown Table */}
				<Card className="hover:shadow-lg transition-shadow">
					<CardHeader dataSourceSection="unit mix">
						<h3 className="text-xl font-semibold text-gray-800">
							Unit Breakdown
						</h3>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{unitEntries.map(
								([type, unit]: [string, UnitMixUnit]) => (
									<div
										key={type}
										className="bg-gray-50 rounded-lg p-4 border-l-4 transition-all hover:shadow-md"
										style={{
											borderLeftColor: getUnitTypeColor(
												type,
												"hex"
											),
										}}
									>
										<div className="flex items-center justify-between mb-3">
											<h4 className="font-semibold text-gray-800">
												{getUnitTypeLabel(type)}
											</h4>
											<Badge
												className="text-white border-0"
												style={{
													backgroundColor:
														getUnitTypeColor(
															type,
															"hex"
														),
												}}
											>
												{unit.count} units
											</Badge>
										</div>
										<div className="grid grid-cols-2 gap-4 text-sm">
											<div>
												<p className="text-gray-500">
													Average SF
												</p>
												<p className="font-medium text-gray-800">
													{formatLocale(
														unit.avgSF ?? 0
													) ?? 0}{" "}
													SF
												</p>
											</div>
											<div>
												<p className="text-gray-500">
													Rent Range
												</p>
												<p className="font-medium text-gray-800">
													{unit.rentRange}
												</p>
											</div>
											<div>
												<p className="text-gray-500">
													Deposit
												</p>
												<p className="font-medium text-gray-800">
													{unit.deposit}
												</p>
											</div>
											<div>
												<p className="text-gray-500">
													Percentage
												</p>
												<p className="font-medium text-gray-800">
													{totalUnits > 0
														? `${Math.round(
																((unit.count ??
																	0) /
																	totalUnits) *
																	100
														  )}%`
														: null}
												</p>
											</div>
										</div>
									</div>
								)
							)}
						</div>
					</CardContent>
				</Card>

				{/* Pie Chart */}
				<Card className="hover:shadow-lg transition-shadow">
					<CardHeader>
						<h3 className="text-xl font-semibold text-gray-800">
							Unit Distribution
						</h3>
					</CardHeader>
					<CardContent>
						<div className="flex justify-center mb-6">
							<svg
								width="200"
								height="200"
								viewBox="0 0 100 100"
								className="transform -rotate-90"
							>
								{pieSegments.map((segment, index) => (
									<path
										key={index}
										d={segment.path}
										fill={getUnitTypeColor(
											segment.type,
											"hex"
										)}
										stroke="white"
										strokeWidth="2"
									/>
								))}
								<circle cx="50" cy="50" r="15" fill="white" />
							</svg>
						</div>

						<div className="space-y-3">
							{pieSegments.map((segment, index) => (
								<div
									key={index}
									className="flex items-center justify-between"
								>
									<div className="flex items-center">
										<div
											className="w-3 h-3 rounded-full mr-2"
											style={{
												backgroundColor:
													getUnitTypeColor(
														segment.type,
														"hex"
													),
											}}
										/>
										<span className="text-sm font-medium text-gray-800">
											{getUnitTypeLabel(segment.type)}
										</span>
									</div>
									<div className="text-right">
										<span className="text-sm font-semibold text-gray-800">
											{segment.percentage.toFixed(2)}%
										</span>
										<span className="text-xs text-gray-500 ml-1">
											(
											{
												(segment.unit as UnitMixUnit)
													.count
											}{" "}
											units)
										</span>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Pricing Analysis */}
			<Card className="hover:shadow-lg transition-shadow">
				<CardHeader>
					<h3 className="text-xl font-semibold text-gray-800">
						Pricing Analysis
					</h3>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div>
							<h4 className="font-semibold text-gray-800 mb-3">
								Rent per Square Foot
							</h4>
							<div className="space-y-2">
								{unitEntries.map(
									([type, unit]: [string, UnitMixUnit]) => {
										const avgRent =
											(unit.rentRange ?? "0")
												.split("-")
												.map((r: string) =>
													parseFloat(
														r.replace(/[^\d]/g, "")
													)
												)
												.reduce(
													(a: number, b: number) =>
														a + b,
													0
												) / 2;
										const rentPSF =
											avgRent / (unit.avgSF ?? 1);
										return (
											<div
												key={type}
												className="flex justify-between items-center"
											>
												<span className="text-sm text-gray-600">
													{getUnitTypeLabel(type)}
												</span>
												<Badge
													variant="outline"
													className="border-gray-200"
												>
													$
													{formatFixed(rentPSF, 2) ??
														"0.00"}
													/SF
												</Badge>
											</div>
										);
									}
								)}
							</div>
						</div>

						<div>
							<h4 className="font-semibold text-gray-800 mb-3">
								Deposit Requirements
							</h4>
							<div className="space-y-2">
								{unitEntries.map(
									([type, unit]: [string, UnitMixUnit]) => (
										<div
											key={type}
											className="flex justify-between items-center"
										>
											<span className="text-sm text-gray-600">
												{getUnitTypeLabel(type)}
											</span>
											<Badge
												variant="outline"
												className="border-gray-200"
											>
												{unit.deposit}
											</Badge>
										</div>
									)
								)}
							</div>
						</div>

						<div>
							<h4 className="font-semibold text-gray-800 mb-3">
								Market Positioning
							</h4>
							<div className="space-y-2">
								<div className="flex justify-between items-center">
									<span className="text-sm text-gray-600">
										Luxury Tier
									</span>
									<Badge className="bg-blue-100 text-blue-800">
										{content?.luxuryTier ?? null}
									</Badge>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-sm text-gray-600">
										Target Market
									</span>
									<Badge
										variant="outline"
										className="border-gray-200"
									>
										{content?.targetMarket ?? null}
									</Badge>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-sm text-gray-600">
										Competitive Position
									</span>
									<Badge className="bg-green-100 text-green-800">
										{content?.competitivePosition ?? null}
									</Badge>
								</div>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Detailed Unit Plans */}
			<Card className="hover:shadow-lg transition-shadow mt-8">
				<CardHeader>
					<h3 className="text-xl font-semibold text-gray-800">
						Detailed Unit Plans
					</h3>
					{content?.unitPlanDescription ? (
						<p className="text-sm text-gray-600">
							{content.unitPlanDescription}
						</p>
					) : null}
				</CardHeader>
				<CardContent>
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-gray-100 text-left">
									<th className="py-3 px-2 font-semibold text-gray-700">
										Plan
									</th>
									<th className="py-3 px-2 font-semibold text-gray-700">
										Type
									</th>
									<th className="py-3 px-2 font-semibold text-gray-700">
										Units
									</th>
									<th className="py-3 px-2 font-semibold text-gray-700">
										Avg SF
									</th>
								</tr>
							</thead>
							<tbody>
								{detailedUnitMix.map(
									(plan: {
										code?: string | null;
										type?: string | null;
										units?: number | null;
										avgSF?: number | null;
									}) => (
										<tr
											key={plan.code}
											className="border-b border-gray-50"
										>
											<td className="py-3 px-2 font-medium text-gray-800">
												{plan.code}
											</td>
											<td className="py-3 px-2 text-gray-600">
												{plan.type}
											</td>
											<td className="py-3 px-2 text-gray-600">
												{plan.units}
											</td>
											<td className="py-3 px-2 text-gray-600">
												{formatLocale(
													plan.avgSF ?? 0
												) ?? 0}{" "}
												SF
											</td>
										</tr>
									)
								)}
							</tbody>
						</table>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
