"use client";

import React, { useState } from "react";
import { Select } from "@/components/ui/Select";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Zap,
  Save,
  RotateCcw,
  Clock,
  Trophy,
  BarChart3,
  Building2,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Shield,
  DollarSign,
  Landmark,
  Plus,
  Trash2,
  Tag,
  History,
  Layers,
  Target,
  ToggleLeft,
  UserCheck,
  Star,
  ArrowUpRight,
} from "lucide-react";

// ─── Mock Data ──────────────────────────────────────────────────────────────

const MOCK_VERSION = {
  number: 5,
  status: "draft" as const,
  label: "Non-Recourse Agency Play",
  lastSaved: "Auto-saved 12s ago",
  history: [
    { version: 5, label: "Non-Recourse Agency Play", date: "Mar 6, 2:42pm", status: "draft", topScore: null },
    { version: 4, label: "Conservative 65% LTV", date: "Mar 5, 2:30pm", status: "saved", topScore: 87 },
    { version: 3, label: "Non-Recourse Attempt", date: "Mar 4, 11:00am", status: "saved", topScore: 72 },
    { version: 2, label: "Initial Structure", date: "Mar 3, 4:15pm", status: "saved", topScore: 68 },
    { version: 1, label: "From Resume Import", date: "Mar 2, 9:00am", status: "saved", topScore: null },
  ],
};

interface CapitalLayer {
  id: string;
  position: number;
  layerType: string;
  name: string;
  lender?: string;
  amount: number;
  percentOfStack: number;
  interestRate?: number;
  rateType?: string;
  spread?: number;
  index?: string;
  term?: number;
  ioPeriod?: number;
  amortization?: number | null;
  recourse?: string;
  originationFee?: number;
  prepayment?: string;
  preferredReturn?: number;
  committed: boolean;
}

const MOCK_CAPITAL_STACK: CapitalLayer[] = [
  {
    id: "1",
    position: 1,
    layerType: "Senior Debt",
    name: "Senior Construction Loan",
    amount: 18_000_000,
    percentOfStack: 62.1,
    interestRate: 8.85,
    rateType: "Floating",
    spread: 350,
    index: "SOFR",
    term: 36,
    ioPeriod: 36,
    amortization: null,
    recourse: "Non-Recourse",
    originationFee: 1.5,
    prepayment: "Open after 18mo",
    committed: true,
  },
  {
    id: "2",
    position: 2,
    layerType: "Mezzanine",
    name: "Mezz Tranche A",
    amount: 4_350_000,
    percentOfStack: 15.0,
    interestRate: 12.0,
    rateType: "Fixed",
    term: 36,
    recourse: "Full Recourse",
    originationFee: 2.0,
    committed: false,
  },
  {
    id: "3",
    position: 3,
    layerType: "Preferred Equity",
    name: "Preferred Equity",
    amount: 2_900_000,
    percentOfStack: 10.0,
    preferredReturn: 15.0,
    committed: false,
  },
  {
    id: "4",
    position: 4,
    layerType: "Common Equity",
    name: "Sponsor Equity",
    amount: 3_750_000,
    percentOfStack: 12.9,
    committed: true,
  },
];

const MOCK_KEY_PARAMS = {
  assetType: "Multifamily",
  loanType: "Construction",
  targetLtv: 72,
  recourse: "Non-Recourse",
  interestRate: "SOFR + 350",
  rateType: "Floating",
  term: 36,
  noiYear1: 1_850_000,
  dscr: 1.32,
  sponsorEquity: 3_750_000,
  exitStrategy: "Refinance to Agency Perm",
  totalCap: 29_000_000,
};

const MOCK_LOAN_TERMS = [
  { label: "Requested Term", value: "36 months" },
  { label: "Amortization", value: "Interest-Only" },
  { label: "IO Period", value: "36 months (full term)" },
  { label: "Extensions", value: "2 × 6-month extensions" },
  { label: "Prepayment", value: "Open after 18 months" },
  { label: "Origination Fee", value: "1.50%" },
  { label: "Exit Fee", value: "0.25%" },
  { label: "Floor Rate", value: "8.00%" },
  { label: "Underwriting Rate", value: "9.25%" },
  { label: "All-In Rate", value: "8.85%" },
  { label: "Use of Proceeds", value: "Ground-up construction" },
  { label: "Target Close", value: "Apr 15, 2026" },
  { label: "Perm Takeout", value: "Planned — Agency" },
  { label: "Completion Guaranty", value: "Yes" },
  { label: "Expected Hold", value: "5 years" },
];

const MOCK_PERFORMANCE = [
  { label: "NOI Year 1", value: "$1,850,000" },
  { label: "Stabilized NOI", value: "$2,200,000" },
  { label: "Trailing 12 NOI", value: "N/A (construction)" },
  { label: "DSCR", value: "1.32×" },
  { label: "Cap Rate", value: "5.25%" },
  { label: "Stabilized Value", value: "$41,900,000" },
  { label: "Debt Yield", value: "10.3%" },
  { label: "Yield on Cost", value: "7.6%" },
  { label: "IRR", value: "18.5%" },
  { label: "Equity Multiple", value: "2.1×" },
  { label: "LTV", value: "72%" },
  { label: "LTC", value: "62%" },
];

const MOCK_PROGRAMS = [
  { label: "Affordable Housing", value: true },
  { label: "Affordable Units", value: "42 units" },
  { label: "AMI Target", value: "60% AMI" },
  { label: "Opportunity Zone", value: true },
  { label: "Tax Exemption", value: true },
  { label: "Exemption Structure", value: "PILOT — 25yr" },
  { label: "TIF District", value: true },
  { label: "Tax Abatement", value: false },
  { label: "Historic Tax Credits", value: false },
  { label: "New Markets Credits", value: false },
  { label: "PACE Financing", value: false },
  { label: "Incentive Stacking", value: "PILOT + OZ + TIF" },
  { label: "Total Incentive Value", value: "$4,200,000" },
];

const MOCK_BORROWER = [
  { label: "Credit Score", value: "750–799" },
  { label: "Net Worth", value: "$25M–$50M" },
  { label: "Liquidity", value: "$5M–$10M" },
  { label: "Deal Volume Closed", value: "$100M–$250M" },
  { label: "CRE Experience", value: "16+ years" },
  { label: "Bankruptcy History", value: "None" },
  { label: "Foreclosure History", value: "None" },
  { label: "Litigation History", value: "None" },
];

interface MockLender {
  rank: number;
  name: string;
  score: number;
  market: number;
  capital: number;
  product: number;
  narrative: string;
  aiReport: {
    summary: string;
    strengths: string[];
    gaps: string[];
    recommendations: string[];
  };
}

const MOCK_LENDERS: MockLender[] = [
  {
    rank: 1,
    name: "Veritex Community Credit Union",
    score: 91,
    market: 95,
    capital: 88,
    product: 90,
    narrative: "Strong match — Veritex's DFW multifamily focus and construction lending program closely align with your deal's geography, size, and structure.",
    aiReport: {
      summary: "Veritex is your highest-probability close. They've originated 23 multifamily construction loans in DFW in the past 18 months, with a median loan size of $16.2M — almost exactly your senior tranche. Their construction lending team actively seeks OZ-qualified deals with PILOT tax exemptions, which matches your incentive stack perfectly.",
      strengths: [
        "Dominant DFW multifamily construction lender — 23 originations in 18 months",
        "Median loan size ($16.2M) aligns precisely with your $18M senior request",
        "Active in Opportunity Zone lending with dedicated OZ fund relationships",
        "Non-recourse construction lending up to 75% LTC — you're at 62%, well within their box",
        "Known for fast execution: 45-day average from term sheet to close",
      ],
      gaps: [
        "Floating rate floor of 8.50% is slightly above your 8.00% target",
        "Typically requires 12 months post-close liquidity; verify borrower meets threshold",
        "Limited appetite for mezz behind their senior — may require intercreditor negotiation",
      ],
      recommendations: [
        "Lead with your OZ qualification and PILOT structure — this is a differentiator for their portfolio",
        "Prepare a construction budget with GMP contract to accelerate their underwriting",
        "Consider accepting their 8.50% floor rate to avoid pricing negotiation delays",
        "Have intercreditor term sheet ready for the Ares mezz position — they'll ask for it early",
      ],
    },
  },
  {
    rank: 2,
    name: "Prosperity Bank",
    score: 87,
    market: 92,
    capital: 85,
    product: 84,
    narrative: "Strong match — Prosperity's Texas-focused CRE platform and multifamily experience make them a natural fit for this deal.",
    aiReport: {
      summary: "Prosperity is the largest Texas-headquartered bank in multifamily construction lending. Their DFW team has been aggressively growing their construction book, particularly in the affordable/workforce housing segment. Your deal's affordable component (42 units at 60% AMI) positions well for their CRA-motivated lending program.",
      strengths: [
        "Texas's largest community bank — deep local market knowledge and relationships",
        "CRA-motivated lending program actively seeks affordable housing components",
        "Construction lending up to $25M without participation — single-lender execution",
        "Strong track record with PILOT-structured deals in Dallas County",
      ],
      gaps: [
        "Slightly more conservative on LTV — typically caps at 70% LTC for construction",
        "Requires full recourse during construction, converting to non-recourse at stabilization",
        "Longer underwriting timeline (60-75 days) compared to Veritex",
      ],
      recommendations: [
        "Emphasize the 60% AMI affordable component — this triggers their CRA lending program with more favorable terms",
        "Consider a recourse carve-out structure instead of full non-recourse to meet them in the middle",
        "Request their construction-to-perm program to eliminate refinance risk",
        "Provide detailed absorption projections to offset their LTV conservatism",
      ],
    },
  },
  {
    rank: 3,
    name: "Independent Financial",
    score: 84,
    market: 88,
    capital: 82,
    product: 82,
    narrative: "Strong match — Independent Financial's growth-oriented CRE platform targets exactly this deal profile.",
    aiReport: {
      summary: "Independent Financial (formerly Independent Bank Group) has been expanding aggressively in DFW multifamily construction. They recently hired a new head of CRE from a national platform, signaling appetite for larger, more structured deals. Your $18M senior tranche is in their sweet spot.",
      strengths: [
        "Aggressive growth mandate in DFW multifamily — actively seeking new relationships",
        "Recently expanded construction lending limit to $30M per deal",
        "Familiar with TIF district structures in Dallas",
        "Competitive pricing: typically SOFR + 300-375 for qualified sponsors",
      ],
      gaps: [
        "Less experience with PILOT tax exemption structures specifically",
        "May require personal guaranty from principals during construction phase",
        "Newer CRE team — relationship will need to be built from scratch",
      ],
      recommendations: [
        "Schedule a face-to-face with their new head of CRE — they're hungry for marquee deals",
        "Provide a detailed PILOT explanation memo to educate their credit committee",
        "Offer to bring a larger banking relationship (deposits, treasury) to sweeten the deal",
      ],
    },
  },
  {
    rank: 4,
    name: "Frost Bank",
    score: 81,
    market: 85,
    capital: 78,
    product: 80,
    narrative: "Strong match — Frost's conservative but consistent CRE lending platform provides reliable execution.",
    aiReport: {
      summary: "Frost Bank is the gold standard for Texas CRE lending — conservative, reliable, and relationship-driven. They may not offer the most aggressive terms, but their execution certainty is unmatched. Best positioned as a backup or for a more conservative scenario.",
      strengths: [
        "Unmatched execution certainty — zero construction loan defaults in 20 years",
        "Deep DFW market presence with dedicated multifamily team",
        "Willing to hold loans on balance sheet (no syndication risk)",
        "Strong appetite for repeat sponsor relationships",
      ],
      gaps: [
        "Conservative leverage — typically caps at 65% LTC",
        "Requires full recourse for construction loans, no exceptions",
        "Pricing premium of 25-50 bps vs. more aggressive lenders",
        "65% LTC cap means $18.85M max loan on your $29M TDC — below your $18M request",
      ],
      recommendations: [
        "Best positioned if you're willing to reduce leverage to 65% LTC ($18.85M)",
        "Pair with a larger equity contribution or reduce TDC through value engineering",
        "Excellent choice if execution certainty is paramount over pricing",
      ],
    },
  },
  {
    rank: 5,
    name: "Texas Capital Bank",
    score: 78,
    market: 80,
    capital: 76,
    product: 78,
    narrative: "Moderate match — Texas Capital has the capability but their current portfolio allocation may limit appetite.",
    aiReport: {
      summary: "Texas Capital is transitioning their CRE portfolio toward higher-quality, sponsored deals. Your deal fits their target profile, but they've been selectively reducing construction exposure. A strong sponsor relationship and the affordable housing angle could overcome their current conservatism.",
      strengths: [
        "Sophisticated CRE platform with institutional-quality underwriting",
        "Experience with complex capital stacks including mezz subordination",
        "Dedicated affordable housing lending group",
      ],
      gaps: [
        "Currently reducing construction loan exposure — selectivity is high",
        "Longer approval process due to portfolio management scrutiny",
        "May require deposit relationship as condition of lending",
      ],
      recommendations: [
        "Lead with the affordable housing and OZ angles — these align with their strategic priorities",
        "Be prepared to bring a meaningful deposit relationship ($2-3M+)",
        "Start the conversation early — their approval timeline is 75-90 days",
      ],
    },
  },
  {
    rank: 6, name: "Comerica Bank", score: 74, market: 72, capital: 75, product: 75,
    narrative: "Moderate match — Comerica covers several requirements but has gaps in construction lending appetite.",
    aiReport: {
      summary: "Comerica has a solid Texas CRE platform but has been more focused on stabilized multifamily. Construction lending is available but not their primary focus. Could be a strong perm takeout partner.",
      strengths: ["Strong Texas presence with dedicated CRE team", "Excellent perm lending rates for stabilized multifamily", "Experience with OZ-qualified properties"],
      gaps: ["Construction lending is not their primary focus", "Typically requires 20%+ sponsor equity", "Less familiar with PILOT structures"],
      recommendations: ["Consider Comerica for the permanent takeout rather than construction", "If pursuing for construction, emphasize the perm conversion opportunity"],
    },
  },
  {
    rank: 7, name: "International Bank of Commerce", score: 71, market: 78, capital: 68, product: 67,
    narrative: "Moderate match — IBC has strong Texas roots but is more conservative on structure.",
    aiReport: {
      summary: "IBC is a relationship-driven Texas bank with significant multifamily experience in South and Central Texas. Their DFW presence is growing but not yet as deep as competitors. They could be competitive on pricing if you have an existing relationship.",
      strengths: ["Competitive pricing for relationship clients", "Growing DFW multifamily presence", "Flexible on term structure"],
      gaps: ["Stronger in South Texas than DFW", "Conservative on leverage (60-65% LTC)", "Limited experience with complex incentive stacking"],
      recommendations: ["Best if you have an existing IBC banking relationship", "May need to reduce leverage expectations significantly"],
    },
  },
  {
    rank: 8, name: "Southside Bank", score: 67, market: 65, capital: 68, product: 68,
    narrative: "Moderate match — Southside has capacity but is outside their typical deal size.",
    aiReport: {
      summary: "Southside Bank typically focuses on smaller multifamily deals ($5-12M). Your $18M senior tranche pushes their comfort zone, though they've been expanding. Could work with a participation structure.",
      strengths: ["Aggressive multifamily lender in smaller deal sizes", "Competitive pricing", "Fast decision-making"],
      gaps: ["$18M exceeds their typical construction loan size", "Would likely require a participation partner", "Limited OZ/PILOT experience"],
      recommendations: ["Only pursue if willing to accept a participated loan structure", "Could be excellent for a smaller phase or reduced scope"],
    },
  },
  {
    rank: 9, name: "PlainsCapital Bank", score: 63, market: 70, capital: 60, product: 59,
    narrative: "Weak-to-moderate match — PlainsCapital's current CRE strategy doesn't strongly align.",
    aiReport: {
      summary: "PlainsCapital has been de-emphasizing construction lending in favor of stabilized assets. Not the best fit for this deal in its current form, but could be revisited for the permanent takeout.",
      strengths: ["Strong DFW market knowledge", "Competitive permanent lending program"],
      gaps: ["De-emphasizing construction lending", "Conservative leverage requirements", "Slow approval process for construction deals"],
      recommendations: ["Better suited as a permanent takeout lender post-stabilization", "Not recommended for the construction phase"],
    },
  },
  {
    rank: 10, name: "First Financial Bankshares", score: 58, market: 55, capital: 60, product: 59,
    narrative: "Weak match — First Financial's lending profile diverges significantly from your deal's requirements.",
    aiReport: {
      summary: "First Financial is a well-run Texas bank but primarily focuses on smaller-market multifamily. Your DFW deal is outside their typical geographic and size focus. Not recommended for this deal.",
      strengths: ["Strong credit quality and bank fundamentals", "Good for smaller Texas markets"],
      gaps: ["DFW is not their primary market", "Deal size exceeds their typical range", "Limited construction lending appetite", "No experience with PILOT or OZ structures"],
      recommendations: ["Not recommended for this deal", "Could be relevant for smaller projects in secondary Texas markets"],
    },
  },
];

// ─── Helper Components ──────────────────────────────────────────────────────

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${score}%`, backgroundColor: color }} />
    </div>
  );
}

function PillarRow({ label, score }: { label: string; score: number }) {
  const color = score >= 80 ? "#059669" : score >= 60 ? "#d97706" : "#dc2626";
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500 w-14 shrink-0">{label}</span>
      <div className="flex-1"><ScoreBar score={score} color={color} /></div>
      <span className="text-sm font-medium text-gray-600 w-8 text-right">{score}</span>
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm mb-2">
      <span className="text-sm font-medium text-gray-600">{label}</span>
      <input type="text" defaultValue={value} className="text-sm font-semibold text-gray-900 bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-right w-1/2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
    </div>
  );
}

function ToggleRow({ label, value }: { label: string; value: boolean | string }) {
  if (typeof value === "boolean") {
    return (
      <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm mb-2">
        <span className="text-sm font-medium text-gray-600">{label}</span>
        <select defaultValue={value ? "yes" : "no"} className="text-sm font-semibold text-gray-900 bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </div>
    );
  }
  return <FieldRow label={label} value={String(value)} />;
}

function LayerTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    "Senior Debt": "bg-blue-50 text-blue-700 border-blue-200",
    "Mezzanine": "bg-purple-50 text-purple-700 border-purple-200",
    "Preferred Equity": "bg-amber-50 text-amber-700 border-amber-200",
    "Common Equity": "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${styles[type] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
      {type}
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const cls = score >= 70
    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
    : score >= 45
      ? "text-amber-700 bg-amber-50 border-amber-200"
      : "text-red-700 bg-red-50 border-red-200";
  return (
    <span className={`text-base font-bold px-3 py-1 rounded-full border ${cls}`}>
      {score}
    </span>
  );
}

// ─── Accordion Section ──────────────────────────────────────────────────────

function AccordionSection({
  icon,
  title,
  count,
  children,
  defaultOpen = false,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-base font-medium text-gray-700">{title}</span>
          <span className="text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full">{count}</span>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {open && <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-2">{children}</div>}
    </div>
  );
}

// ─── Capital Stack Row ──────────────────────────────────────────────────────

function CapitalStackRow({ layer }: { layer: CapitalLayer }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <tr
        onClick={() => setExpanded(!expanded)}
        className="cursor-pointer hover:bg-gray-50 transition-colors group"
      >
        <td className="py-2 px-3 text-center">
          <span className="text-sm text-gray-400 font-mono">{layer.position}</span>
        </td>
        <td className="py-2 px-3">
          <div className="flex items-center gap-2">
            {expanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
            <LayerTypeBadge type={layer.layerType} />
          </div>
        </td>
        <td className="py-2 px-3">
          <span className="text-sm font-medium text-gray-800">{layer.name}</span>
        </td>
        <td className="py-2 px-3 text-right">
          <span className="text-sm font-semibold text-gray-900 font-mono">{formatCurrency(layer.amount)}</span>
        </td>
        <td className="py-2 px-3 text-right">
          <span className="text-sm text-gray-500">{layer.percentOfStack.toFixed(1)}%</span>
        </td>
        <td className="py-2 px-3 text-right">
          {layer.interestRate ? (
            <span className="text-sm text-gray-600">{layer.rateType === "Floating" ? `${layer.index}+${layer.spread}` : `${layer.interestRate}%`}</span>
          ) : layer.preferredReturn ? (
            <span className="text-sm text-gray-600">{layer.preferredReturn}% pref</span>
          ) : (
            <span className="text-sm text-gray-300">—</span>
          )}
        </td>
        <td className="py-2 px-3 text-center">
          {layer.committed ? (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">Committed</span>
          ) : (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">Pending</span>
          )}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7} className="bg-gray-50 border-t border-gray-100">
            <div className="px-6 py-3 grid grid-cols-3 gap-x-6 gap-y-2">
              
              {layer.interestRate != null && <FieldRow label="All-In Rate" value={`${layer.interestRate}%`} />}
              {layer.rateType && <FieldRow label="Rate Type" value={layer.rateType} />}
              {layer.spread != null && <FieldRow label="Spread" value={`${layer.spread} bps`} />}
              {layer.index && <FieldRow label="Index" value={layer.index} />}
              {layer.term != null && <FieldRow label="Term" value={`${layer.term} months`} />}
              {layer.ioPeriod != null && <FieldRow label="IO Period" value={`${layer.ioPeriod} months`} />}
              {layer.amortization !== undefined && <FieldRow label="Amortization" value={layer.amortization ? `${layer.amortization} years` : "Interest Only"} />}
              {layer.recourse && <FieldRow label="Recourse" value={layer.recourse} />}
              {layer.originationFee != null && <FieldRow label="Origination Fee" value={`${layer.originationFee}%`} />}
              {layer.prepayment && <FieldRow label="Prepayment" value={layer.prepayment} />}
              {layer.preferredReturn != null && <FieldRow label="Preferred Return" value={`${layer.preferredReturn}%`} />}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Lender Card ────────────────────────────────────────────────────────────

function LenderCard({ lender }: { lender: MockLender }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm transition-shadow hover:shadow-md">
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-bold text-gray-400 w-5 text-right shrink-0">#{lender.rank}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-gray-400 shrink-0" />
            <span className="text-base font-semibold text-gray-900 truncate">{lender.name}</span>
          </div>
          <div className="mt-1.5 space-y-1">
            <PillarRow label="Market" score={lender.market} />
            <PillarRow label="Capital" score={lender.capital} />
            <PillarRow label="Product" score={lender.product} />
          </div>
        </div>
        <div className="shrink-0 flex flex-col items-center gap-1">
          <ScoreBadge score={lender.score} />
          {expanded ? <ChevronUp size={14} className="text-gray-300" /> : <ChevronDown size={14} className="text-gray-300" />}
        </div>
      </div>

      {/* Narrative */}
      <div className="px-4 pb-2">
        <p className="text-sm text-gray-500 italic leading-relaxed">{lender.narrative}</p>
      </div>

      {/* Expanded AI Report */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
                <p className="text-sm text-gray-500 mb-1">Target LTV</p>
                <p className="text-base font-bold text-gray-900">Up to 75% LTC</p>
             </div>
             <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
                <p className="text-sm text-gray-500 mb-1">Sweet Spot</p>
                <p className="text-base font-bold text-gray-900">$10M - $25M</p>
             </div>
             <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
                <p className="text-sm text-gray-500 mb-1">Pricing Guide</p>
                <p className="text-base font-bold text-gray-900">SOFR + 350</p>
             </div>
             <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
                <p className="text-sm text-gray-500 mb-1">Recourse</p>
                <p className="text-base font-bold text-gray-900">Non-Recourse</p>
             </div>
          </div>
          <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
             <div className="flex items-center gap-1.5 mb-2">
                <Zap size={16} className="text-blue-600" />
                <span className="text-base font-semibold text-gray-800">Why it's a match</span>
             </div>
             <p className="text-sm text-gray-600 leading-relaxed">{lender.aiReport.summary}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

interface DealScenarioBuilderProps {
  projectId: string;
}

export const DealScenarioBuilder: React.FC<DealScenarioBuilderProps> = ({ projectId: _projectId }) => {
  const [versionDropdownOpen, setVersionDropdownOpen] = useState(false);

  const totalCap = MOCK_CAPITAL_STACK.reduce((s, l) => s + l.amount, 0);

  return (
    <div className="flex gap-6 items-start max-w-[1600px] mx-auto">
      {/* ──────── LEFT PANEL: Deal Scenario Controls ──────── */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Version Header */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setVersionDropdownOpen(!versionDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <History size={16} className="text-gray-500" />
                  <span className="text-base font-medium text-gray-700">v{MOCK_VERSION.number}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">DRAFT</span>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>

                {versionDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                    <div className="p-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Version History</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {MOCK_VERSION.history.map((v) => (
                        <button
                          key={v.version}
                          className="w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors flex items-center justify-between"
                          onClick={() => setVersionDropdownOpen(false)}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-base font-medium text-gray-800">v{v.version}</span>
                              {v.status === "draft" && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">DRAFT</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5">{v.label}</p>
                            <p className="text-xs text-gray-400">{v.date}</p>
                          </div>
                          {v.topScore && (
                            <span className="text-sm font-semibold text-emerald-600">{v.topScore}/100</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <Tag size={14} className="text-gray-400" />
                <span className="text-base text-gray-600 italic">&ldquo;{MOCK_VERSION.label}&rdquo;</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{MOCK_VERSION.lastSaved}</span>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                <RotateCcw size={14} />
                Discard
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                <Save size={14} />
                Save Version
              </button>
            </div>
          </div>
        </div>

        {/* Hot Zone: Key Parameters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Star size={16} className="text-blue-600" />
            <h3 className="text-base font-semibold text-gray-800">Key Deal Parameters</h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: "Asset Type", value: MOCK_KEY_PARAMS.assetType, type: "dropdown" },
              { label: "Loan Type", value: MOCK_KEY_PARAMS.loanType, type: "dropdown" },
              { label: "Target LTV", value: `${MOCK_KEY_PARAMS.targetLtv}%`, type: "input" },
              { label: "Recourse", value: MOCK_KEY_PARAMS.recourse, type: "dropdown" },
              { label: "Interest Rate", value: MOCK_KEY_PARAMS.interestRate, type: "input" },
              { label: "Rate Type", value: MOCK_KEY_PARAMS.rateType, type: "dropdown" },
              { label: "Term", value: `${MOCK_KEY_PARAMS.term} months`, type: "input" },
              { label: "NOI (Year 1)", value: formatCurrency(MOCK_KEY_PARAMS.noiYear1), type: "input" },
              { label: "DSCR", value: `${MOCK_KEY_PARAMS.dscr}×`, type: "input" },
              { label: "Sponsor Equity", value: formatCurrency(MOCK_KEY_PARAMS.sponsorEquity), type: "input" },
              { label: "Exit Strategy", value: MOCK_KEY_PARAMS.exitStrategy, type: "dropdown" },
              { label: "Total Capitalization", value: formatCurrency(MOCK_KEY_PARAMS.totalCap), type: "computed" },
            ].map((field) => (
              <div key={field.label}>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">{field.label}</label>
                {field.type === "computed" ? (
                  <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm font-semibold text-gray-700 border border-gray-200">
                    {field.value}
                  </div>
                ) : field.type === "dropdown" ? (
                  <div className="flex items-center justify-between px-3 py-1.5 bg-white rounded-lg text-sm font-medium text-gray-800 border border-gray-300 cursor-pointer hover:border-blue-400 transition-colors">
                    {field.value}
                    <ChevronDown size={14} className="text-gray-400" />
                  </div>
                ) : (
                  <div className="px-3 py-1.5 bg-white rounded-lg text-sm font-medium text-gray-800 border border-gray-300 cursor-text hover:border-blue-400 transition-colors">
                    {field.value}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Capital Stack */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-blue-600" />
              <h3 className="text-base font-semibold text-gray-800">Capital Stack</h3>
              <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{MOCK_CAPITAL_STACK.length} layers</span>
            </div>
            <button className="flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
              <Plus size={14} />
              Add Layer
            </button>
          </div>

          {/* Stack Visualization Bar */}
          <div className="px-4 pt-3 pb-1">
            <div className="flex h-3 rounded-full overflow-hidden border border-gray-200">
              {MOCK_CAPITAL_STACK.map((layer) => {
                const colors: Record<string, string> = {
                  "Senior Debt": "#3b82f6",
                  "Mezzanine": "#8b5cf6",
                  "Preferred Equity": "#f59e0b",
                  "Common Equity": "#10b981",
                };
                return (
                  <div
                    key={layer.id}
                    className="h-full transition-all duration-300"
                    style={{ width: `${layer.percentOfStack}%`, backgroundColor: colors[layer.layerType] || "#6b7280" }}
                    title={`${layer.layerType}: ${formatCurrency(layer.amount)} (${layer.percentOfStack}%)`}
                  />
                );
              })}
            </div>
            <div className="flex items-center justify-between mt-1.5 mb-2">
              <div className="flex gap-3">
                {MOCK_CAPITAL_STACK.map((layer) => {
                  const colors: Record<string, string> = {
                    "Senior Debt": "bg-blue-500",
                    "Mezzanine": "bg-purple-500",
                    "Preferred Equity": "bg-amber-500",
                    "Common Equity": "bg-emerald-500",
                  };
                  return (
                    <div key={layer.id} className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${colors[layer.layerType]}`} />
                      <span className="text-xs text-gray-500">{layer.layerType} {layer.percentOfStack.toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
              <span className="text-sm font-semibold text-gray-700">Total: {formatCurrency(totalCap)}</span>
            </div>
          </div>

          {/* Stack Table */}
          <table className="w-full text-left">
            <thead>
              <tr className="border-t border-b border-gray-100 bg-gray-50">
                <th className="py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-10">#</th>
                <th className="py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Type</th>
                <th className="py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Amount</th>
                <th className="py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right w-16">%</th>
                <th className="py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Rate</th>
                <th className="py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center w-24">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {MOCK_CAPITAL_STACK.map((layer) => (
                <CapitalStackRow key={layer.id} layer={layer} />
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td colSpan={3} className="py-2 px-3 text-sm font-bold text-gray-700">Total Capitalization</td>
                <td className="py-2 px-3 text-right text-sm font-bold text-gray-900 font-mono">{formatCurrency(totalCap)}</td>
                <td className="py-2 px-3 text-right text-sm font-bold text-gray-500">100%</td>
                <td colSpan={2} className="py-2 px-3 text-right text-sm text-gray-400">
                  Blended: 8.2%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Accordion Sections */}
        <div className="space-y-2">
          <AccordionSection
            icon={<DollarSign size={16} className="text-gray-500" />}
            title="Loan Terms"
            count={MOCK_LOAN_TERMS.length}
          >
            {MOCK_LOAN_TERMS.map((f) => (
              <FieldRow key={f.label} label={f.label} value={f.value} />
            ))}
          </AccordionSection>

          <AccordionSection
            icon={<Target size={16} className="text-gray-500" />}
            title="Performance Metrics"
            count={MOCK_PERFORMANCE.length}
          >
            {MOCK_PERFORMANCE.map((f) => (
              <FieldRow key={f.label} label={f.label} value={f.value} />
            ))}
          </AccordionSection>

          <AccordionSection
            icon={<ToggleLeft size={16} className="text-gray-500" />}
            title="Program Qualifications"
            count={MOCK_PROGRAMS.length}
          >
            {MOCK_PROGRAMS.map((f) => (
              <ToggleRow key={f.label} label={f.label} value={f.value} />
            ))}
          </AccordionSection>

          <AccordionSection
            icon={<UserCheck size={16} className="text-gray-500" />}
            title="Borrower Qualifications"
            count={MOCK_BORROWER.length}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <Shield size={14} className="text-gray-400" />
              <span className="text-xs text-gray-400 uppercase tracking-wider">Read-only — sourced from Borrower Resume</span>
            </div>
            {MOCK_BORROWER.map((f) => (
              <FieldRow key={f.label} label={f.label} value={f.value} />
            ))}
          </AccordionSection>
        </div>
      </div>

      {/* ──────── RIGHT PANEL: Lender Matches ──────── */}
      <div className="w-[420px] shrink-0 space-y-4 sticky top-6">
        {/* Run Matchmaking Header */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Landmark size={16} className="text-blue-600" />
                Lender Matches
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Last run: Mar 6, 2:30pm (v4 results)</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
              <Zap size={16} />
              Run Matchmaking
            </button>
          </div>

          {/* Changed Fields Indicator */}
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-sm text-amber-700">3 fields changed since last run — results may be stale</span>
          </div>

          {/* Summary Stats */}
          <div className="flex flex-wrap gap-2 mt-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-lg text-sm font-medium text-gray-600">
              <BarChart3 size={14} />
              258 lenders scored
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 rounded-lg text-sm font-medium text-emerald-700">
              <Trophy size={14} />
              Top: 91/100
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-lg text-sm font-medium text-gray-500">
              <Clock size={14} />
              3.2s runtime
            </div>
          </div>
        </div>

        {/* Lender List */}
        <div className="space-y-3 max-h-[calc(100vh-240px)] overflow-y-auto pr-1">
          {MOCK_LENDERS.map((lender) => (
            <LenderCard key={lender.rank} lender={lender} />
          ))}
        </div>
      </div>
    </div>
  );
};
