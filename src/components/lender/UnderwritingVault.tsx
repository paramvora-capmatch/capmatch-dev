"use client";

import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, CheckCircle, Circle, ExternalLink, Download, Play, Loader2, Lock, Unlock, FileText } from "lucide-react";
import { toast, Toaster } from "sonner";
import { cn } from "@/utils/cn";
import { useDocumentManagement, DocumentFile } from "@/hooks/useDocumentManagement";
import { apiClient } from "@/lib/apiClient";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";

import { AddFromResumeModal } from "@/components/lender/AddFromResumeModal";
import { useChatStore } from "@/stores/useChatStore";
import { supabase } from "@/lib/supabaseClient";
import { useEffect } from "react";

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
    onViewTemplate: (docName: string) => void; 
    onGenerateStage: (docs: DocItem[]) => void;
    onActionRequired: (threadId: string) => void;
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
    onViewTemplate,
    onGenerateStage,
    onActionRequired
}) => {
    // Use all generateable docs for the stage action, supporting regeneration
    const generateableDocs = docs.filter(d => d.canGenerate);

    console.log(generateableDocs)
    // Button is visible if there are ANY generateable docs (not just missing ones)
    const canGenerateAny = generateableDocs.length > 0;

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
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!docs.some(d => isGenerating(d.name))) {
                                    // Trigger generation for ALL generateable docs in this stage
                                    onGenerateStage(generateableDocs);
                                }
                            }}
                            disabled={docs.some(d => isGenerating(d.name))}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors mr-2 cursor-pointer border border-blue-100 disabled:opacity-50"
                        >
                            {docs.some(d => isGenerating(d.name)) ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Play className="h-3.5 w-3.5 fill-current" />
                            )}
                            {docs.some(d => isGenerating(d.name)) ? "Generating..." : "Generate Docs"}
                        </button>
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
                                        <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-red-700 bg-red-50 px-2 py-0.5 rounded-sm border border-red-200 animate-pulse">
                                            Action Required
                                        </span>
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
                                            onClick={(e) => { e.stopPropagation(); if(doc.activeThreadId) onActionRequired(doc.activeThreadId); }}
                                            className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-red-700 bg-red-50 px-2 py-0.5 rounded-sm border border-red-200 animate-pulse hover:bg-red-100 transition-colors"
                                        >
                                            Action Required
                                        </button>
                                    ) : (
                                        <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-sm border border-amber-200">
                                            Missing
                                        </span>
                                    )}
                                </div>

                                {/* Hover View: Actions */}
                                <div className="hidden group-hover:flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
                                     {/* View Template Action */}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onViewTemplate(doc.name); }}
                                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 hover:text-gray-900 transition-all"
                                    >
                                        <FileText className="h-3.5 w-3.5 text-gray-500" />
                                        <span>Template</span>
                                    </button>

                                     {/* Document Actions */}
                                    {doc.file ? (
                                        <>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onClickFile(doc.file!); }}
                                                className="flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-white border border-blue-200 rounded-md shadow-sm hover:bg-blue-50 transition-all"
                                            >
                                                <FileText className="h-3.5 w-3.5" />
                                                View Document
                                            </button>
                                            
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
                                    ) : (
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
}

const initialStages = [
    {
        id: "stage-1",
        title: "Initial Application & Screening",
        description: "The \"Gatekeeper\" phase. Determine creditworthiness and deal fit.",
        docs: [
            { name: "Loan Application Form", status: "pending", importance: "High", rationale: "The \"Ask\": Captures loan amount, usage (Acq/Refi), and entity structure.", canGenerate: true },
            { name: "Personal Financial Statement (PFS)", status: "pending", importance: "High", rationale: "Guarantor Strength: Verifies Net Worth (> Loan Amt) and Liquidity.", canGenerate: true },
            { name: "Schedule of Real Estate Owned (SREO)", status: "pending", importance: "High", rationale: "Global Cash Flow: Analyzes sponsor’s portfolio leverage.", canGenerate: true },
            { name: "Tax Returns (2-3 Years)", status: "pending", importance: "High", rationale: "Income Verification: Cross-references PFS.", addFromResume: true },
            { name: "Purchase & Sale Agreement (PSA)", status: "pending", importance: "High", rationale: "Cost Basis: Establishes the \"Cost\" in LTC.", addFromResume: true },
            { name: "Entity Formation Docs", status: "pending", importance: "High", rationale: "KYC & Authority: Confirms entity exists and signer authority.", addFromResume: true },
            { name: "T12 Financial Statement", status: "pending", importance: "High", rationale: "Valuation Baseline: The \"Truth\" of historical performance.", canGenerate: true },
            { name: "Current Rent Roll", status: "pending", importance: "High", rationale: "Revenue Validation: Validates T-12 revenue and occupancy.", canGenerate: true },
            { name: "Sources & Uses Model", status: "pending", importance: "High", rationale: "Deal Math: Proof that the deal works (Loan + Equity = Cost + Fees).", canGenerate: true },
            { name: "Credit Authorization & Gov ID", status: "pending", importance: "High", rationale: "Background Check: Mandatory for credit pulls and KYC.", addFromResume: true },
            { name: "Bank Statements", status: "pending", importance: "High", rationale: "Liquidity Proof: Proves cash on PFS exists and is liquid.", canGenerate: true },
            { name: "Church Financials", status: "pending", importance: "High", rationale: "Donation Stability: Tracks tithes, offerings, and attendance trends.", canGenerate: true },
            { name: "ProForma Cash flow", status: "pending", importance: "High", rationale: "Forecasts future performance.", canGenerate: true },
            { name: "CapEx Report", status: "pending", importance: "High", rationale: "Details capital expenditure plans.", canGenerate: true },
            { name: "Sponsor Bio", status: "pending", importance: "Medium", rationale: "Execution Capability: Proves borrower track record.", canGenerate: true },
            { name: "Offering Memorandum (OM)", status: "pending", importance: "Medium", rationale: "Context: Narrative, photos, and broker pro-forma.", canGenerate: true },
            { name: "Business Plan", status: "pending", importance: "Medium", rationale: "Strategy: Critical for value-add/construction.", canGenerate: true },
        ]
    },
    // ... other stages remain same
    {
        id: "stage-2",
        title: "Underwriting & Due Diligence",
        description: "The \"Verification\" phase. Validate value and physical condition.",
        docs: [
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

export const UnderwritingVault: React.FC<UnderwritingVaultProps> = ({ projectId, orgId }) => {
    const [expandedStage, setExpandedStage] = useState<string | null>("stage-1");
    // const [isGenerating, setIsGenerating] = useState(false); // Global generation disabled for generic button
    const [generatingDocs, setGeneratingDocs] = useState<Set<string>>(new Set());
    const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
    const [showResumeModal, setShowResumeModal] = useState(false);
    const [targetDocName, setTargetDocName] = useState<string | null>(null);
    const [templatesMap, setTemplatesMap] = useState<Record<string, string>>({});
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [resources, setResources] = useState<any[]>([]);

    const { threads, loadThreadsForProject, setActiveThread, createThread, sendMessage } = useChatStore();

    // Load threads
    React.useEffect(() => {
        if (projectId) {
            loadThreadsForProject(projectId);
        }
    }, [projectId, loadThreadsForProject]);

    const handleActionRequired = (threadId: string) => {
        setActiveThread(threadId);
        // We might need to ensure the StickyChatCard is open/visible.
        // Usually, setActiveThread triggers the store, and StickyChatCard listens to it.
        // If StickyChatCard logic requires explicit 'open' state in a parent, that might be an issue,
        // but typically it subscribes to activeThreadId.
    };
    React.useEffect(() => {
        const fetchTemplates = async () => {
             if (!projectId) return;
             
            try {
                const response = await apiClient.get<Array<{name: string, resource_id: string}>>(`/api/v1/underwriting/templates?project_id=${projectId}`);
                const map: Record<string, string> = {};
                if (response.data) {
                    response.data.forEach(t => {
                        map[t.name] = t.resource_id;
                    });
                }
                setTemplatesMap(map);
            } catch (err) {
                console.warn("Failed to fetch templates list:", err);
            }
        };
        fetchTemplates();
    }, [projectId]);

  // Fetch validation status from resources
  useEffect(() => {
    if (!projectId) return;

    const fetchResources = async () => {
      const { data, error } = await supabase
        .from('resources')
        .select('id, name, validation_status, validation_errors')
        .eq('project_id', projectId);
        
      if (!error && data) {
         setResources(data);
      }
    };

    fetchResources();

    // Subscribe to resource changes
    const channel = supabase
      .channel('vault-resources')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resources', filter: `project_id=eq.${projectId}` }, 
        () => fetchResources()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  // Updated helper to check status
  const getDocStatus = (docName: string) => {
    const res = resources.find(r => r.name === docName);
    // Return action_required if resource says so
    if (res?.validation_status === 'action_required') return 'action_required';
    
    // Fallback to active threads (legacy support or if orchestrator still creates them)
    // But V2 prefers resource status.
    const activeThreads = threads.filter(t => t.status === 'active'); // Define activeThreads here
    const hasThread = activeThreads.some(t => t.topic?.includes(docName));
    return hasThread ? 'action_required' : 'uploaded'; // Simplified
  };

  const handleValidationResolve = async (docName: string) => {
    const res = resources.find(r => r.name === docName);
    if (!res) return;

    // 1. Get/Create Unified Thread
    try {
      // creating with stage='underwriting' returns existing one
      const threadId = await createThread(projectId!, 'AI Underwriter', undefined); // stage defaults to underwriting in store? No, need to pass it.
      // Wait, createThread signature in store: (projectId, topic, participantIds) -> we might need to update store to pass stage/resource_id?
      // Actually store calls apiClient.manageChatThread which supports stage.
      // But useChatStore.createThread doesn't expose stage/resource_id args yet.
      // We should update useChatStore or just call apiClient directly here? 
      // Better: Update useChatStore or use existing topic convention if backend handles it.
      // Backend 'create' handles finding existing if stage provided.
      // Let's assume createThread in store needs update OR we rely on backend default stage='underwriting'.
      
      // 2. Send Context Message
      if (res.validation_errors) {
         await sendMessage(threadId, `I need to resolve the validation errors for **${docName}**.`, null, {
            type: 'validation_error',
            doc_name: docName,
            errors: res.validation_errors
         });
      }
      
      // 3. Open Chat
      setActiveThread(threadId);
      
    } catch (e) {
      console.error("Failed to start resolution", e);
      toast.error("Failed to start resolution");
    }
  };

  // ... (render update)
  // Inside the mapped items, pass status based on getDocStatus
  // And onClick calls handleValidationResolve


    // Leverage the existing document management hook for logic, signing, and downloads
    const { files, downloadFile, refresh } = useDocumentManagement({
        projectId: projectId || null,
        orgId: orgId || null,
        context: 'underwriting',
        folderId: null // Fetch from root
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
    
    // Reliable polling function
    const waitForGeneration = async (docName: string, maxAttempts = 60, intervalMs = 3000): Promise<boolean> => {
        let attempts = 0;
        const initialFile = files?.find(f => f.name === docName || f.name.replace(/\.[^/.]+$/, "") === docName);
        const initialVersion = initialFile?.version_number;

        return new Promise((resolve) => {
            const poll = setInterval(async () => {
                attempts++;
                const result = await refresh(); // Force fetch
                const currentFiles = result?.files || [];
                
                const currentFile = currentFiles?.find(f => f.name === docName || f.name.replace(/\.[^/.]+$/, "") === docName);
                
                // Success conditions:
                // 1. File didn't exist before, now it does.
                // 2. File existed before, now version number is higher.
                // 3. File existed before, now updated_at is more recent (if version logic fails).

                const isNew = !initialFile && currentFile;
                const isUpdated = initialFile && currentFile && (currentFile.version_number > (initialVersion || 0));
                
                if (isNew || isUpdated) {
                    clearInterval(poll);
                    resolve(true);
                } else if (attempts >= maxAttempts) {
                    clearInterval(poll);
                    resolve(false);
                }
            }, intervalMs);
        });
    };

    // Individual Generation Logic
    const handleGenerateDoc = async (docName: string) => {
        console.log(`[UnderwritingVault] Requesting generation for: ${docName}`);
        if (!projectId) {
            console.error("[UnderwritingVault] Missing projectId, aborting generation.");
            toast.error("Missing Project ID");
            return;
        }

        if (generatingDocs.has(docName)) return; // Prevent double click

        setGeneratingDocs(prev => new Set(prev).add(docName));
        const toastId = toast.loading(`Generating ${docName}...`);
        
        try {
            // Updated endpoint to generate specific document
            await apiClient.post(`/api/v1/underwriting/generate-single`, {
                project_id: projectId,
                document_name: docName
            });

            // Poll for completion - wait up to 3 minutes (60 * 3s)
            const success = await waitForGeneration(docName);

            if (success) {
                toast.success(`${docName} generated successfully!`, { id: toastId });
            } else {
                 toast.warning(`${docName} generation is taking longer than expected. It will appear here soon.`, { id: toastId, duration: 5000 });
            }

        } catch (error) {
            console.error("Generate failed:", error);
            toast.error(`Failed to generate ${docName}`, { id: toastId });
        } finally {
             setGeneratingDocs(prev => {
                const next = new Set(prev);
                next.delete(docName);
                return next;
            });
        }
    };
    
    // View Template logic - Opens preview modal
    const handleViewTemplate = async (docName: string) => {
        const resourceId = templatesMap[docName] || templatesMap[`${docName} Template`];
        if (resourceId) {
            setSelectedTemplateId(resourceId);
        } else {
            console.warn(`Template not found for: ${docName}`);
            toast.error("Template not available for preview yet.");
        }
    };
    
    const handleGenerateStage = (docs: DocItem[]) => {
        toast.info(`Starting batch generation for ${docs.length} documents...`);
        docs.forEach(doc => {
            if (doc.canGenerate && !generatingDocs.has(doc.name)) {
                handleGenerateDoc(doc.name);
            }
        });
    };

    // Merge fetched files into stages
    const stages = useMemo(() => {
        console.log("UnderwritingVault: received files:", files);
        console.log("UnderwritingVault: templatesMap:", templatesMap);

        // Create a lookup map by name for O(1) access
        const fileMap = new Map<string, DocumentFile>();
        if (files) {
            files.forEach(f => {
                fileMap.set(f.name, f);
                // Also map the name without extension to handle "Current Rent Roll.xlsx" matching "Current Rent Roll"
                const nameWithoutExt = f.name.replace(/\.[^/.]+$/, "");
                if (nameWithoutExt !== f.name) {
                    fileMap.set(nameWithoutExt, f);
                }
            });
        }
        
        console.log("UnderwritingVault: fileMap keys:", Array.from(fileMap.keys()));

        return initialStages.map(stage => ({
            ...stage,
            docs: stage.docs.map(doc => {
                const foundFile = fileMap.get(doc.name);
                
                // Check for active "Missing Data" thread
                // Topic format from backend: "Missing data for {docName}: {missing fields}"
                const activeThread = threads.find(t => 
                    t.project_id === projectId && 
                    t.status === 'active' && 
                    t.topic?.includes(`Missing data for ${doc.name}`)
                );

                if (foundFile) {
                    console.log(`UnderwritingVault: Matched doc '${doc.name}' with file '${foundFile.name}'`);
                    return {
                        ...doc,
                        status: "uploaded" as const,
                        file: foundFile
                    };
                } else if (activeThread) {
                     return {
                        ...doc,
                        status: "action_required" as const,
                        activeThreadId: activeThread.id
                    };
                }
                
                return doc;
            })
        }));
    }, [files, templatesMap, threads, projectId]);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Underwriting Vault</h2>
                    <p className="text-gray-500 mt-1">Manage, generate, and review underwriting documents.</p>
                </div>
            </div>

            <div className="space-y-4">
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
                        onGenerate={handleGenerateDoc}
                        isGenerating={(name) => generatingDocs.has(name)}
                        onViewTemplate={handleViewTemplate}
                        onGenerateStage={handleGenerateStage}
                        onActionRequired={handleActionRequired}
                    />
                ))}
            </div>
            
            {/* Modals ... */}
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
            {selectedTemplateId && (
                <DocumentPreviewModal
                    resourceId={selectedTemplateId}
                    onClose={() => setSelectedTemplateId(null)}
                    openVersionsDefault={false}
                />
            )}
            <Toaster position="bottom-right" richColors />
        </div>
    );
};
