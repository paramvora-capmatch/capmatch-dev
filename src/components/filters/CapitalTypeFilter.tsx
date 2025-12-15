// components/filters/CapitalTypeFilter.tsx
"use client";

import React, { useState, memo, useCallback } from "react";
import { Info } from "lucide-react";
import { cn } from "@/utils/cn";

interface CapitalTypeFilterProps {
	value: string[];
	onChange: (newValue: string[]) => void;
}

const CapitalTypeFilter: React.FC<CapitalTypeFilterProps> = memo(
	({ value, onChange }) => {
		const [showTooltip, setShowTooltip] = useState(false);

		const capitalTypeOptions = [
			"Senior Debt",
			"Mezzanine",
			"Preferred Equity",
			"Common Equity",
			"JV Equity",
			"Other",
		];

		const handleToggle = useCallback(
			(option: string) => {
				const newValue = value.includes(option)
					? value.filter((v) => v !== option)
					: [...value, option];
				onChange(newValue);
			},
			[value, onChange]
		);

		const handleMouseEnter = useCallback(() => {
			setShowTooltip(true);
		}, []);

		const handleMouseLeave = useCallback(() => {
			setShowTooltip(false);
		}, []);

		return (
			<div className="mb-3">
				<div className="flex items-center mb-2">
					<h3 className="font-semibold text-base md:text-lg text-gray-800">
						Capital Type
					</h3>
					<div className="relative ml-2">
						<button
							type="button"
							className="focus:outline-none text-gray-400 hover:text-gray-600"
							onMouseEnter={handleMouseEnter}
							onMouseLeave={handleMouseLeave}
							aria-label="Capital Type Information"
						>
							<Info size={16} />
						</button>
						{showTooltip && (
							<div
								className="absolute z-10 w-64 p-2 mt-2 text-sm rounded-md shadow-lg -translate-x-1/2 left-1/2 bg-white text-gray-800 border border-gray-200"
								style={{
									fontSize: "clamp(14px, 0.875rem, 16px)",
								}}
							>
								Select the type of capital structure you&apos;re
								seeking. Different lenders specialize in
								different capital types.
							</div>
						)}
					</div>
				</div>
				<div className="flex flex-wrap gap-2">
					{capitalTypeOptions.map((option) => (
						<button
							key={option}
							type="button"
							className={cn(
								"px-3 py-1.5 text-sm rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-white",
								value.includes(option)
									? "bg-blue-500 text-white hover:bg-blue-600"
									: "bg-gray-200 text-gray-700 hover:bg-gray-300"
							)}
							onClick={() => handleToggle(option)}
						>
							{option}
						</button>
					))}
				</div>
			</div>
		);
	}
);

CapitalTypeFilter.displayName = "CapitalTypeFilter";

export default CapitalTypeFilter;
