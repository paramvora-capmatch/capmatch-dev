import {
  filterFieldsForDealType,
  isFieldVisibleForDealType,
  type DealType,
} from "@/lib/deal-type-field-config";
import {
  calculateAverage,
  formatCurrency,
  formatFixed,
  formatLocale,
  parseNumeric,
} from "@/lib/om-utils";

type OMRecord = Record<string, any>;

const OM_RICH_FIELD_KEYS = new Set([
  "value",
  "source",
  "sources",
  "warnings",
  "other_values",
  "confidence",
  "metadata",
  "locked",
  "notes",
  "reasoning",
]);

interface OMCapitalItem {
  type: string;
  amount: number;
  percentage: number;
  timing?: string | null;
}

export interface OMComparable {
  name: string;
  address: string | null;
  distanceMiles: number | null;
  distanceLabel: string | null;
  yearBuilt: string | number | null;
  units: number | null;
  occupancyPercent: number | null;
  occupancyLabel: string | null;
  rentPSF: number | null;
  rentPSFLabel: string | null;
  avgRentMonthly: number | null;
  avgRentMonthlyLabel: string | null;
  saleDate: string | null;
  salePrice: number | null;
  salePriceLabel: string | null;
  capRate: number | null;
  capRateLabel: string | null;
}

export interface OMUnitMixEntry {
  type: string;
  count: number;
  avgSF: number | null;
  avgRent: number | null;
  avgRentLabel: string | null;
  rentRangeLabel: string | null;
}

export interface OMAmenityItem {
  name: string;
  sizeSF: number | null;
}

export interface OMAmenitySummary {
  items: OMAmenityItem[];
  count: number;
  totalSF: number | null;
  avgSizeSF: number | null;
}

export interface OMQuarterlyDeliveryItem {
  quarter: string;
  units: number;
}

/** Raw row from API/OM `sensitivityAnalysis` arrays before normalization */
type OMSensitivityAnalysisRawRow = Record<string, unknown>;

function isRichFieldObject(value: unknown): value is { value: unknown } {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("value" in (value as OMRecord))
  ) {
    return false;
  }

  const keys = Object.keys(value as OMRecord);
  return keys.length > 0 && keys.every((key) => OM_RICH_FIELD_KEYS.has(key));
}

export function normalizeOMRichValue<T = unknown>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeOMRichValue(entry)) as T;
  }

  if (isRichFieldObject(value)) {
    return normalizeOMRichValue(value.value) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as OMRecord).map(([key, entry]) => [
        key,
        normalizeOMRichValue(entry),
      ])
    ) as T;
  }

  return value;
}

export function getOMDealType(
  project: { deal_type?: string | null } | null | undefined
): DealType {
  return project?.deal_type === "refinance" ? "refinance" : "ground_up";
}

export function hasOMValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as OMRecord).length > 0;
  return true;
}

export function shouldShowDealTypeCard(
  fieldIds: string[],
  dealType: DealType,
  content?: OMRecord | null,
  isProjectField: boolean = true
): boolean {
  const visibleFieldIds = filterFieldsForDealType(
    fieldIds,
    dealType,
    isProjectField
  );

  if (!content) {
    return visibleFieldIds.length > 0;
  }

  return visibleFieldIds.some((fieldId) => hasOMValue(content[fieldId]));
}

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function formatPercentValue(
  value: number | null | undefined,
  decimals: number = 1
): string | null {
  return value != null ? `${formatFixed(value, decimals)}%` : null;
}

function withPercentages(items: Omit<OMCapitalItem, "percentage">[]): OMCapitalItem[] {
  const total = items.reduce((sum, item) => sum + item.amount, 0);

  return items.map((item) => ({
    ...item,
    percentage: total > 0 ? (item.amount / total) * 100 : 0,
  }));
}

export function cleanInsightText(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value
    .replace(/\s+/g, " ")
    .replace(/^\s*(?:[-•*]|\d+\.)\s*/, "")
    .replace(/^["']+|["']+$/g, "")
    .trim();

  if (trimmed.length < 25) {
    return null;
  }

  if (!/[.!?;:]$/.test(trimmed)) {
    return null;
  }

  return trimmed;
}

export function dedupeInsightItems(values: unknown[]): string[] {
  const results: string[] = [];
  const normalizedKeys: string[] = [];

  for (const value of values) {
    const cleaned = cleanInsightText(value);
    if (!cleaned) continue;

    const normalized = cleaned
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

    if (!normalized) continue;

    const isDuplicate = normalizedKeys.some(
      (existing) =>
        existing === normalized ||
        existing.includes(normalized) ||
        normalized.includes(existing)
    );

    if (isDuplicate) continue;

    normalizedKeys.push(normalized);
    results.push(cleaned);
  }

  return results;
}

export function getInsightList(
  fields: string[],
  insights?: OMRecord | null,
  content?: OMRecord | null,
  fallback: unknown[] = []
): string[] {
  return dedupeInsightItems([
    ...fields.map((field) => insights?.[field] ?? content?.[field]),
    ...fallback,
  ]);
}

export function buildCapitalSources(
  content: OMRecord | null | undefined,
  dealType: DealType = "ground_up"
): OMCapitalItem[] {
  if (!content) return [];

  const sourceDefinitions = [
    {
      fieldId: "loanAmountRequested",
      label: () =>
        asString(content.loanTypeLabel ?? content.loanType) ??
        (dealType === "refinance" ? "Senior Loan" : "Senior Construction Loan"),
    },
    {
      fieldId: "mezzanineDebtAmount",
      label: () => "Mezzanine Debt",
    },
    {
      fieldId: "preferredEquityAmount",
      label: () => "Preferred Equity",
    },
    {
      fieldId: "sponsorEquity",
      label: () => asString(content.sponsorEquityLabel) ?? "Sponsor Equity",
    },
    {
      fieldId: "taxCreditEquity",
      label: () => asString(content.taxCreditEquityLabel) ?? "Tax Credit Equity",
    },
    {
      fieldId: "grantFundingAmount",
      label: () =>
        asString(content.grantFundingSource)
          ? `${content.grantFundingSource} Grant`
          : "Grant Funding",
    },
    {
      fieldId: "privateInvestmentCommitment",
      label: () => "Private Investment",
    },
    {
      fieldId: "gapFinancing",
      label: () => asString(content.gapFinancingLabel) ?? "Gap Financing",
    },
  ];

  const sources = sourceDefinitions.flatMap((definition) => {
    if (!isFieldVisibleForDealType(definition.fieldId, dealType, true)) {
      return [];
    }

    const amount = parseNumeric(content[definition.fieldId]) ?? 0;
    if (amount <= 0) {
      return [];
    }

    return [
      {
        type: definition.label(),
        amount,
      },
    ];
  });

  return withPercentages(sources);
}

export function buildCapitalUses(
  content: OMRecord | null | undefined,
  dealType: DealType = "ground_up"
): OMCapitalItem[] {
  if (!content) return [];

  const capitalUseTiming =
    content.capitalUseTiming && typeof content.capitalUseTiming === "object"
      ? content.capitalUseTiming
      : {};

  const uses: Omit<OMCapitalItem, "percentage">[] = [];

  const acquisitionAmount =
    dealType === "refinance"
      ? parseNumeric(content.purchasePrice) ?? parseNumeric(content.landAcquisition) ?? 0
      : parseNumeric(content.landAcquisition) ?? parseNumeric(content.purchasePrice) ?? 0;

  if (acquisitionAmount > 0) {
    uses.push({
      type:
        dealType === "refinance"
          ? asString(content.purchasePriceLabel) ?? "Purchase Price"
          : asString(content.landAcquisitionLabel) ?? "Land Acquisition",
      amount: acquisitionAmount,
      timing: asString(capitalUseTiming.landAcquisition) ?? "At close",
    });
  }

  const useDefinitions = [
    ["baseConstruction", "Base Construction", "Months 1-24"],
    ["softCosts", "Soft Costs", "Months 0-24"],
    ["contingency", "Contingency", "Months 1-24"],
    ["constructionFees", "Construction Fees", "Months 1-24"],
    ["aeFees", "A&E Fees", "Months 1-24"],
    ["developerFee", "Developer Fee", "Months 1-24"],
    ["interestReserve", "Interest Reserve", "At close"],
    ["workingCapital", "Working Capital", "At close"],
    ["opDeficitEscrow", "Op. Deficit Escrow", "At close"],
    ["leaseUpEscrow", "Lease-Up Escrow", "At close"],
    ["ffe", "FF&E", "Months 1-24"],
    ["thirdPartyReports", "Third Party Reports", "At close"],
    ["legalAndOrg", "Legal & Org", "At close"],
    ["titleAndRecording", "Title & Recording", "At close"],
    ["taxesDuringConstruction", "Taxes During Construction", "Months 1-24"],
    ["loanFees", "Loan Fees", "At close"],
    ["relocationCosts", "Relocation Costs", "Months 1-24"],
    ["syndicationCosts", "Syndication Costs", "At close"],
    ["enviroRemediation", "Enviro. Remediation", "Months 1-24"],
    ["pfcStructuringFee", "PFC Structuring Fee", "At close"],
    ["capexBudget", "CapEx Budget", "Post-close"],
    ["liens", "Existing Liens / Debt Payoff", "At close"],
    ["accountsPayableTrade", "Accounts Payable", "At close"],
    ["retainagePayableLiability", "Retainage Payable", "At close"],
    ["totalSecurityDepositLiability", "Security Deposit Liability", "At close"],
    ["prepaidRentLiability", "Prepaid Rent Liability", "At close"],
  ] as const;

  for (const [fieldId, fallbackLabel, defaultTiming] of useDefinitions) {
    if (!isFieldVisibleForDealType(fieldId, dealType, true)) {
      continue;
    }

    const amount = parseNumeric(content[fieldId]) ?? 0;
    if (amount <= 0) {
      continue;
    }

    uses.push({
      type: asString(content[`${fieldId}Label`]) ?? fallbackLabel,
      amount,
      timing: asString(capitalUseTiming[fieldId]) ?? defaultTiming,
    });
  }

  return withPercentages(uses);
}

function parseRentRange(value: unknown): {
  average: number | null;
  label: string | null;
} {
  if (typeof value === "number" && Number.isFinite(value)) {
    return {
      average: value,
      label: `$${formatLocale(value)}`,
    };
  }

  const text = asString(value);
  if (!text) {
    return { average: null, label: null };
  }

  const parts = text.split("-").map((part) => parseNumeric(part));
  if (parts.length === 2 && parts[0] != null && parts[1] != null) {
    return {
      average: (parts[0] + parts[1]) / 2,
      label: `$${formatLocale(parts[0])} - $${formatLocale(parts[1])}`,
    };
  }

  const singleValue = parseNumeric(text);
  if (singleValue == null) {
    return { average: null, label: null };
  }

  return {
    average: singleValue,
    label: `$${formatLocale(singleValue)}`,
  };
}

export function getUnitMixEntries(
  content: OMRecord | null | undefined
): OMUnitMixEntry[] {
  const residentialUnitMix = Array.isArray(content?.residentialUnitMix)
    ? content.residentialUnitMix
    : [];

  return residentialUnitMix
    .map((unit) => {
      const count = parseNumeric(unit.unitCount ?? unit.units) ?? 0;
      const avgSF = parseNumeric(unit.avgSF ?? unit.averageSize ?? unit.avgSize);
      const rent = parseRentRange(unit.rentRange ?? unit.monthlyRent ?? unit.avgRent);

      return {
        type: asString(unit.unitType ?? unit.type ?? unit.name) ?? "Unit Type",
        count,
        avgSF,
        avgRent: rent.average,
        avgRentLabel: rent.average != null ? `$${formatLocale(rent.average)}` : null,
        rentRangeLabel: rent.label,
      };
    })
    .filter((entry) => entry.count > 0 || entry.avgSF != null || entry.avgRent != null);
}

export function getWeightedAverageUnitRent(
  entries: OMUnitMixEntry[]
): number | null {
  const totalUnits = entries.reduce((sum, entry) => sum + entry.count, 0);
  if (totalUnits <= 0) return null;

  const weightedRent = entries.reduce((sum, entry) => {
    const rent = entry.avgRent ?? 0;
    return sum + rent * entry.count;
  }, 0);

  return weightedRent > 0 ? weightedRent / totalUnits : null;
}

function normalizeName(value: string | null): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function getAmenitySummary(
  content: OMRecord | null | undefined
): OMAmenitySummary {
  const amenityList = Array.isArray(content?.amenityList) ? content.amenityList : [];
  const commercialSpaceMix = Array.isArray(content?.commercialSpaceMix)
    ? content.commercialSpaceMix
    : [];

  const items = amenityList
    .map((item) => {
      const name =
        typeof item === "string"
          ? item.trim()
          : asString(item?.name ?? item?.label ?? item?.type);

      if (!name) return null;

      const matchingCommercialSpace = commercialSpaceMix.find((space) => {
        const spaceName = asString(space?.name ?? space?.type ?? space?.label);
        if (!spaceName) return false;

        const normalizedAmenity = normalizeName(name);
        const normalizedSpace = normalizeName(spaceName);
        return (
          normalizedAmenity === normalizedSpace ||
          normalizedAmenity.includes(normalizedSpace) ||
          normalizedSpace.includes(normalizedAmenity)
        );
      });

      return {
        name,
        sizeSF:
          parseNumeric(
            matchingCommercialSpace?.size ??
              matchingCommercialSpace?.sf ??
              matchingCommercialSpace?.squareFeet
          ) ?? null,
      };
    })
    .filter((item): item is OMAmenityItem => item != null);

  const count = items.length;
  const totalSF =
    parseNumeric(content?.amenitySF) ??
    items.reduce((sum, item) => sum + (item.sizeSF ?? 0), 0) ??
    null;
  const avgSizeSF =
    parseNumeric(content?.amenityAvgSize) ??
    (totalSF != null && count > 0 ? totalSF / count : null);

  return {
    items,
    count,
    totalSF,
    avgSizeSF: avgSizeSF != null ? Math.round(avgSizeSF) : null,
  };
}

export function getComparableEntries(
  content: OMRecord | null | undefined
): OMComparable[] {
  const rentComps = Array.isArray(content?.rentComps) ? content.rentComps : [];

  return rentComps.map((comp, index) => {
    const name =
      asString(comp.propertyName ?? comp.name) ?? `Comparable ${index + 1}`;
    const distanceMiles = parseNumeric(comp.distance ?? comp.distanceMiles);
    const occupancyPercent = parseNumeric(
      comp.occupancyPercent ?? comp.occupancy ?? comp.physicalOccupancy
    );
    const rentPSF = parseNumeric(comp.rentPerSF ?? comp.rentPSF);
    const avgRentMonthly = parseNumeric(
      comp.avgRentMonth ?? comp.avgRent ?? comp.monthlyRent
    );
    const salePrice = parseNumeric(
      comp.salePrice ?? comp.lastSalePrice ?? comp.lastSale?.price
    );
    const capRate = parseNumeric(comp.capRate ?? comp.lastSale?.capRate);

    return {
      name,
      address: asString(comp.address ?? comp.location),
      distanceMiles,
      distanceLabel:
        distanceMiles != null ? `${formatFixed(distanceMiles, 1)} mi` : null,
      yearBuilt: comp.yearBuilt ?? comp.year ?? null,
      units: parseNumeric(comp.totalUnits ?? comp.units ?? comp.unitCount),
      occupancyPercent,
      occupancyLabel: formatPercentValue(occupancyPercent, 0),
      rentPSF,
      rentPSFLabel: rentPSF != null ? `$${formatFixed(rentPSF, 2)} PSF` : null,
      avgRentMonthly,
      avgRentMonthlyLabel:
        avgRentMonthly != null ? `$${formatLocale(avgRentMonthly)}` : null,
      saleDate: asString(comp.saleDate ?? comp.lastSaleDate ?? comp.lastSale?.date),
      salePrice,
      salePriceLabel: salePrice != null ? formatCurrency(salePrice) : null,
      capRate,
      capRateLabel: formatPercentValue(capRate, 1),
    };
  });
}

export function getComparableAverageRentPSF(
  content: OMRecord | null | undefined,
  comparables: OMComparable[]
): number | null {
  return (
    calculateAverage(comparables, (comp) => comp.rentPSF) ??
    parseNumeric(content?.avgRentPSF)
  );
}

export function getComparableAverageCapRate(
  content: OMRecord | null | undefined,
  comparables: OMComparable[]
): number | null {
  return (
    calculateAverage(comparables, (comp) => comp.capRate) ??
    parseNumeric(content?.avgCapRate ?? content?.marketCapRate ?? content?.capRate)
  );
}

export function getComparableAverageDistance(
  comparables: OMComparable[]
): number | null {
  return calculateAverage(comparables, (comp) => comp.distanceMiles);
}

export function getQuarterlyDeliverySchedule(
  content: OMRecord | null | undefined
): OMQuarterlyDeliveryItem[] {
  const rawSchedule =
    Array.isArray(content?.deliveryByQuarter) && content.deliveryByQuarter.length > 0
      ? content.deliveryByQuarter
      : Array.isArray(content?.quarterlyDeliverySchedule)
      ? content.quarterlyDeliverySchedule
      : [];

  return rawSchedule
    .map((entry, index) => ({
      quarter:
        asString(entry.quarter ?? entry.period ?? entry.label) ??
        `Q${(index % 4) + 1}`,
      units: parseNumeric(entry.units ?? entry.totalUnits ?? entry.count) ?? 0,
    }))
    .filter((entry) => entry.quarter && entry.units >= 0);
}

export function getFallbackSensitivityAnalysis(
  content: OMRecord | null | undefined
): {
  rentGrowthImpact: { growth: string; irr: number }[];
  constructionCostImpact: { costChange: string; irr: number }[];
} {
  const sensitivityAnalysis =
    content?.sensitivityAnalysis && typeof content.sensitivityAnalysis === "object"
      ? content.sensitivityAnalysis
      : null;

  const rentGrowthImpact = Array.isArray(sensitivityAnalysis?.rentGrowthImpact)
    ? (sensitivityAnalysis.rentGrowthImpact as OMSensitivityAnalysisRawRow[])
        .map((entry) => ({
          growth: asString(entry.growth ?? entry.label) ?? "Base",
          irr:
            parseNumeric(
              typeof entry.irr === "string" || typeof entry.irr === "number"
                ? entry.irr
                : undefined
            ) ?? 0,
        }))
        .filter((entry) => entry.irr !== 0)
    : [];

  const constructionCostImpact = Array.isArray(
    sensitivityAnalysis?.constructionCostImpact
  )
    ? (sensitivityAnalysis.constructionCostImpact as OMSensitivityAnalysisRawRow[])
        .map((entry) => ({
          costChange: asString(entry.costChange ?? entry.label) ?? "Base",
          irr:
            parseNumeric(
              typeof entry.irr === "string" || typeof entry.irr === "number"
                ? entry.irr
                : undefined
            ) ?? 0,
        }))
        .filter((entry) => entry.irr !== 0)
    : [];

  const baseIRR = parseNumeric(content?.irr);
  const upsideIRR = parseNumeric(content?.upsideIRR);
  const downsideIRR = parseNumeric(content?.downsideIRR);

  return {
    rentGrowthImpact:
      rentGrowthImpact.length > 0
        ? rentGrowthImpact
        : [
            { growth: "Downside", irr: downsideIRR ?? baseIRR ?? 0 },
            { growth: "Base", irr: baseIRR ?? 0 },
            { growth: "Upside", irr: upsideIRR ?? baseIRR ?? 0 },
          ].filter((entry) => entry.irr !== 0),
    constructionCostImpact:
      constructionCostImpact.length > 0
        ? constructionCostImpact
        : [
            { costChange: "Higher Cost", irr: downsideIRR ?? baseIRR ?? 0 },
            { costChange: "Base", irr: baseIRR ?? 0 },
            { costChange: "Lower Cost", irr: upsideIRR ?? baseIRR ?? 0 },
          ].filter((entry) => entry.irr !== 0),
  };
}
