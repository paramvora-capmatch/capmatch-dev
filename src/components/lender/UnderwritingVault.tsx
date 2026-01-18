"use client";

import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, CheckCircle, Circle, ExternalLink, Download, Play, Loader2, Lock, Unlock, FileText } from "lucide-react";
import { cn } from "@/utils/cn";
import { useDocumentManagement, DocumentFile } from "@/hooks/useDocumentManagement";
import { apiClient } from "@/lib/apiClient";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";

import { AddFromResumeModal } from "@/components/lender/AddFromResumeModal";

interface DocItem {
    name: string;
    status: "uploaded" | "pending";
    importance: "High" | "Medium" | "Low" | "Internal";
    rationale?: string;
    examples?: string;
    file?: DocumentFile; // Associated file if uploaded
    canGenerate?: boolean;
    addFromResume?: boolean;
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
    onViewTemplate
}) => {
    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white mb-4 shadow-sm">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
                <div className="flex items-center gap-3">
                    {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                    ) : (
                        <ChevronRight className="h-5 w-5 text-gray-500" />
                    )}
                    <div>
                        <h3 className="font-semibold text-gray-900">{title}</h3>
                        <p className="text-sm text-gray-500">{description}</p>
                    </div>
                </div>
                <div className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-100">
                    {docs.length} Documents
                </div>
            </button>

            {isExpanded && (
                <div className="border-t border-gray-200 bg-white overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-4 py-3 font-medium min-w-[300px]">Document Name</th>
                                <th className="px-4 py-3 font-medium w-[180px]">Actions</th>
                                <th className="px-4 py-3 font-medium w-[120px]">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {docs.map((doc, idx) => (
                                <tr key={idx} className="hover:bg-gray-50/80 transition-colors group">
                                    <td className="px-4 py-3 align-top">
                                        <div className="font-medium text-gray-900 flex items-center gap-2">
                                            {doc.file ? (
                                                <button
                                                    onClick={() => onClickFile(doc.file!)}
                                                    className="text-blue-600 hover:underline text-left"
                                                >
                                                    {doc.name}
                                                </button>
                                            ) : (
                                                <span>{doc.name}</span>
                                            )}
                                        </div>
                                        {/* Template Link */}
                                        <div className="mt-1">
                                            <button 
                                                onClick={() => onViewTemplate(doc.name)}
                                                className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
                                            >
                                                <FileText className="h-3 w-3" />
                                                View Template
                                            </button>
                                        </div>
                                    </td>
                                    
                                    <td className="px-4 py-3 align-top">
                                        <div className="flex gap-2">
                                            {/* Generate Button */}
                                            {doc.canGenerate && !doc.file && (
                                                <button
                                                    onClick={() => onGenerate(doc.name)}
                                                    disabled={isGenerating(doc.name)}
                                                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                                >
                                                    {isGenerating(doc.name) ? (
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                    ) : (
                                                        <Play className="h-3 w-3 fill-current" />
                                                    )}
                                                    Generate
                                                </button>
                                            )}

                                            {/* Add from Resume Button */}
                                            {(doc.addFromResume || (!doc.file && !doc.canGenerate)) && !doc.file && (
                                                <button
                                                    onClick={() => onSelectFromResume(doc.name)}
                                                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded hover:bg-gray-200 transition-colors"
                                                >
                                                    <ExternalLink className="h-3 w-3" />
                                                    Add from Resume
                                                </button>
                                            )}
                                            
                                            {/* Re-Generate (if file exists) */}
                                            {doc.file && doc.canGenerate && (
                                                 <button
                                                    onClick={() => onGenerate(doc.name)}
                                                    className="opacity-0 group-hover:opacity-100 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-all"
                                                 >
                                                    Regenerate
                                                 </button>
                                            )}
                                        </div>
                                    </td>

                                    <td className="px-4 py-3 align-top">
                                        <div className="flex items-center">
                                            {doc.status === "uploaded" && (
                                                <span className="flex items-center text-xs text-green-700 font-medium bg-green-50 px-2 py-1 rounded-full border border-green-200">
                                                    <CheckCircle className="h-3 w-3 mr-1.5" /> Uploaded
                                                </span>
                                            )}
                                            {doc.status === "pending" && (
                                                <span className="flex items-center text-xs text-amber-700 font-medium bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                                                    <Circle className="h-3 w-3 mr-1.5" /> Pending
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
            { name: "Loan Application Form", status: "pending", importance: "High", rationale: "The \"Ask\": Captures loan amount, usage (Acq/Refi), and entity structure." },
            { name: "Personal Financial Statement (PFS)", status: "pending", importance: "High", rationale: "Guarantor Strength: Verifies Net Worth (> Loan Amt) and Liquidity." },
            { name: "Schedule of Real Estate Owned (SREO)", status: "pending", importance: "High", rationale: "Global Cash Flow: Analyzes sponsor’s portfolio leverage.", canGenerate: true },
            { name: "Tax Returns (2-3 Years)", status: "pending", importance: "High", rationale: "Income Verification: Cross-references PFS.", addFromResume: true },
            { name: "Purchase & Sale Agreement (PSA)", status: "pending", importance: "High", rationale: "Cost Basis: Establishes the \"Cost\" in LTC.", addFromResume: true },
            { name: "Entity Formation Docs", status: "pending", importance: "High", rationale: "KYC & Authority: Confirms entity exists and signer authority.", addFromResume: true },
            { name: "T12 Financial Statement", status: "pending", importance: "High", rationale: "Valuation Baseline: The \"Truth\" of historical performance.", canGenerate: true },
            { name: "Current Rent Roll", status: "pending", importance: "High", rationale: "Revenue Validation: Validates T-12 revenue and occupancy.", canGenerate: true },
            { name: "Sources & Uses Model", status: "pending", importance: "High", rationale: "Deal Math: Proof that the deal works (Loan + Equity = Cost + Fees).", canGenerate: true },
            { name: "Sources & Uses Report", status: "pending", importance: "High", rationale: "PDF Summary of Sources & Uses." },
            { name: "T12 Summary Report", status: "pending", importance: "High", rationale: "PDF Summary of T12 Financials." },
            { name: "Credit Authorization & Gov ID", status: "pending", importance: "High", rationale: "Background Check: Mandatory for credit pulls and KYC.", addFromResume: true },
            { name: "Bank Statements", status: "pending", importance: "High", rationale: "Liquidity Proof: Proves cash on PFS exists and is liquid.", addFromResume: true },
            { name: "Church Financials", status: "pending", importance: "High", rationale: "Donation Stability: Tracks tithes, offerings, and attendance trends.", addFromResume: true },
            { name: "ProForma Cash flow", status: "pending", importance: "High", rationale: "Forecasts future performance.", addFromResume: true },
            { name: "CapEx Report", status: "pending", importance: "High", rationale: "Details capital expenditure plans.", addFromResume: true },
            { name: "Sponsor Resume / Bio", status: "pending", importance: "Medium", rationale: "Execution Capability: Proves borrower track record.", addFromResume: true },
            { name: "Offering Memorandum (OM)", status: "pending", importance: "Medium", rationale: "Context: Narrative, photos, and broker pro-forma.", addFromResume: true },
            { name: "Business Plan", status: "pending", importance: "Medium", rationale: "Strategy: Critical for value-add/construction.", addFromResume: true },
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

    // Fetch available templates on mount
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
    
    // Individual Generation Logic
    const handleGenerateDoc = async (docName: string) => {
        if (!projectId) return;
        setGeneratingDocs(prev => new Set(prev).add(docName));
        
        try {
            // Updated endpoint to generate specific document
            await apiClient.post(`/api/v1/underwriting/generate-single`, {
                project_id: projectId,
                document_name: docName
            });

            // Quick poll
            const intervalId = setInterval(() => {
                void refresh();
            }, 2000);
            setTimeout(() => {
                clearInterval(intervalId);
                setGeneratingDocs(prev => {
                    const next = new Set(prev);
                    next.delete(docName);
                    return next;
                });
            }, 8000);

        } catch (error) {
            console.error("Generate failed:", error);
            setGeneratingDocs(prev => {
                const next = new Set(prev);
                next.delete(docName);
                return next;
            });
        }
    };
    
    // View Template logic - Opens preview modal
    const handleViewTemplate = async (docName: string) => {
        const resourceId = templatesMap[docName];
        if (resourceId) {
            setSelectedTemplateId(resourceId);
        } else {
            console.warn(`Template not found for: ${docName}`);
            alert("Template not available for preview yet.");
        }
    };

    // Merge fetched files into stages
    const stages = useMemo(() => {
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

        return initialStages.map(stage => ({
            ...stage,
            docs: stage.docs.map(doc => {
                const foundFile = fileMap.get(doc.name);
                if (foundFile) {
                    return {
                        ...doc,
                        status: "uploaded" as const,
                        file: foundFile
                    };
                }
                return doc;
            })
        }));
    }, [files]);

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
        </div>
    );
};
