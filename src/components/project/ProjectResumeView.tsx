// src/components/project/ProjectResumeView.tsx

import React from 'react';
import { useRouter } from 'next/navigation';
import { ProjectProfile } from '@/types/enhanced-types';
import { Button } from '../ui/Button';
import { Edit, MapPin, DollarSign, BarChart3, AlertCircle, ChevronDown } from 'lucide-react';
import { KeyValueDisplay } from '../om/KeyValueDisplay'; // Reusing this component
import { cn } from '@/utils/cn';

interface ProjectResumeViewProps {
  project: ProjectProfile;
  onEdit: () => void;
}

const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
};

const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A'; try { return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); } catch { return 'Invalid Date'; }
};

export const ProjectResumeView: React.FC<ProjectResumeViewProps> = ({ project, onEdit }) => {
    const completeness =
      project.projectProgress ?? project.completenessPercent ?? 0;
    const progressColor = completeness >= 100 ? 'bg-green-600' : 'bg-blue-600';
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

    // Collapsed: no custom sizing; simple overflow control
    const containerCollapsedClasses = 'overflow-hidden';
    const containerExpandedClasses = 'overflow-visible';

    return (
        <div
            className={[
                'h-full flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group transition-all duration-300 hover:shadow-md hover:shadow-blue-100/30 cursor-pointer',
                collapsed ? containerCollapsedClasses : containerExpandedClasses
            ].join(' ')}
            aria-expanded={!collapsed}
            role="button"
            tabIndex={0}
            onClick={() => setCollapsed((v) => !v)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setCollapsed((v) => !v);
                }
            }}
        >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-purple-50/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            <div className="sticky top-[-8px] z-20 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm rounded-t-2xl flex flex-row items-center justify-between relative px-3 py-4">
                <div className="ml-3 flex items-center gap-3">
                    <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
                        <AlertCircle className="h-5 w-5 text-blue-600 mr-2 animate-pulse" />
                        Project Resume
                    </h2>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        className="flex items-center gap-0 group-hover:gap-2 px-2 group-hover:px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 transition-all duration-300 overflow-hidden text-base"
                    >
                        <Edit className="h-5 w-5 text-gray-600 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-700 whitespace-nowrap max-w-0 group-hover:max-w-[100px] opacity-0 group-hover:opacity-100 transition-all duration-300 overflow-hidden">Edit</span>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setCollapsed((v) => !v); }}
                        aria-label={collapsed ? 'Expand resume' : 'Collapse resume'}
                        className="flex items-center gap-0 group-hover:gap-2 px-2 group-hover:px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 transition-all duration-300 overflow-hidden text-base"
                    >
                        <ChevronDown className={cn("h-5 w-5 text-gray-600 flex-shrink-0 transition-transform duration-200", collapsed ? '' : 'rotate-180')} />
                        <span className="text-sm font-medium text-gray-700 whitespace-nowrap max-w-0 group-hover:max-w-[160px] opacity-0 group-hover:opacity-100 transition-all duration-300 overflow-hidden">
                          {collapsed ? 'Show Project Details' : 'Hide Project Details'}
                        </span>
                    </Button>
                </div>
                <div />
            </div>

            {!collapsed && (
            <div className="flex-1 p-6 relative z-10">
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
            </div>
            )}
        </div>
    );
};
