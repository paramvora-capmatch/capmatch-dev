import React from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCaseStudyBySlug, CASE_STUDY_SLUGS } from "@/lib/case-studies";
import { ResourcesBackLink } from "@/components/layout/ResourcesLayoutWrapper";
import LaSalleCaseStudyPage from "@/app/case-studies/lasalle/page";
import MarshallCaseStudyPage from "@/app/case-studies/marshall/page";
import SoGoodCaseStudyPage from "@/app/case-studies/sogood/page";

type Props = { params: Promise<{ slug: string }> };

const SLUG_TO_PAGE: Record<string, React.ComponentType> = {
	lasalle: LaSalleCaseStudyPage,
	marshall: MarshallCaseStudyPage,
	sogood: SoGoodCaseStudyPage,
};

const SLUG_METADATA: Record<
	string,
	{ title: string; description: string }
> = {
	lasalle: {
		title: "300 East LaSalle | Case Study | CapMatch",
		description:
			"CapMatch case study: 300 East LaSalle - 144-unit Class A mixed-use multifamily acquisition in South Bend, IN. $31.5M senior debt; reconciled BPO/Excel data and tax abatement into a single source of truth.",
	},
	marshall: {
		title: "The Marshall | Case Study | CapMatch",
		description:
			"CapMatch case study: The Marshall - $30.1M equity recapitalization for purpose-built student housing at Saint Louis University. CapMatch built an investor-ready intelligence layer and accelerated capital formation.",
	},
	sogood: {
		title: "SoGood Apartments | Case Study | CapMatch",
		description:
			"CapMatch case study: SoGood Apartments - $18M construction financing in Dallas. CapMatch structured a living underwriting model from disconnected docs and enabled real-time lender-specific outputs.",
	},
};

export async function generateStaticParams() {
	return CASE_STUDY_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { slug } = await params;
	const meta = SLUG_METADATA[slug];
	if (!meta) return { title: "Case Study | CapMatch" };
	return {
		title: meta.title,
		description: meta.description,
	};
}

export default async function ResourceCaseStudyPage({ params }: Props) {
	const { slug } = await params;
	const study = getCaseStudyBySlug(slug);
	const PageComponent = SLUG_TO_PAGE[slug];

	if (!study || !PageComponent) {
		notFound();
	}

	return (
		<>
			<ResourcesBackLink />
			<PageComponent />
		</>
	);
}
