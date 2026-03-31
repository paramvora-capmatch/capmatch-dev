"use client";

import React, { useState, useMemo, useCallback } from "react";
import { ChevronDown, ChevronRight, CheckCircle, Circle, ExternalLink, Download, Play, Loader2, Lock, Unlock, FileText, Send, Building2, Trophy, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import { useDocumentManagement, DocumentFile } from "@/hooks/useDocumentManagement";
import { apiClient } from "@/lib/apiClient";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";
import { getBackendUrl } from "@/lib/apiConfig";

import { AddFromResumeModal } from "@/components/lender/AddFromResumeModal";
import { useUnderwritingStore } from "@/stores/useUnderwritingStore";
import { supabase } from "@/lib/supabaseClient";
import { useEffect } from "react";
import { ValidationErrorsModal } from "./ValidationErrorsModal";

const MAX_LENDERS_SHOWN = 5;

function makeGenKey(lenderLei: string | null, docName: string): string {
    return `${lenderLei ?? "__project__"}::${docName}`;
}

/** Batch progress must be scoped per lender; stage id alone is shared across all wishlist tabs. */
function stageProgressKey(lenderLei: string | null, stageId: string): string {
    return `${lenderLei ?? "__project__"}::${stageId}`;
}

export interface MatchedLender {
    match_score_id: string;
    lender_lei: string;
    lender_name: string | null;
    rank: number;
    /** From wishlist; used for generate-single when generating for this lender's vault. */
    project_resume_id?: string | null;
    total_score: number;
    /** Label of the resume version (match run) this lender was added from. */
    run_label?: string | null;
}

interface DocItem {
    name: string;
    status: "uploaded" | "pending" | "action_required"; // Added action_required
    importance: "High" | "Medium" | "Low" | "Internal";
    rationale?: string;
    examples?: string;
    file?: DocumentFile; // Associated file if uploaded
    canGenerate?: boolean;
    addFromResume?: boolean;
    activeThreadId?: string; // Link to chat thread
}

interface StageProps {
    title: string;
    description: string;
    isExpanded: boolean;
    onToggle: () => void;
    docs: DocItem[];
    onDownload: (file: DocumentFile) => void;
    onClickFile: (file: DocumentFile) => void;
    onSelectFromResume: (docName: string) => void;
    onGenerate: (docName: string) => void;
    isGenerating: (docName: string) => boolean;
    onGenerateStage: (docs: DocItem[]) => void;
    onActionRequired: (idOrName: string) => void;
    progress?: { total: number; completed: number };
    viewerOnly?: boolean;
}

const StageAccordion: React.FC<StageProps> = ({
    title,
    description,
    isExpanded,
    onToggle,
    docs,
    onDownload,
    onClickFile,
    onSelectFromResume,
    onGenerate,
    isGenerating,
    onGenerateStage,
    onActionRequired,
    progress,
    viewerOnly = false,
}) => {
    const generateableDocs = docs.filter(d => d.canGenerate);
    const canGenerateAny = generateableDocs.length > 0 && !viewerOnly;
    const isBatchGenerating = !!progress;
    const percentComplete = isBatchGenerating && progress && progress.total > 0
        ? Math.round((progress.completed / progress.total) * 100)
        : 0;

    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50/50 mb-4 shadow-sm">
            <div
                onClick={onToggle}
                className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors text-left border-b border-gray-100 cursor-pointer"
            >
                <div className="flex items-center gap-3">
                    <div className={cn("p-1 rounded-md transition-colors", isExpanded ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500")}>
                        {isExpanded ? (
                            <ChevronDown className="h-5 w-5" />
                        ) : (
                            <ChevronRight className="h-5 w-5" />
                        )}
                    </div>

                    <div>
                        <h3 className="font-bold text-gray-900 text-base">{title}</h3>
                        <p className="text-sm text-gray-500">{description}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {canGenerateAny && (
                        <div className="flex flex-col items-end gap-1 mr-2">
                            {isBatchGenerating ? (
                                <div className="flex flex-col items-end min-w-[120px]">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                                        <span className="text-xs font-semibold text-blue-700">
                                            {progress?.completed}/{progress?.total} Generated
                                        </span>
                                    </div>
                                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
                                            style={{ width: `${percentComplete}%` }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!docs.some(d => isGenerating(d.name))) {
                                            // Trigger generation for ALL generateable docs in this stage
                                            onGenerateStage(generateableDocs);
                                        }
                                    }}
                                    disabled={docs.some(d => isGenerating(d.name))}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer border border-blue-100 disabled:opacity-50"
                                >
                                    {docs.some(d => isGenerating(d.name)) ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Play className="h-3.5 w-3.5 fill-current" />
                                    )}
                                    {docs.some(d => isGenerating(d.name)) ? "Generating..." : "Generate Docs"}
                                </button>
                            )}
                        </div>
                    )}
                    <div className="text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 shadow-sm">
                        {docs.length} Documents
                    </div>
                </div>
            </div>

            {isExpanded && (
                <div className="p-4 space-y-3 bg-gray-50/50">
                    {docs.map((doc, idx) => (
                        <div key={idx} className="group bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between min-h-[72px]">

                            {/* Left Section: Name + Hover Status */}
                            <div className="flex flex-col justify-center min-w-0 flex-1 mr-4">
                                <h4 className="font-bold text-gray-900 text-sm truncate" title={doc.name}>
                                    {doc.name}
                                </h4>

                                {/* Status Badge - Appears on Hover */}
                                <div className="hidden group-hover:flex items-center gap-2 mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                    {doc.status === "uploaded" ? (
                                        <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-50 px-2 py-0.5 rounded-sm border border-green-200">
                                            Uploaded
                                        </span>
                                    ) : doc.status === "action_required" ? (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onActionRequired(doc.name); }}
                                            className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-red-700 bg-red-50 px-2 py-0.5 rounded-sm border border-red-200 animate-pulse hover:bg-red-100 transition-colors cursor-pointer"
                                        >
                                            Action Required
                                        </button>
                                    ) : (
                                        <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-sm border border-amber-200">
                                            Missing
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Right Section: Status (Default) vs Actions (Hover) */}
                            <div className="flex items-center justify-end shrink-0">

                                {/* Default View: Status Badge */}
                                <div className="group-hover:hidden flex items-center">
                                    {doc.status === "uploaded" ? (
                                        <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-50 px-2 py-0.5 rounded-sm border border-green-200">
                                            Uploaded
                                        </span>
                                    ) : doc.status === "action_required" ? (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onActionRequired(doc.name); }}
                                            className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-red-700 bg-red-50 px-2 py-0.5 rounded-sm border border-red-200 animate-pulse hover:bg-red-100 transition-colors cursor-pointer"
                                        >
                                            Action Required
                                        </button>
                                    ) : (
                                        <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-sm border border-amber-200">
                                            Missing
                                        </span>
                                    )}
                                </div>

                                {/* Hover View: Actions (viewerOnly: only View Document / Download) */}
                                <div className="hidden group-hover:flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
                                    {doc.file ? (
                                        <>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onClickFile(doc.file!); }}
                                                className="flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-white border border-blue-200 rounded-md shadow-sm hover:bg-blue-50 transition-all"
                                            >
                                                <FileText className="h-3.5 w-3.5" />
                                                View Document
                                            </button>
                                            {!viewerOnly && (
                                                <>
                                                    {doc.canGenerate && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onGenerate(doc.name); }}
                                                            disabled={isGenerating(doc.name)}
                                                            className="flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 transition-all disabled:opacity-50"
                                                        >
                                                            {isGenerating(doc.name) ? (
                                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                            ) : (
                                                                <Play className="h-3.5 w-3.5 text-gray-500" />
                                                            )}
                                                            {isGenerating(doc.name) ? "Regenerating..." : "Regenerate"}
                                                        </button>
                                                    )}
                                                    {doc.addFromResume && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onSelectFromResume(doc.name); }}
                                                            className="flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 transition-all"
                                                        >
                                                            <ExternalLink className="h-3.5 w-3.5 text-gray-500" />
                                                            Change Document
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        !viewerOnly && (
                                            <>
                                                {doc.canGenerate && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onGenerate(doc.name); }}
                                                        disabled={isGenerating(doc.name)}
                                                        className="flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-all"
                                                    >
                                                        {isGenerating(doc.name) ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <Play className="h-3.5 w-3.5 fill-current" />
                                                        )}
                                                        {isGenerating(doc.name) ? "Generating..." : "Generate"}
                                                    </button>
                                                )}
                                                {(doc.addFromResume || !doc.canGenerate) && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onSelectFromResume(doc.name); }}
                                                        className="flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 transition-all"
                                                    >
                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                        Copy from Resume
                                                    </button>
                                                )}
                                            </>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

interface UnderwritingVaultProps {
    projectId?: string;
    orgId?: string; // Optional: needed for lenders to view borrower docs (pass owner_org_id)
    /** When true, only View Document is shown; no Generate/Regenerate/Copy from Resume */
    viewerOnly?: boolean;
}

const initialStages = [
    {
        id: "stage-1",
        title: "Initial Application & Screening",
        description: "The \"Gatekeeper\" phase. Determine creditworthiness and deal fit.",
        docs: [
            { name: "Personal Financial Statement (PFS)", status: "pending", importance: "High", rationale: "Guarantor Strength: Verifies Net Worth (> Loan Amt) and Liquidity.", canGenerate: true },
            { name: "Schedule of Real Estate Owned (SREO)", status: "pending", importance: "High", rationale: "Global Cash Flow: Analyzes sponsor's portfolio leverage.", canGenerate: true },
            { name: "T12 Financial Statement", status: "pending", importance: "High", rationale: "Valuation Baseline: The \"Truth\" of historical performance.", canGenerate: true },
            { name: "Current Rent Roll", status: "pending", importance: "High", rationale: "Revenue Validation: Validates T-12 revenue and occupancy.", canGenerate: true },
            { name: "Sources & Uses Model", status: "pending", importance: "High", rationale: "Deal Math: Proof that the deal works (Loan + Equity = Cost + Fees).", canGenerate: true },
            { name: "ProForma Cash flow", status: "pending", importance: "High", rationale: "Forecasts future performance.", canGenerate: true },
            { name: "CapEx Report", status: "pending", importance: "High", rationale: "Details capital expenditure plans.", canGenerate: true },
            { name: "Sponsor Bio", status: "pending", importance: "Medium", rationale: "Execution Capability: Proves borrower track record.", canGenerate: true },
        ]
    },
    {
        id: "stage-2",
        title: "Underwriting & Due Diligence",
        description: "The \"Verification\" phase. Validate value and physical condition.",
        docs: [
            { name: "Loan Application Form", status: "pending", importance: "High", rationale: "The \"Ask\": Captures loan amount, usage (Acq/Refi), and entity structure.", canGenerate: true },
            { name: "Tax Returns (2-3 Years)", status: "pending", importance: "High", rationale: "Income Verification: Cross-references PFS.", addFromResume: true },
            { name: "Purchase & Sale Agreement (PSA)", status: "pending", importance: "High", rationale: "Cost Basis: Establishes the \"Cost\" in LTC.", addFromResume: true },
            { name: "Entity Formation Docs", status: "pending", importance: "High", rationale: "KYC & Authority: Confirms entity exists and signer authority.", addFromResume: true },
            { name: "Credit Authorization & Gov ID", status: "pending", importance: "High", rationale: "Background Check: Mandatory for credit pulls and KYC.", addFromResume: true },
            { name: "Bank Statements", status: "pending", importance: "High", rationale: "Liquidity Proof: Proves cash on PFS exists and is liquid.", canGenerate: true },
            { name: "Church Financials", status: "pending", importance: "High", rationale: "Donation Stability: Tracks tithes, offerings, and attendance trends.", canGenerate: true },
            { name: "Offering Memorandum (OM)", status: "pending", importance: "Medium", rationale: "Context: Narrative, photos, and broker pro-forma.", canGenerate: true },
            { name: "Business Plan", status: "pending", importance: "Medium", rationale: "Strategy: Critical for value-add/construction.", canGenerate: true },
            { name: "Appraisal Report", status: "pending", importance: "High", rationale: "Valuation Check: Independent verification of As-Is/Stabilized Value." },
            { name: "Phase I ESA (Environmental)", status: "pending", importance: "High", rationale: "Liability Shield: Checks for contamination." },
            { name: "Title Commitment / ALTA Survey", status: "pending", importance: "High", rationale: "Lien Position: Ensures valid First Lien position." },
            { name: "Property Condition Report (PCR)", status: "pending", importance: "High", rationale: "Physical Risk: Identifies repairs and deferred maintenance." },
            { name: "Insurance Certificates", status: "pending", importance: "High", rationale: "Collateral Protection: Verifies Hazard, Liability, and Flood coverage." },
            { name: "Renovation Budget / CapEx Schedule", status: "pending", importance: "High", rationale: "Loan Sizing: Validates \"Uses\" of funds." },
            { name: "Zoning Letter / Report", status: "pending", importance: "High", rationale: "Legality: Confirms legal use." },
            { name: "Tenant Estoppel Certificates", status: "pending", importance: "High", rationale: "Cash Flow Lock: Tenants confirm rent and no disputes." },
            { name: "Flood Certification", status: "pending", importance: "High", rationale: "Federal Requirement: Determines if Flood Insurance is mandatory." },
            { name: "STR Reports", status: "pending", importance: "High", rationale: "Competitiveness: Benchmarks RevPAR and ADR." },
            { name: "Lease Abstracts / Agreements", status: "pending", importance: "Medium", rationale: "Rollover Risk: Analysis of clauses that kill cash flow." },
            { name: "Market / Feasibility Study", status: "pending", importance: "Medium", rationale: "Macro Risk: Analysis of supply/demand." },
            { name: "Franchise Agreement", status: "pending", importance: "Medium", rationale: "Flag Security: Ensures Brand is secured." },
            { name: "Service Contracts", status: "pending", importance: "Low", rationale: "OpEx Audit: Review of vendor contracts." },
        ]
    },
    {
        id: "stage-3",
        title: "Approval & Commitment",
        description: "The \"Handshake\" phase. Credit Committee approvals and formal offer.",
        docs: [
            { name: "Commitment Letter", status: "pending", importance: "High", rationale: "The Contract: Binding agreement terms." },
            { name: "Term Sheet / LOI", status: "pending", importance: "Medium", rationale: "Negotiation Tool: Non-binding outline." },
            { name: "Credit Approval Memo", status: "pending", importance: "Internal", rationale: "Internal Governance: Risk/reward sign-off." },
        ]
    },
    {
        id: "stage-4",
        title: "Closing & Funding",
        description: "The \"Papering\" phase. Legal counsel drafts documents to secure the loan.",
        docs: [
            { name: "Loan Agreement", status: "pending", importance: "High", rationale: "The Rulebook: Master contract with covenants." },
            { name: "Promissory Note", status: "pending", importance: "High", rationale: "The I.O.U.: Legal evidence of debt." },
            { name: "Mortgage / Deed of Trust", status: "pending", importance: "High", rationale: "The Anchor: Secures property as collateral." },
            { name: "Guarantees (Recourse / Bad Boy)", status: "pending", importance: "High", rationale: "The Hook: Defines personal liability." },
            { name: "Settlement Statement (HUD-1)", status: "pending", importance: "High", rationale: "The Receipt: Exact accounting of funds." },
            { name: "Assignment of Leases & Rents", status: "pending", importance: "High", rationale: "Cash Control: Right to collect rent on default." },
            { name: "Organizational Opinion of Counsel", status: "pending", importance: "Medium", rationale: "Legal Shield: Confirms entity validity." },
            { name: "Subordination Agreement (SNDA)", status: "pending", importance: "Medium", rationale: "Tenant Control: Tenants recognize Lender." },
            { name: "UCC-1 Financing Statement", status: "pending", importance: "Medium", rationale: "Chattel Security: Perfects lien on personal property." },
            { name: "Intercreditor Agreement", status: "pending", importance: "Medium", rationale: "Lender Priority: Defines payment priority." },
        ]
    },
    {
        id: "stage-5",
        title: "Post-Closing & Servicing",
        description: "The \"Monitoring\" phase. Ensure asset doesn't deteriorate.",
        docs: [
            { name: "Annual Financials & Tax Returns", status: "pending", importance: "High", rationale: "Covenant Testing: Checks debt support." },
            { name: "Compliance Certificate", status: "pending", importance: "High", rationale: "Self-Audit: Certifies covenant compliance." },
            { name: "Updated Rent Rolls", status: "pending", importance: "High", rationale: "Trend Analysis: Check for vacancy spikes." },
            { name: "Draw Requests", status: "pending", importance: "High", rationale: "Cash Release: Proof of work for construction." },
            { name: "Insurance Renewals", status: "pending", importance: "High", rationale: "Continuous Protection: Avoid force-placed insurance." },
            { name: "Comfort Letter", status: "pending", importance: "Medium", rationale: "Brand Continuity: Franchise transfer assurance." },
        ]
    },
];

/** Set to true to show underwriting stages 2–5 (Verification through Post-Closing). */
const SHOW_UNDERWRITING_PHASE_2_PLUS = false;

const visibleStages = SHOW_UNDERWRITING_PHASE_2_PLUS
    ? initialStages
    : initialStages.filter((s) => s.id === "stage-1");

export const UnderwritingVault: React.FC<UnderwritingVaultProps> = ({ projectId, orgId, viewerOnly = false }) => {
    const [expandedStage, setExpandedStage] = useState<string | null>("stage-1");
    // const [isGenerating, setIsGenerating] = useState(false); // Global generation disabled for generic button
    const [generatingDocs, setGeneratingDocs] = useState<Set<string>>(new Set());
    const [stageProgress, setStageProgress] = useState<Record<string, { total: number, completed: number }>>({});
    const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
    const [showResumeModal, setShowResumeModal] = useState(false);
    const [targetDocName, setTargetDocName] = useState<string | null>(null);

    const [resources, setResources] = useState<any[]>([]);

    // Matched lenders from current version's match run (top 5, per-lender vault)
    const [matchedLenders, setMatchedLenders] = useState<MatchedLender[]>([]);
    const [matchedLendersLoading, setMatchedLendersLoading] = useState(false);
    const [sendingToLenderId, setSendingToLenderId] = useState<string | null>(null);
    const [selectedLenderLei, setSelectedLenderLei] = useState<string | null>(null);
    /** When a lender is selected, id of the FOLDER "Lender: {lei}" under UNDERWRITING_DOCS_ROOT (so file list is vault-scoped). */
    const [lenderFolderId, setLenderFolderId] = useState<string | null>(null);

    // New validation state
    const [validationData, setValidationData] = useState<Record<string, { status: string, errors: any }>>({});
    const [validationModal, setValidationModal] = useState<{ isOpen: boolean, docName: string, errors: any }>({ isOpen: false, docName: "", errors: null });

    const { threads, loadThreads, setActiveThread, createThread, sendMessage } = useUnderwritingStore();

    // Load threads
    React.useEffect(() => {
        if (projectId) {
            loadThreads(projectId);
        }
    }, [projectId, loadThreads]);

    // Resolve lender vault folder id when a lender is selected (backend uses "Lender: {lender_lei}" under UNDERWRITING_DOCS_ROOT)
    useEffect(() => {
        if (!projectId || !selectedLenderLei) {
            setLenderFolderId(null);
            return;
        }
        let cancelled = false;
        (async () => {
            const { data: root, error: rootErr } = await supabase
                .from("resources")
                .select("id")
                .eq("project_id", projectId)
                .eq("resource_type", "UNDERWRITING_DOCS_ROOT")
                .maybeSingle();
            if (rootErr || !root?.id) {
                setLenderFolderId(null);
                return;
            }
            const folderName = `Lender: ${selectedLenderLei}`;
            const { data: folder, error: folderErr } = await supabase
                .from("resources")
                .select("id")
                .eq("parent_id", root.id)
                .eq("resource_type", "FOLDER")
                .eq("name", folderName)
                .maybeSingle();
            if (!cancelled) {
                setLenderFolderId(folderErr || !folder?.id ? null : folder.id);
            }
        })();
        return () => { cancelled = true; };
    }, [projectId, selectedLenderLei]);

    // Fetch resources: vault-scoped when a wishlist lender is selected, else project-level (legacy)
    const refreshResources = useCallback(async () => {
        if (!projectId) return;
        if (selectedLenderLei) {
            const { data: vaultDocs } = await supabase
                .from('underwriting_documents')
                .select('resource_id')
                .eq('lender_lei', selectedLenderLei);
            const resourceIds = (vaultDocs ?? []).map((d) => d.resource_id).filter(Boolean);
            if (resourceIds.length === 0) {
                setResources([]);
                return;
            }
            const { data: vaultResources, error } = await supabase
                .from('resources')
                .select('id, name')
                .eq('project_id', projectId)
                .in('id', resourceIds);
            if (!error && vaultResources) setResources(vaultResources);
            else setResources([]);
        } else {
            const { data, error } = await supabase
                .from('resources')
                .select('id, name')
                .eq('project_id', projectId);
            if (!error && data) setResources(data);
        }
    }, [projectId, selectedLenderLei]);

    useEffect(() => {
        refreshResources();
    }, [refreshResources]);

    useEffect(() => {
        if (!projectId) return;
        const channel = supabase
            .channel('vault-resources')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'resources', filter: `project_id=eq.${projectId}` },
                () => refreshResources()
            )
            .on('postgres_changes', { event: '*', schema: 'public', table: 'underwriting_documents' },
                () => refreshResources()
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [projectId, refreshResources]);

    // Matched lenders from wishlist API (required for vault per lender)
    const refreshMatchedLendersFromWishlist = useCallback(async () => {
        if (!projectId) return;
        setMatchedLendersLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            const base = getBackendUrl();
            const res = await fetch(`${base}/api/v1/projects/${encodeURIComponent(projectId)}/wishlist`, {
                headers: { ...(token && { Authorization: `Bearer ${token}` }) },
            });
            const list = res.ok ? await res.json() : [];
            const lenders: MatchedLender[] = Array.isArray(list)
                ? list.map((e: { lender_lei: string; lender_name?: string | null; project_resume_id?: string; total_score?: number; rank?: number; run_label?: string | null }, i: number) => ({
                    match_score_id: `wishlist_${e.lender_lei}`,
                    lender_lei: e.lender_lei,
                    lender_name: e.lender_name ?? null,
                    rank: e.rank ?? i + 1,
                    total_score: typeof e.total_score === "number" ? e.total_score : 0,
                    project_resume_id: e.project_resume_id ?? null,
                    run_label: e.run_label ?? null,
                  }))
                : [];
            setMatchedLenders(lenders);
            if (lenders.length === 0) {
                setSelectedLenderLei(null);
            } else if (!selectedLenderLei || !lenders.some((l) => l.lender_lei === selectedLenderLei)) {
                setSelectedLenderLei(lenders[0].lender_lei);
            }
        } finally {
            setMatchedLendersLoading(false);
        }
    }, [projectId, selectedLenderLei]);

    useEffect(() => {
        refreshMatchedLendersFromWishlist();
    }, [refreshMatchedLendersFromWishlist]);

    const selectedLender = useMemo(
        () => matchedLenders.find((l) => l.lender_lei === selectedLenderLei) ?? matchedLenders[0] ?? null,
        [matchedLenders, selectedLenderLei]
    );
    const selectedLenderDisplayName = selectedLender
        ? (selectedLender.lender_name || selectedLender.lender_lei)
        : null;

    const isDocGenerating = useCallback(
        (docName: string) => generatingDocs.has(makeGenKey(selectedLenderLei, docName)),
        [generatingDocs, selectedLenderLei]
    );

    const handleSendPackage = useCallback(async (lender: MatchedLender) => {
        if (!projectId) return;
        setSendingToLenderId(lender.match_score_id);
        try {
            // Look up the default lender org (entity_type = 'lender')
            const { data: lenderOrg, error: orgError } = await supabase
                .from("orgs")
                .select("id, name")
                .eq("entity_type", "lender")
                .limit(1)
                .maybeSingle();

            if (orgError || !lenderOrg) {
                toast.error("No lender organization found. Please ensure a lender account exists.");
                return;
            }

            // Check if access is already granted
            const { data: existingAccess } = await supabase
                .from("lender_project_access")
                .select("id")
                .eq("project_id", projectId)
                .eq("lender_org_id", lenderOrg.id)
                .maybeSingle();

            if (existingAccess) {
                toast.info(`Package already sent to ${lenderOrg.name || "lender"}.`);
                return;
            }

            // Grant access via the same RPC the Access Control tab uses
            const { error: rpcError } = await supabase.rpc(
                "grant_lender_project_access_by_advisor",
                {
                    p_project_id: projectId,
                    p_lender_org_id: lenderOrg.id,
                }
            );

            if (rpcError) throw rpcError;

            toast.success(
                `Package sent to ${lenderOrg.name || "lender"} for ${lender.lender_name || lender.lender_lei}!`
            );
        } catch (e) {
            console.error("Send package failed:", e);
            toast.error("Failed to send package. Please try again.");
        } finally {
            setSendingToLenderId(null);
        }
    }, [projectId]);

    // Fetch validation status from underwriting_documents
    useEffect(() => {
        if (!projectId || resources.length === 0) return;

        const fetchUnderwritingDocs = async () => {
            const resourceIds = resources.map(r => r.id);
            if (resourceIds.length === 0) return;

            const { data, error } = await supabase
                .from('underwriting_documents')
                .select('resource_id, validation_status, validation_errors')
                .in('resource_id', resourceIds);

            if (!error && data) {
                const map: Record<string, { status: string, errors: any }> = {};
                data.forEach(d => {
                    map[d.resource_id] = {
                        status: d.validation_status || 'pending',
                        errors: d.validation_errors
                    };
                });
                setValidationData(map);
            }
        };

        fetchUnderwritingDocs();

        // Subscribe to changes
        const channel = supabase
            .channel('vault-underwriting-docs')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'underwriting_documents' },
                () => fetchUnderwritingDocs()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [projectId, resources]);


    const handleActionRequired = (arg: string) => {
        // Try to interpret as docName (check current files)
        const file = files?.find(f => f.name === arg || f.name.replace(/\.[^/.]+$/, "") === arg);

        if (file) {
            // It's a file, check validation data
            const vData = validationData[file.resource_id];
            if (vData) {
                setValidationModal({
                    isOpen: true,
                    docName: arg,
                    errors: vData.errors
                });
                return;
            }
        }

        // Fallback: Assume it is a thread ID (Legacy flow or simple thread open)
        // If we can't find file, or file has no validation data, but we were called -> likely thread ID
        setActiveThread(arg);
    };

    const handleFixInChat = () => {
        const { docName, errors } = validationModal;
        setValidationModal({ ...validationModal, isOpen: false });
        if (docName) {
            handleValidationResolve(docName, errors);
        }
    };


    const handleValidationResolve = async (docName: string, errors?: any) => {
        try {
            // Create a unique topic to ensure we create a NEW thread
            const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const topic = `Fix: ${docName} (${timestamp})`;

            const threadId = await createThread(projectId!, topic) || undefined;

            if (!threadId) throw new Error("Failed to create thread");

            // Set state triggers for automated transition
            const { setDraftMessage, setRequestedTab, setAutoSendDraft, setRequestedWorkspaceMode } = useUnderwritingStore.getState();

            // Format message
            let errorText = `I need help resolving validation errors for **${docName}**:\n\n`;
            if (typeof errors === 'string') {
                errorText += errors;
            } else if (errors) {
                if (errors.reasoning) errorText += `**Reasoning:** ${errors.reasoning}\n\n`;
                if (errors.missing_fields && Array.isArray(errors.missing_fields)) {
                    errorText += `**Missing Fields:** ${errors.missing_fields.join(', ')}\n\n`;
                }
            }
            errorText += "\nPlease guide me on how to fix these.";

            setDraftMessage(errorText);
            setActiveThread(threadId); // Open the new thread

            // Set triggers
            setRequestedWorkspaceMode('underwriting');
            setRequestedTab('ai');
            setAutoSendDraft(true);

        } catch (e) {
            console.error("Failed to start resolution", e);
            toast.error("Failed to start resolution");
        }
    };


    // Leverage the existing document management hook for logic, signing, and downloads.
    // When a lender is selected, list that lender's vault folder so we see their generated docs (SREO, etc.).
    const { files, downloadFile, refresh } = useDocumentManagement({
        projectId: projectId || null,
        orgId: orgId || null,
        context: 'underwriting',
        folderId: selectedLenderLei ? lenderFolderId : null,
    });

    const toggleStage = (stageId: string) => {
        setExpandedStage(expandedStage === stageId ? null : stageId);
    };

    const handleDownload = async (file: DocumentFile) => {
        try {
            await downloadFile(file.resource_id);
        } catch (error) {
            console.error("Download failed", error);
        }
    };

    const handleClickFile = (file: DocumentFile) => {
        setSelectedFileId(file.resource_id);
    };

    const handleSelectFromResume = (docName: string) => {
        setTargetDocName(docName);
        setShowResumeModal(true);
    };

    // Job status: Supabase Realtime plus polling GET /jobs/{id} (prod-safe if Realtime misses updates).
    const subscribeToJobUntilDone = (jobId: string, timeoutMs = 180000): Promise<{ status: "completed" | "failed" | "timeout"; error_message?: string | null }> => {
        return new Promise((resolve) => {
            let resolved = false;
            let channel: ReturnType<typeof supabase.channel> | null = null;
            let timeoutId: ReturnType<typeof setTimeout> | null = null;
            let pollId: ReturnType<typeof setInterval> | null = null;

            const cleanup = () => {
                if (timeoutId) clearTimeout(timeoutId);
                if (pollId) clearInterval(pollId);
                if (channel) supabase.removeChannel(channel);
            };

            const finish = (result: { status: "completed" | "failed" | "timeout"; error_message?: string | null }) => {
                if (resolved) return;
                resolved = true;
                cleanup();
                resolve(result);
            };

            const checkTerminal = (status: string | undefined, error_message?: string | null) => {
                if (status === "completed") finish({ status: "completed" });
                else if (status === "failed") finish({ status: "failed", error_message: error_message ?? null });
            };

            const pollOnce = async () => {
                const { data, error } = await apiClient.getJob(jobId);
                if (resolved) return;
                if (error || !data) return;
                checkTerminal(data.status, data.error_message);
            };

            pollId = setInterval(() => {
                void pollOnce();
            }, 2000);
            void pollOnce();

            channel = supabase
                .channel(`underwriting-job-${jobId}`)
                .on(
                    "postgres_changes",
                    {
                        event: "UPDATE",
                        schema: "public",
                        table: "jobs",
                        filter: `id=eq.${jobId}`,
                    },
                    (payload: { new: { status: string; error_message?: string | null } }) => {
                        const row = payload.new;
                        checkTerminal(row.status, row.error_message ?? null);
                    }
                )
                .subscribe();

            timeoutId = setTimeout(() => finish({ status: "timeout" }), timeoutMs);
        });
    };

    // Individual Generation Logic
    const handleGenerateDoc = async (docName: string, options?: { isBatch?: boolean }): Promise<boolean> => {
        console.log(`[UnderwritingVault] Requesting generation for: ${docName}`);
        if (!projectId) {
            console.error("[UnderwritingVault] Missing projectId, aborting generation.");
            toast.error("Missing Project ID");
            return false;
        }

        const genKey = makeGenKey(selectedLenderLei, docName);
        if (generatingDocs.has(genKey)) return false;

        setGeneratingDocs(prev => new Set(prev).add(genKey));

        // Only show toast if NOT part of a batch
        const toastId = !options?.isBatch ? toast.loading(`Generating ${docName}...`) : undefined;

        try {
            const body: {
                project_id: string;
                document_name: string;
                lender_lei?: string;
                lender_name?: string;
                project_resume_id?: string;
            } = {
                project_id: projectId,
                document_name: docName,
            };
            if (selectedLenderLei) {
                body.lender_lei = selectedLenderLei;
                if (selectedLender?.lender_name?.trim()) {
                    body.lender_name = selectedLender.lender_name.trim();
                }
                if (selectedLender?.project_resume_id) {
                    body.project_resume_id = selectedLender.project_resume_id;
                }
            }
            const res = await apiClient.post(`/api/v1/underwriting/generate-single`, body);

            if (res.error) {
                throw res.error;
            }

            const jobId = res.data?.job_id as string | undefined;

            if (jobId) {
                const result = await subscribeToJobUntilDone(jobId);

                if (result.status === "completed") {
                    await refreshResources();
                    await refresh();
                    if (!options?.isBatch) {
                        toast.success(`${docName} generated successfully!`, { id: toastId });
                    }
                    return true;
                }
                if (result.status === "failed") {
                    if (!options?.isBatch) {
                        const msg = result.error_message || `Failed to generate ${docName}`;
                        toast.error(msg, { id: toastId });
                    }
                    return false;
                }
                // timeout
                if (!options?.isBatch) {
                    toast.warning(`${docName} generation is taking longer than expected. It will appear here soon.`, { id: toastId, duration: 5000 });
                }
                return false;
            }

            // No job_id (legacy): refresh once and assume success
            await refreshResources();
            await refresh();
            if (!options?.isBatch) {
                toast.success(`${docName} generation started.`, { id: toastId });
            }
            return true;

        } catch (error: unknown) {
            console.error("Generate failed:", error);
            const err = error as { status?: number; statusCode?: number; message?: string; detail?: string };
            const is409 = err?.status === 409 || err?.statusCode === 409;
            const msg = typeof err?.detail === "string" ? err.detail : err?.message;
            const alreadyInProgress = is409 || (typeof msg === "string" && msg.toLowerCase().includes("already in progress"));
            if (!options?.isBatch) {
                toast.error(
                    alreadyInProgress
                        ? "A generation is already in progress. Please wait for it to complete."
                        : `Failed to generate ${docName}`,
                    { id: toastId }
                );
            }
            return false;
        } finally {
            setGeneratingDocs(prev => {
                const next = new Set(prev);
                next.delete(genKey);
                return next;
            });
        }
    };



    const handleGenerateStage = async (stageId: string, docs: DocItem[]) => {
        const gk = (name: string) => makeGenKey(selectedLenderLei, name);
        const toGenerate = docs.filter(doc => doc.canGenerate && !generatingDocs.has(gk(doc.name)));

        const includeInvestmentMemo = !generatingDocs.has(gk("Investment Memo"));
        const totalCount = toGenerate.length + (includeInvestmentMemo ? 1 : 0);

        if (totalCount === 0) return;

        const spk = stageProgressKey(selectedLenderLei, stageId);
        setStageProgress(prev => ({
            ...prev,
            [spk]: { total: totalCount, completed: 0 }
        }));

        const toastId = toast.loading(`Batch generating ${totalCount} documents (incl. Investment Memo)...`);

        let successCount = 0;
        let hadFailure = false;

        if (includeInvestmentMemo) {
            const ok = await handleGenerateDoc("Investment Memo", { isBatch: true });
            if (ok) successCount += 1;
            else hadFailure = true;
            setStageProgress(prev => ({
                ...prev,
                [spk]: { total: totalCount, completed: successCount }
            }));
        }

        for (const doc of toGenerate) {
            const ok = await handleGenerateDoc(doc.name, { isBatch: true });
            if (ok) successCount += 1;
            else hadFailure = true;
            setStageProgress(prev => ({
                ...prev,
                [spk]: { total: totalCount, completed: successCount }
            }));
        }

        if (hadFailure || successCount < totalCount) {
            toast.error(
                successCount > 0
                    ? `Batch finished with errors: ${successCount}/${totalCount} succeeded.`
                    : "Batch generation failed. Check individual documents or try again.",
                { id: toastId, duration: 6000 }
            );
        } else {
            toast.success("Batch generation complete!", { id: toastId });
        }

        setTimeout(() => {
            setStageProgress(prev => {
                const next = { ...prev };
                delete next[spk];
                return next;
            });
        }, 3000);
    };

    // Merge fetched files into stages (when a lender is selected, only show files for that vault's resources)
    const resourceIdSet = useMemo(() => new Set(resources.map((r) => r.id)), [resources]);
    const { stages, investmentMemoFile } = useMemo(() => {
        const vaultFiles = selectedLenderLei
            ? files.filter((f) => resourceIdSet.has(f.resource_id))
            : files;
        const fileMap = new Map<string, DocumentFile>();
        if (vaultFiles) {
            vaultFiles.forEach(f => {
                fileMap.set(f.name, f);
                const nameWithoutExt = f.name.replace(/\.[^/.]+$/, "");
                if (nameWithoutExt !== f.name) {
                    fileMap.set(nameWithoutExt, f);
                }
            });
        }

        console.log("UnderwritingVault: fileMap keys:", Array.from(fileMap.keys()));

        // Detect Investment Memo file
        const memoFile = fileMap.get("Investment Memo") ?? null;

        const mappedStages = visibleStages.map(stage => ({
            ...stage,
            docs: stage.docs.map(doc => {
                const foundFile = fileMap.get(doc.name);

                // Check validation status first
                if (foundFile) {
                    const vData = validationData[foundFile.resource_id];
                    if (vData?.status === 'action_required') {
                        return {
                            ...doc,
                            status: "action_required" as const,
                            file: foundFile
                        };
                    }

                    return {
                        ...doc,
                        status: "uploaded" as const,
                        file: foundFile
                    };
                }

                // Check for active "Missing Data" thread (LEGACY/FALLBACK)
                // Topic format from backend: "Missing data for {docName}: {missing fields}"
                const activeThread = threads.find(t =>
                    t.project_id === projectId &&
                    t.status === 'active' &&
                    t.topic?.includes(`Missing data for ${doc.name}`)
                );
                if (activeThread) {
                    return {
                        ...doc,
                        status: "action_required" as const,
                        activeThreadId: activeThread.id
                    };
                }

                return doc;
            })
        }));

        return { stages: mappedStages, investmentMemoFile: memoFile };
    }, [files, threads, projectId, validationData, resourceIdSet, selectedLenderLei]);

    const hasMatchedLenders = matchedLenders.length > 0;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Underwriting Vault</h2>
                    <p className="text-gray-500 mt-1">
                        {hasMatchedLenders
                            ? `${matchedLenders.length} wishlist lender${matchedLenders.length !== 1 ? "s" : ""} — select one to manage their deal package.`
                            : "Manage, generate, and review underwriting documents."
                        }
                    </p>
                </div>
            </div>

            {/* ── Matched lender selector (top 5 as tabs) ── */}
            {projectId && (
                <div className="mb-6">
                    {matchedLendersLoading ? (
                        <div className="flex items-center gap-2 text-gray-500 text-sm p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading wishlist…
                        </div>
                    ) : !hasMatchedLenders ? (
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <p className="text-sm text-gray-500">No lenders in your wishlist. In the Lender Matching tab, save a match run and add lenders to your wishlist to manage their deal packages here.</p>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {matchedLenders.map((lender) => {
                                const isSelected = lender.lender_lei === selectedLenderLei;
                                const displayName = lender.lender_name || lender.lender_lei;
                                return (
                                    <button
                                        key={lender.match_score_id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedLenderLei(lender.lender_lei);
                                            setExpandedStage("stage-1");
                                        }}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all",
                                            isSelected
                                                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                                : "bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                                        )}
                                    >
                                        <Building2 size={14} className={isSelected ? "text-blue-200" : "text-gray-400"} />
                                        <span className="truncate max-w-[140px]">{displayName}</span>
                                        <span className={cn(
                                            "text-xs tabular-nums px-1.5 py-0.5 rounded-full font-semibold",
                                            isSelected ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"
                                        )}>
                                            #{lender.rank}
                                        </span>
                                        <span className={cn(
                                            "text-xs tabular-nums",
                                            isSelected ? "text-blue-200" : "text-gray-400"
                                        )}>
                                            {(lender.total_score ?? 0).toFixed(1)}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ── Per-lender vault content ── */}
            {hasMatchedLenders && selectedLender ? (
                <div>
                    {/* Lender header bar with Send package */}
                    <div className="flex items-center justify-between mb-4 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-lg text-sm font-bold">
                                #{selectedLender.rank}
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-gray-900">{selectedLenderDisplayName}</h3>
                                <p className="text-xs text-gray-500">
                                    Match score: {(selectedLender.total_score ?? 0).toFixed(1)}/100
                                    {selectedLender.run_label ? ` from "${selectedLender.run_label}"` : ""}
                                    {" · "}LEI: {selectedLender.lender_lei}
                                </p>
                            </div>
                        </div>
                        {!viewerOnly && (
                            <button
                                type="button"
                                onClick={() => handleSendPackage(selectedLender)}
                                disabled={sendingToLenderId === selectedLender.match_score_id}
                                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 shadow-sm transition-colors"
                            >
                                {sendingToLenderId === selectedLender.match_score_id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                                Send package
                            </button>
                        )}
                    </div>

                    {/* Investment Memo — standalone featured card */}
                    <div className="mb-4 bg-gradient-to-r from-indigo-50 via-blue-50 to-violet-50 border border-indigo-200 rounded-xl p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-lg shadow-sm">
                                    <Sparkles className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-gray-900">Investment Memo</h3>
                                    <p className="text-xs text-gray-500">One-page executive summary tailored for this lender</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {investmentMemoFile ? (
                                    <>
                                        <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-50 px-2 py-0.5 rounded-sm border border-green-200">
                                            Generated
                                        </span>
                                        <button
                                            onClick={() => handleClickFile(investmentMemoFile)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-white border border-blue-200 rounded-md shadow-sm hover:bg-blue-50 transition-all"
                                        >
                                            <FileText className="h-3.5 w-3.5" />
                                            View
                                        </button>
                                        {!viewerOnly && (
                                            <button
                                                onClick={() => handleGenerateDoc("Investment Memo")}
                                                disabled={isDocGenerating("Investment Memo")}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 transition-all disabled:opacity-50"
                                            >
                                                {isDocGenerating("Investment Memo") ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <Play className="h-3.5 w-3.5 text-gray-500" />
                                                )}
                                                {isDocGenerating("Investment Memo") ? "Regenerating..." : "Regenerate"}
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-sm border border-amber-200">
                                            Not generated
                                        </span>
                                        {!viewerOnly && (
                                            <button
                                                onClick={() => handleGenerateDoc("Investment Memo")}
                                                disabled={isDocGenerating("Investment Memo")}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-all"
                                            >
                                                {isDocGenerating("Investment Memo") ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <Sparkles className="h-3.5 w-3.5" />
                                                )}
                                                {isDocGenerating("Investment Memo") ? "Generating..." : "Generate"}
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Document stages — scoped to this lender */}
                    <div className="space-y-4">
                        {stages.map((stage) => (
                            <StageAccordion
                                key={`${selectedLender.lender_lei}-${stage.id}`}
                                title={stage.title}
                                description={stage.description}
                                isExpanded={expandedStage === stage.id}
                                onToggle={() => toggleStage(stage.id)}
                                docs={stage.docs as DocItem[]}
                                onDownload={handleDownload}
                                onClickFile={handleClickFile}
                                onSelectFromResume={handleSelectFromResume}
                                onGenerate={(docName) => handleGenerateDoc(docName)}
                                isGenerating={isDocGenerating}
                                onGenerateStage={(docs) => handleGenerateStage(stage.id, docs)}
                                onActionRequired={handleActionRequired}
                                progress={stageProgress[stageProgressKey(selectedLenderLei, stage.id)]}
                                viewerOnly={viewerOnly}
                            />
                        ))}
                    </div>
                </div>
            ) : !hasMatchedLenders ? (
                /* Fallback: no matched lenders — show full vault as before */
                <div className="space-y-4">
                    {/* Investment Memo — standalone featured card (fallback) */}
                    <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-violet-50 border border-indigo-200 rounded-xl p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-lg shadow-sm">
                                    <Sparkles className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-gray-900">Investment Memo</h3>
                                    <p className="text-xs text-gray-500">One-page executive summary of the project</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {investmentMemoFile ? (
                                    <>
                                        <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-50 px-2 py-0.5 rounded-sm border border-green-200">
                                            Generated
                                        </span>
                                        <button
                                            onClick={() => handleClickFile(investmentMemoFile)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-white border border-blue-200 rounded-md shadow-sm hover:bg-blue-50 transition-all"
                                        >
                                            <FileText className="h-3.5 w-3.5" />
                                            View
                                        </button>
                                        {!viewerOnly && (
                                            <button
                                                onClick={() => handleGenerateDoc("Investment Memo")}
                                                disabled={isDocGenerating("Investment Memo")}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 transition-all disabled:opacity-50"
                                            >
                                                {isDocGenerating("Investment Memo") ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <Play className="h-3.5 w-3.5 text-gray-500" />
                                                )}
                                                {isDocGenerating("Investment Memo") ? "Regenerating..." : "Regenerate"}
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-sm border border-amber-200">
                                            Not generated
                                        </span>
                                        {!viewerOnly && (
                                            <button
                                                onClick={() => handleGenerateDoc("Investment Memo")}
                                                disabled={isDocGenerating("Investment Memo")}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-all"
                                            >
                                                {isDocGenerating("Investment Memo") ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <Sparkles className="h-3.5 w-3.5" />
                                                )}
                                                {isDocGenerating("Investment Memo") ? "Generating..." : "Generate"}
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    {stages.map((stage) => (
                        <StageAccordion
                            key={stage.id}
                            title={stage.title}
                            description={stage.description}
                            isExpanded={expandedStage === stage.id}
                            onToggle={() => toggleStage(stage.id)}
                            docs={stage.docs as DocItem[]}
                            onDownload={handleDownload}
                            onClickFile={handleClickFile}
                            onSelectFromResume={handleSelectFromResume}
                            onGenerate={(docName) => handleGenerateDoc(docName)}
                            isGenerating={isDocGenerating}
                            onGenerateStage={(docs) => handleGenerateStage(stage.id, docs)}
                            onActionRequired={handleActionRequired}
                            progress={stageProgress[stageProgressKey(null, stage.id)]}
                            viewerOnly={viewerOnly}
                        />
                    ))}
                </div>
            ) : null}

            {/* Modals */}
            {selectedFileId && (
                <DocumentPreviewModal
                    resourceId={selectedFileId}
                    onClose={() => setSelectedFileId(null)}
                    onDeleteSuccess={() => {
                        setSelectedFileId(null);
                        refresh();
                    }}
                />
            )}

            {showResumeModal && projectId && (
                <AddFromResumeModal
                    isOpen={showResumeModal}
                    onClose={() => setShowResumeModal(false)}
                    projectId={projectId}
                    renameTo={targetDocName || undefined}
                    onSuccess={() => {
                        toast.success("Document copied successfully");
                        refresh();
                    }}
                />
            )}

            <ValidationErrorsModal
                isOpen={validationModal.isOpen}
                onClose={() => setValidationModal({ ...validationModal, isOpen: false })}
                errors={validationModal.errors}
                docName={validationModal.docName}
                onFixInChat={handleFixInChat}
            />
        </div>
    );
};
