// src/components/project/ProjectResumeView.tsx

import React from 'react';
import { useRouter } from 'next/navigation';
import { ProjectProfile } from '@/types/enhanced-types';
import { Button } from '../ui/Button';
import { Edit, MapPin, DollarSign, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { KeyValueDisplay } from '../om/KeyValueDisplay'; // Reusing this component

interface ProjectResumeViewProps {
  project: ProjectProfile;
  onEdit: () => void;
  onJumpToField?: (fieldId: string) => void;
}

const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
};

const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A'; try { return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); } catch { return 'Invalid Date'; }
};

export const ProjectResumeView: React.FC<ProjectResumeViewProps> = ({ project, onEdit, onJumpToField }) => {
    const completeness = project.completenessPercent || 0;
    const progressColor = completeness === 100 ? 'bg-green-600' : 'bg-blue-600';
    const router = useRouter();

    // Collapsible state (persisted per project)
    const [collapsed, setCollapsed] = React.useState<boolean>(() => {
        try {
            return JSON.parse(
                typeof window !== 'undefined'
                    ? localStorage.getItem(`resumeCollapsed:${project.id}`) || 'true'
                    : 'true'
            );
        } catch {
            return true;
        }
    });

    React.useEffect(() => {
        try {
            localStorage.setItem(`resumeCollapsed:${project.id}`, JSON.stringify(collapsed));
        } catch {}
    }, [collapsed, project?.id]);

    // Helpers for missing fields list (prioritized)
    const missingFieldPriority: Array<{ key: keyof ProjectProfile; label: string }> = [
        { key: 'propertyAddressStreet', label: 'Address' },
        { key: 'assetType', label: 'Asset Type' },
        { key: 'loanAmountRequested', label: 'Requested Amount' },
        { key: 'totalProjectCost', label: 'Total Project Cost' },
        { key: 'targetCloseDate', label: 'Target Close Date' },
        { key: 'marketOverviewSummary', label: 'Market Overview' },
        { key: 'businessPlanSummary', label: 'Business Plan' },
    ];

    const getMissingFields = (p: ProjectProfile, max = 4) => {
        const isMissing = (v: unknown) =>
            v === null ||
            v === undefined ||
            (typeof v === 'string' && v.trim() === '') ||
            (typeof v === 'number' && Number.isNaN(v));
        const result: Array<{ key: keyof ProjectProfile; label: string }> = [];
        for (const item of missingFieldPriority) {
            if (isMissing((p as any)[item.key])) result.push(item);
            if (result.length >= max) break;
        }
        return result;
    };

    // Collapsed: no custom sizing; simple overflow control
    const containerCollapsedClasses = 'overflow-hidden';
    const containerExpandedClasses = 'overflow-visible';

    return (
        <div className={[
            'h-full flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 relative group transition-all duration-300 hover:shadow-md hover:shadow-blue-100/30',
            collapsed ? containerCollapsedClasses : containerExpandedClasses
        ].join(' ')} aria-expanded={!collapsed}>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-purple-50/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="sticky top-0 border-b border-gray-100 bg-gray-50/50 flex flex-row items-center justify-between relative z-10 px-3 py-4">
                <div>
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2 animate-pulse"></span>
                        Project Resume
                    </h2>
                    <p className="text-sm text-gray-500">{project.projectName}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCollapsed((v) => !v)}
                        aria-label={collapsed ? 'Expand resume' : 'Collapse resume'}
                        className="justify-center p-2"
                    >
                        {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="sm" onClick={onEdit} className="w-28 justify-center text-sm px-3 py-1.5">
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                    </Button>
                </div>
            </div>

            <div className="flex-1 p-6 relative z-10">
                {collapsed ? (
                    completeness === 100 ? (
                        <div className="flex items-center justify-between">
                            <div className="min-w-0">
                                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-medium">
                                    <svg width="14" height="14" viewBox="0 0 24 24" className="text-emerald-600"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" fill="none" /></svg>
                                    Deal Ready
                                </div>
                                <div className="mt-2 text-sm text-gray-700">Profile complete. Unlock OM and lender workflows.</div>
                                <button
                                    type="button"
                                    onClick={onEdit}
                                    className="mt-1 text-xs text-blue-600 hover:text-blue-700 underline"
                                    aria-label="Edit project resume"
                                    title="Edit project resume"
                                >
                                    Edit details
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => router.push(`/project/om/${project.id}`)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-xs font-medium transition-colors"
                                    aria-label="View OM"
                                    title="View OM"
                                >
                                    View OM
                                </button>
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 text-xs font-medium transition-colors"
                                    aria-label="Share link"
                                    title="Share link"
                                >
                                    Share
                                </button>
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 text-xs font-medium transition-colors"
                                    aria-label="Start lender matching"
                                    title="Start lender matching"
                                >
                                    Match
                                </button>
                            </div>
                            {/* extra breathing room below collapsed content */}
                            <div className="h-20 sm:h-28"></div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between">
                            <div className="min-w-0">
                                <div className="text-sm font-medium text-gray-800">Next fields to complete</div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {getMissingFields(project).length > 0 ? (
                                        getMissingFields(project).map((f) => (
                                            <button
                                                key={String(f.key)}
                                                type="button"
                                                onClick={() => onJumpToField?.(String(f.key))}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-800 text-xs hover:bg-amber-100 transition-colors"
                                                title={`Go to ${f.label}`}
                                            >
                                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                                                {f.label}
                                            </button>
                                        ))
                                    ) : (
                                        <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">All key fields complete</span>
                                    )}
                                    {getMissingFields(project, 5).length > 4 && (
                                        <span className="text-xs text-gray-600">+ more</span>
                                    )}
                                </div>
                            </div>
                            {/* extra breathing room below collapsed content */}
                            <div className="h-20 sm:h-28"></div>
                        </div>
                    )
                ) : (
                <div className="space-y-6">
                    {/* Basic Info */}
                    <div>
                        <h3 className="text-md font-semibold text-gray-700 mb-3 flex items-center"><MapPin className="h-4 w-4 mr-2 text-blue-600" /> Location & Type</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                            <KeyValueDisplay label="Address" value={`${project.propertyAddressStreet || ''}, ${project.propertyAddressCity || ''}, ${project.propertyAddressState || ''} ${project.propertyAddressZip || ''}`} />
                            <KeyValueDisplay label="County" value={project.propertyAddressCounty} />
                            <KeyValueDisplay label="Asset Type" value={project.assetType} />
                            <KeyValueDisplay label="Project Phase" value={project.projectPhase} />
                            <KeyValueDisplay label="Project Description" value={project.projectDescription} fullWidth />
                        </div>
                    </div>

                    {/* Loan Info */}
                    <div>
                        <h3 className="text-md font-semibold text-gray-700 mb-3 flex items-center"><DollarSign className="h-4 w-4 mr-2 text-blue-600" /> Financing Request</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                            <KeyValueDisplay label="Requested Amount" value={formatCurrency(project.loanAmountRequested)} />
                            <KeyValueDisplay label="Capital Type" value={project.loanType} />
                            <KeyValueDisplay label="Target LTV" value={project.targetLtvPercent ? `${project.targetLtvPercent}%` : 'N/A'} />
                            <KeyValueDisplay label="Target LTC" value={project.targetLtcPercent ? `${project.targetLtcPercent}%` : 'N/A'} />
                            <KeyValueDisplay label="Amortization" value={project.amortizationYears ? `${project.amortizationYears} Years` : 'N/A'} />
                            <KeyValueDisplay label="Interest-Only" value={project.interestOnlyPeriodMonths ? `${project.interestOnlyPeriodMonths} Months` : 'N/A'} />
                            <KeyValueDisplay label="Rate Type" value={project.interestRateType} />
                            <KeyValueDisplay label="Recourse" value={project.recoursePreference} />
                            <KeyValueDisplay label="Target Close Date" value={formatDate(project.targetCloseDate)} />
                            <KeyValueDisplay label="Use of Proceeds" value={project.useOfProceeds} fullWidth />
                        </div>
                    </div>

                    {/* Financials */}
                    <div>
                        <h3 className="text-md font-semibold text-gray-700 mb-3 flex items-center"><BarChart3 className="h-4 w-4 mr-2 text-blue-600" /> Financials & Strategy</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                            <KeyValueDisplay label="Purchase Price" value={formatCurrency(project.purchasePrice)} />
                            <KeyValueDisplay label="Total Project Cost" value={formatCurrency(project.totalProjectCost)} />
                            <KeyValueDisplay label="CapEx Budget" value={formatCurrency(project.capexBudget)} />
                            <KeyValueDisplay label="Equity Committed" value={project.equityCommittedPercent ? `${project.equityCommittedPercent}%` : 'N/A'} />
                            <KeyValueDisplay label="Current NOI (T12)" value={formatCurrency(project.propertyNoiT12)} />
                            <KeyValueDisplay label="Projected Stabilized NOI" value={formatCurrency(project.stabilizedNoiProjected)} />
                            <KeyValueDisplay label="Exit Strategy" value={project.exitStrategy} />
                            <KeyValueDisplay label="Business Plan" value={project.businessPlanSummary} fullWidth />
                            <KeyValueDisplay label="Market Overview" value={project.marketOverviewSummary} fullWidth />
                        </div>
                    </div>
                </div>
                )}
            </div>
        </div>
    );
};
