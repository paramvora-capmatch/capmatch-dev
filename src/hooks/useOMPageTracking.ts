"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";

const PAGE_MAP: Record<string, { page: string; subpage?: string }> = {
	"/dashboard": { page: "dashboard", subpage: "main" },
	"/dashboard/deal-snapshot": { page: "deal-snapshot", subpage: "main" },
	"/dashboard/deal-snapshot/key-terms": {
		page: "deal-snapshot",
		subpage: "key-terms",
	},
	"/dashboard/deal-snapshot/milestones": {
		page: "deal-snapshot",
		subpage: "milestones",
	},
	"/dashboard/deal-snapshot/capital-stack": {
		page: "deal-snapshot",
		subpage: "capital-stack",
	},
	"/dashboard/deal-snapshot/risk-analysis": {
		page: "deal-snapshot",
		subpage: "risk-analysis",
	},
	"/dashboard/asset-profile": { page: "asset-profile", subpage: "main" },
	"/dashboard/asset-profile/site-plan": {
		page: "asset-profile",
		subpage: "site-plan",
	},
	"/dashboard/asset-profile/unit-mix": {
		page: "asset-profile",
		subpage: "unit-mix",
	},
	"/dashboard/asset-profile/amenities": {
		page: "asset-profile",
		subpage: "amenities",
	},
	"/dashboard/asset-profile/comparables": {
		page: "asset-profile",
		subpage: "comparables",
	},
	"/dashboard/asset-profile/media": {
		page: "asset-profile",
		subpage: "media",
	},
	"/dashboard/market-context": { page: "market-context", subpage: "main" },
	"/dashboard/market-context/supply-demand": {
		page: "market-context",
		subpage: "supply-demand",
	},
	"/dashboard/market-context/demographics": {
		page: "market-context",
		subpage: "demographics",
	},
	"/dashboard/market-context/employment": {
		page: "market-context",
		subpage: "employment",
	},
	"/dashboard/market-context/regulatory-incentives": {
		page: "market-context",
		subpage: "regulatory-incentives",
	},
	"/dashboard/financial-sponsor": {
		page: "financial-sponsor",
		subpage: "main",
	},
	"/dashboard/financial-sponsor/returns": {
		page: "financial-sponsor",
		subpage: "returns",
	},
	"/dashboard/financial-sponsor/sponsor-profile": {
		page: "financial-sponsor",
		subpage: "sponsor-profile",
	},
	"/dashboard/financial-sponsor/borrower-info": {
		page: "financial-sponsor",
		subpage: "borrower-info",
	},
	"/dashboard/financial-sponsor/sources-uses": {
		page: "financial-sponsor",
		subpage: "sources-uses",
	},
};

export function useOMPageTracking() {
	const pathname = usePathname();

	const pageInfo = useMemo(() => {
		// Extract the path after /project/om/[id]
		const match = pathname.match(/\/project\/om\/[^/]+\/(.+)$/);
		const omPath = match ? match[1] : "";

		// Normalize: ensure path starts with / for matching with PAGE_MAP keys
		const normalizedPath = omPath.startsWith("/") ? omPath : `/${omPath}`;

		// Sort paths by length (longest first) to match more specific paths first
		// This ensures /dashboard/asset-profile/site-plan matches before /dashboard/asset-profile
		const sortedPaths = Object.entries(PAGE_MAP).sort(
			(a, b) => b[0].length - a[0].length
		);

		// Find matching page (check exact match first, then prefix match)
		for (const [path, info] of sortedPaths) {
			if (normalizedPath === path) {
				return info;
			}
			if (normalizedPath.startsWith(path + "/")) {
				return info;
			}
		}

		// Fallback: extract from path
		const parts = omPath.split("/").filter(Boolean);
		return {
			page: parts[0] || "dashboard",
			subpage: parts[1] || "main",
		};
	}, [pathname]);

	return pageInfo;
}
