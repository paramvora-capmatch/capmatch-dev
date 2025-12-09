/**
 * OM Error State Component
 * 
 * Reusable error state display for OM pages.
 */

import React from "react";

interface OMErrorStateProps {
	error?: Error | null;
	message?: string;
}

export function OMErrorState({ error, message }: OMErrorStateProps) {
	return (
		<div className="flex items-center justify-center p-8">
			<div className="text-center">
				<p className="text-red-600 mb-2">Error loading OM data</p>
				<p className="text-sm text-gray-500">
					{error?.message || message || "No OM data available. Please trigger autofill first."}
				</p>
			</div>
		</div>
	);
}

