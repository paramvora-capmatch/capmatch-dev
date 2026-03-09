import type { PrincipalRole } from "@/types/enhanced-types";

export const entityStructureOptions = [
	"LLC",
	"LP",
	"S-Corp",
	"C-Corp",
	"Sole Proprietorship",
	"Trust",
	"Other",
] as const;

export const experienceRangeOptions = [
	"0-2",
	"3-5",
	"6-10",
	"11-15",
	"16+",
] as const;

export const dealValueRangeOptions = [
	"N/A",
	"<$10M",
	"$10M-$50M",
	"$50M-$100M",
	"$100M-$250M",
	"$250M-$500M",
	"$500M+",
] as const;

export const creditScoreRangeOptions = [
	"N/A",
	"<600",
	"600-649",
	"650-699",
	"700-749",
	"750-799",
	"800+",
] as const;

export const netWorthRangeOptions = [
	"<$1M",
	"$1M-$5M",
	"$5M-$10M",
	"$10M-$25M",
	"$25M-$50M",
	"$50M-$100M",
	"$100M+",
] as const;

export const liquidityRangeOptions = [
	"<$100k",
	"$100k-$500k",
	"$500k-$1M",
	"$1M-$5M",
	"$5M-$10M",
	"$10M+",
] as const;

export const principalRoleOptions: PrincipalRole[] = [
	"Managing Member",
	"General Partner",
	"Developer",
	"Sponsor",
	"Key Principal",
	"Guarantor",
	"Limited Partner",
	"Other",
];

export const assetClassOptions = [
	"Multifamily",
	"Office",
	"Retail",
	"Industrial",
	"Hospitality",
	"Land",
	"Mixed-Use",
	"Self-Storage",
	"Data Center",
	"Medical Office",
	"Senior Housing",
	"Student Housing",
	"Other",
] as const;

export const geographicMarketsOptions = [
	"Northeast",
	"Mid-Atlantic",
	"Southeast",
	"Midwest",
	"Southwest",
	"Mountain West",
	"West Coast",
	"Pacific Northwest",
	"Hawaii",
	"Alaska",
	"National",
] as const;
