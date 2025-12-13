/**
 * OM Empty State Component
 * 
 * Reusable empty state display for missing OM field values.
 * Shows "N/A" when a field value is not available.
 */

import React from "react";

interface OMEmptyStateProps {
	label?: string;
	className?: string;
}

export function OMEmptyState({ label, className = "" }: OMEmptyStateProps) {
	return (
		<span className={`text-gray-400 italic ${className}`}>
			{label || "N/A"}
		</span>
	);
}

