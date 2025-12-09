/**
 * OM Loading State Component
 * 
 * Reusable loading state display for OM pages.
 */

import React from "react";

interface OMLoadingStateProps {
	message?: string;
}

export function OMLoadingState({ message = "Loading OM data..." }: OMLoadingStateProps) {
	return (
		<div className="flex items-center justify-center p-8">
			{message}
		</div>
	);
}

