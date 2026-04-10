import type { ProjectProfile } from "@/types/enhanced-types";
import {
  ASSET_CLASS_VALUES,
  LENDER_TYPE_LABELS,
  LENDER_TYPE_VALUES,
  TERM_BUCKET_LABELS,
  TERM_BUCKET_VALUES,
} from "@/lib/matchmaking/constants";

export const MATCHMAKING_RATE_TYPE_VALUES = ["Any", "Fixed", "Floating"] as const;
export type MatchmakingRateTypeValue = (typeof MATCHMAKING_RATE_TYPE_VALUES)[number];

export const MATCHMAKING_RATE_PREFERENCE_VALUES = [
  "none",
  "competitive",
  "target",
] as const;
export type MatchmakingRatePreferenceValue =
  (typeof MATCHMAKING_RATE_PREFERENCE_VALUES)[number];

export interface MatchmakingResumeSettings {
  assetType: string;
  interestRateType: MatchmakingRateTypeValue;
  requestedTerm: string;
  ratePreference: MatchmakingRatePreferenceValue;
  lenderTypes: string[];
}

export const matchmakingAssetTypeOptions = [...ASSET_CLASS_VALUES];
export const matchmakingRateTypeOptions = MATCHMAKING_RATE_TYPE_VALUES.map(
  (value) => ({ label: value, value })
);
export const matchmakingRatePreferenceOptions = [
  { label: "No Pricing Filter", value: "none" },
  { label: "Best Pricing", value: "competitive" },
  { label: "Target Rate", value: "target" },
] as const;
export const matchmakingTermOptions = [
  { label: "No preference", value: "" },
  ...TERM_BUCKET_VALUES.map((value) => ({
    label: TERM_BUCKET_LABELS[value],
    value,
  })),
];
export const matchmakingLenderTypeOptions = LENDER_TYPE_VALUES.map((value) => ({
  label: LENDER_TYPE_LABELS[value],
  value,
}));

type ProjectLike = ProjectProfile | Record<string, unknown> | null | undefined;

const LEGACY_ASSET_TYPE_MAP: Record<string, string> = {
  "self-storage": "Self Storage",
  "medical office": "Healthcare",
  "senior housing": "Healthcare",
  "student housing": "Residential Investment",
  "data center": "Special Purpose",
  other: "Special Purpose",
};

const LENDER_TYPE_ALIAS_MAP: Record<string, string> = Object.fromEntries(
  LENDER_TYPE_VALUES.flatMap((value) => [
    [value.toLowerCase(), value],
    [LENDER_TYPE_LABELS[value].toLowerCase(), value],
  ])
);
LENDER_TYPE_ALIAS_MAP.credit_union = "credit union";
LENDER_TYPE_ALIAS_MAP.private_money = "private money";
LENDER_TYPE_ALIAS_MAP.debt_fund = "debt fund";
LENDER_TYPE_ALIAS_MAP.insurance_company = "insurance company";
LENDER_TYPE_ALIAS_MAP.insurance = "insurance company";
LENDER_TYPE_ALIAS_MAP.private_credit = "private money";

function maybeExtractValue(raw: unknown): unknown {
  if (
    raw &&
    typeof raw === "object" &&
    !Array.isArray(raw) &&
    "value" in raw
  ) {
    return (raw as { value: unknown }).value;
  }
  return raw;
}

function getProjectValue(project: ProjectLike, fieldId: string): unknown {
  if (!project) return undefined;
  const record = project as Record<string, unknown>;
  if (record[fieldId] !== undefined) {
    return maybeExtractValue(record[fieldId]);
  }

  const content = record.content as Record<string, unknown> | undefined;
  if (content && content[fieldId] !== undefined) {
    return maybeExtractValue(content[fieldId]);
  }

  const metadata =
    (record._metadata as Record<string, { value?: unknown }> | undefined) ??
    undefined;
  return metadata?.[fieldId]?.value;
}

export function normalizeMatchmakingAssetType(value: unknown): string {
  const raw = String(maybeExtractValue(value) ?? "").trim();
  if (!raw) return ASSET_CLASS_VALUES[0];
  if (
    ASSET_CLASS_VALUES.includes(raw as (typeof ASSET_CLASS_VALUES)[number])
  ) {
    return raw;
  }

  const mapped = LEGACY_ASSET_TYPE_MAP[raw.toLowerCase()];
  if (
    mapped &&
    ASSET_CLASS_VALUES.includes(mapped as (typeof ASSET_CLASS_VALUES)[number])
  ) {
    return mapped;
  }

  return ASSET_CLASS_VALUES[0];
}

export function normalizeMatchmakingRateType(
  value: unknown
): MatchmakingRateTypeValue {
  const raw = String(maybeExtractValue(value) ?? "").trim().toLowerCase();
  if (raw === "fixed") return "Fixed";
  if (raw === "floating") return "Floating";
  return "Any";
}

export function toMatcherRateType(
  value: MatchmakingRateTypeValue | string | null | undefined
): "fixed" | "floating" | "any" {
  const normalized = normalizeMatchmakingRateType(value);
  if (normalized === "Fixed") return "fixed";
  if (normalized === "Floating") return "floating";
  return "any";
}

function numericTermToBucket(termYears: number): string {
  if (!Number.isFinite(termYears) || termYears <= 0) return "";
  if (termYears <= 1) return "bridge_lte1yr";
  if (termYears <= 3) return "short_1_3yr";
  if (termYears <= 5) return "medium_3_5yr";
  if (termYears <= 7) return "medium_5_7yr";
  if (termYears <= 10) return "standard_7_10yr";
  if (termYears <= 15) return "long_10_15yr";
  if (termYears <= 20) return "long_15_20yr";
  if (termYears <= 30) return "standard_20_30yr";
  return "extended_gt30yr";
}

export function normalizeRequestedTermBucket(value: unknown): string {
  const raw = maybeExtractValue(value);
  if (typeof raw === "number") return numericTermToBucket(raw);

  const text = String(raw ?? "").trim();
  if (!text) return "";

  if (
    TERM_BUCKET_VALUES.includes(text as (typeof TERM_BUCKET_VALUES)[number])
  ) {
    return text;
  }

  const numeric = Number(text);
  if (Number.isFinite(numeric)) {
    return numericTermToBucket(numeric);
  }

  const match = TERM_BUCKET_VALUES.find(
    (bucket) =>
      TERM_BUCKET_LABELS[bucket].toLowerCase() === text.toLowerCase()
  );
  return match ?? "";
}

export function normalizeMatchmakingFieldValue(
  fieldId: string,
  value: unknown
): unknown {
  const raw = maybeExtractValue(value);

  switch (fieldId) {
    case "assetType": {
      const text = String(raw ?? "").trim();
      return text ? normalizeMatchmakingAssetType(raw) : text;
    }
    case "interestRateType": {
      const text = String(raw ?? "").trim();
      return text ? normalizeMatchmakingRateType(raw) : text;
    }
    case "requestedTerm":
      return normalizeRequestedTermBucket(raw);
    case "ratePreference": {
      const text = String(raw ?? "").trim();
      return text ? normalizeMatchmakingRatePreference(raw) : text;
    }
    case "lenderTypes":
      return raw == null || raw === ""
        ? []
        : normalizeMatchmakingLenderTypes(raw);
    default:
      return raw;
  }
}

export function formatRequestedTermLabel(value: unknown): string {
  const raw = maybeExtractValue(value);
  if (raw === null || raw === undefined || raw === "") return "No preference";

  if (typeof raw === "number" && Number.isFinite(raw)) {
    const bucket = numericTermToBucket(raw);
    return bucket
      ? TERM_BUCKET_LABELS[bucket as (typeof TERM_BUCKET_VALUES)[number]]
      : `${raw} years`;
  }

  const text = String(raw).trim();
  if (!text) return "No preference";

  if (
    TERM_BUCKET_VALUES.includes(text as (typeof TERM_BUCKET_VALUES)[number])
  ) {
    return TERM_BUCKET_LABELS[text as (typeof TERM_BUCKET_VALUES)[number]];
  }

  const numeric = Number(text);
  if (Number.isFinite(numeric)) {
    const bucket = numericTermToBucket(numeric);
    return bucket
      ? TERM_BUCKET_LABELS[bucket as (typeof TERM_BUCKET_VALUES)[number]]
      : `${numeric} years`;
  }

  return text;
}

export function normalizeMatchmakingRatePreference(
  value: unknown
): MatchmakingRatePreferenceValue {
  const raw = String(maybeExtractValue(value) ?? "").trim().toLowerCase();
  if (raw === "competitive" || raw === "target" || raw === "none") return raw;
  return "target";
}

export function normalizeMatchmakingLenderTypes(value: unknown): string[] {
  let rawValues: string[] = [];
  const raw = maybeExtractValue(value);

  if (Array.isArray(raw)) {
    rawValues = raw.map((entry) => String(entry ?? ""));
  } else if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          rawValues = parsed.map((entry) => String(entry ?? ""));
        }
      } catch {
        rawValues = trimmed.split(",");
      }
    } else {
      rawValues = trimmed.split(",");
    }
  }

  return Array.from(
    new Set(
      rawValues
        .map((entry) => LENDER_TYPE_ALIAS_MAP[entry.trim().toLowerCase()] ?? "")
        .filter(
          (entry): entry is string =>
            LENDER_TYPE_VALUES.includes(
              entry as (typeof LENDER_TYPE_VALUES)[number]
            )
        )
    )
  );
}

export function getMatchmakingResumeSettings(
  project: ProjectLike
): MatchmakingResumeSettings {
  return {
    assetType: normalizeMatchmakingAssetType(getProjectValue(project, "assetType")),
    interestRateType: normalizeMatchmakingRateType(
      getProjectValue(project, "interestRateType")
    ),
    requestedTerm: normalizeRequestedTermBucket(
      getProjectValue(project, "requestedTerm")
    ),
    ratePreference: normalizeMatchmakingRatePreference(
      getProjectValue(project, "ratePreference")
    ),
    lenderTypes: normalizeMatchmakingLenderTypes(
      getProjectValue(project, "lenderTypes")
    ),
  };
}

export function buildMatchmakingResumeUpdates(
  settings: MatchmakingResumeSettings
): Record<string, unknown> {
  return {
    assetType: normalizeMatchmakingAssetType(settings.assetType),
    interestRateType: normalizeMatchmakingRateType(settings.interestRateType),
    requestedTerm: normalizeRequestedTermBucket(settings.requestedTerm),
    ratePreference: normalizeMatchmakingRatePreference(settings.ratePreference),
    lenderTypes: normalizeMatchmakingLenderTypes(settings.lenderTypes),
  };
}
