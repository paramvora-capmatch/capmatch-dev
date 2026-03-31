// src/hooks/useOMData.ts
import { useState, useEffect } from "react";
import { getLatestOM, getOMValue } from "@/lib/om-queries";
import { syncOMContent } from "@/lib/om-sync";

export function useOMData(projectId: string) {
	const [omData, setOmData] = useState<any>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		let mounted = true;

		async function fetchOMData() {
			try {
				setIsLoading(true);

				await syncOMContent(projectId);
				const data = await getLatestOM(projectId);

				if (mounted) {
					setOmData(data);
					setError(null);
				}
			} catch (err) {
				if (mounted) {
					setError(err as Error);
					setOmData(null);
				}
			} finally {
				if (mounted) {
					setIsLoading(false);
				}
			}
		}

		if (projectId) {
			fetchOMData();
		}

		return () => {
			mounted = false;
		};
	}, [projectId]);

	// Create a wrapper function that includes insights from omData
	const getOMValueWithInsights = (fieldId: string) => {
		if (!omData) return null;
		return getOMValue(omData.content, fieldId, omData.insights);
	};

	return {
		omData,
		isLoading,
		error,
		getOMValue: getOMValueWithInsights,
	};
}
