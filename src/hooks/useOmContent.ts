"use client";

import { useParams } from "next/navigation";
import { useOMDataContext } from "@/contexts/OMDataContext";
import { useOMFieldLogger } from "@/hooks/useOMFieldLogger";
import { useOMPageTracking } from "@/hooks/useOMPageTracking";
import { createTrackedContent } from "@/lib/om-queries-client";

export function useOmContent() {
	const params = useParams();
	const projectId = params?.id as string;
	// Consume OM data from context instead of fetching independently
	const { omData, isLoading, error } = useOMDataContext();

	// Get logging and tracking hooks for field access logging
	const { logField } = useOMFieldLogger();
	const { page, subpage } = useOMPageTracking();

	// Get raw content and insights
	const rawContent = omData?.content ?? {};
	const rawInsights = omData?.insights ?? {};

	// Create tracked versions that log all property accesses
	const trackedContent = createTrackedContent(
		rawContent,
		logField,
		page,
		subpage,
		false // isInsight = false for content
	);

	const trackedInsights = createTrackedContent(
		rawInsights,
		logField,
		page,
		subpage,
		true // isInsight = true for insights
	);

	return {
		projectId,
		content: trackedContent,
		insights: trackedInsights,
		insights_metadata: omData?.insights_metadata ?? null,
		isLoading,
		error,
	};
}
