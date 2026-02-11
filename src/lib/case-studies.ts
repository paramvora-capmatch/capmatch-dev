export type CaseStudySummary = {
	id: string;
	slug: string;
	headline: string;
	assetType: string;
	loanAmount: string;
	location: string;
	description: string;
	image: string;
};

export const CASE_STUDIES: CaseStudySummary[] = [
	{
		id: "1",
		slug: "lasalle",
		headline: "300 East LaSalle",
		assetType: "Mixed-Use Multifamily",
		loanAmount: "$31.5M",
		location: "South Bend, IN",
		description:
			"Fragmented BPO and Excel models created version chaos and lender friction. CapMatch reconciled everything into a single source of truth, generated lender-specific outputs without rework, and cut back-and-forth by ~40%.",
		image: "/LaSalle-CaseStudy/img-0.jpeg",
	},
	{
		id: "2",
		slug: "marshall",
		headline: "The Marshall",
		assetType: "Student Housing",
		loanAmount: "$30.1M",
		location: "St. Louis, MO",
		description:
			"Generic docs couldn't capture student-housing and OZ nuances. CapMatch built an investor-ready intelligence layer, generated tailored outputs for each investor, and answered questions in real time-accelerating diligence and capital formation.",
		image: "/Marshall-CaseStudy/R01-2_DUSK-PERSPECTIVE_MARSHALL-MO_4KTV_01.16.24-scaled.webp",
	},
	{
		id: "3",
		slug: "sogood",
		headline: "SoGood Apartments",
		assetType: "Mixed-Use (Multifamily + Innovation Center)",
		loanAmount: "$18M",
		location: "Dallas, TX",
		description:
			"Disconnected docs and competing lender assumptions stalled underwriting. CapMatch built a living underwriting model, generated lender-specific outputs on demand, and answered questions in real time-compressing response cycles from days to minutes.",
		image: "/SoGood-CaseStudy/MainImage.webp",
	},
];

export function getCaseStudyBySlug(slug: string): CaseStudySummary | undefined {
	return CASE_STUDIES.find((c) => c.slug === slug);
}

export const CASE_STUDY_SLUGS = CASE_STUDIES.map((c) => c.slug);
