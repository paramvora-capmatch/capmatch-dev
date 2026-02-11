import React from "react";
import type { Metadata } from "next";
import { ResourcesPageClient } from "./ResourcesPageClient";

export const metadata: Metadata = {
	title: "Resources | Case Studies | CapMatch",
	description:
		"Explore CapMatch case studies: real deals, live underwriting, and how we help borrowers and advisors close faster with a single source of truth.",
};

export default function ResourcesPage() {
	return <ResourcesPageClient />;
}
