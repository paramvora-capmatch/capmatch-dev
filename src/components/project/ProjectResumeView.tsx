// src/components/project/ProjectResumeView.tsx

import React from 'react';
import { ProjectProfile } from '@/types/enhanced-types';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/Button';
import { Edit, MapPin, DollarSign, BarChart3 } from 'lucide-react';
import { KeyValueDisplay } from '../om/KeyValueDisplay'; // Reusing this component

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
    const completeness = project.completenessPercent || 0;
    const progressColor = completeness === 100 ? 'bg-green-600' : 'bg-blue-600';

    return (
        <Card className="h-full flex flex-col shadow-sm border border-gray-200 relative group transition-all duration-300 hover:shadow-md hover:shadow-blue-100/30">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-purple-50/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-lg" />
            
            <CardHeader className="sticky top-0 border-b bg-gray-50/50 flex flex-row items-center justify-between relative z-10">
                <div>
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2 animate-pulse"></span>
                        Project Resume
                    </h2>
                    <p className="text-sm text-gray-500">{project.projectName}</p>
                </div>
                <Button variant="outline" size="sm" onClick={onEdit}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                </Button>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-4 relative z-10">
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
            </CardContent>
        </Card>
    );
};
