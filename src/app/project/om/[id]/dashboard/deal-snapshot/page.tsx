// src/app/project/om/[id]/dashboard/deal-snapshot/page.tsx
'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useProjects } from '@/hooks/useProjects';
import { QuadrantGrid } from '@/components/om/QuadrantGrid';
import { MetricCard } from '@/components/om/widgets/MetricCard';
import { useOMDashboard } from '@/contexts/OMDashboardContext';
import { Layers, FileText, Calendar, AlertTriangle, Percent, Clock, Shield, DollarSign } from 'lucide-react';
import { useOMPageHeader } from '@/hooks/useOMPageHeader';
import { useOmContent } from '@/hooks/useOmContent';

export default function DealSnapshotPage() {
    const params = useParams();
    const projectId = params?.id as string;
    const { getProject } = useProjects();
    const project = projectId ? getProject(projectId) : null;
    const { scenario } = useOMDashboard();
    const { content } = useOmContent();
    
    // Access flat fields directly
    const loanAmount = content?.loanAmountRequested ?? 0;
    const totalDevCost = content?.totalDevelopmentCost ?? 0;
    const ltc = content?.ltc ?? null;
    const ltv = content?.ltv ?? null;
    const interestRate = content?.interestRate ?? null;
    const allInRate = content?.allInRate ?? null;
    const requestedTerm = content?.requestedTerm ?? null;
    const recoursePreference = content?.recoursePreference ?? null;
    const dscrStressMin = content?.dscrStressMin ?? null;
    const ltvStressMax = content?.ltvStressMax ?? null;
    const guarantorLiquidity = content?.guarantorLiquidity ?? null;
    const interestReserve = content?.interestReserve ?? null;
    const realEstateTaxes = content?.realEstateTaxes ?? null;
    const insurance = content?.insurance ?? null;
    const opDeficitEscrow = content?.opDeficitEscrow ?? null;
    
    // Calculate percentages from flat fields
    const debtPercent = ltc ?? (totalDevCost > 0 ? (loanAmount / totalDevCost) * 100 : null);
    const equityPercent = debtPercent != null ? 100 - debtPercent : null;
    const formatPercent = (value: number | null | undefined) => {
      if (value == null) return null;
      const numValue = typeof value === 'number' ? value : parseFloat(String(value));
      return !Number.isNaN(numValue) ? `${numValue.toFixed(2)}%` : null;
    };
    
    // Build key terms from flat fields
    const keyTerms = {
      rate: allInRate != null ? `${allInRate}% all-in` : interestRate != null ? `${interestRate}%` : null,
      term: requestedTerm ?? null,
      recourse: recoursePreference ?? null,
      origination: content?.originationFee ?? null,
      covenants: {
        minDSCR: dscrStressMin != null ? `${dscrStressMin.toFixed(2)}x` : null,
        maxLTV: ltvStressMax != null ? `${ltvStressMax}%` : null,
        minLiquidity: guarantorLiquidity != null ? `$${Number(guarantorLiquidity).toLocaleString()}` : null,
      },
    };
    
    // Build milestones from flat date fields with status from resume (calculated by backend)
    const milestones = [
      { phase: "Land Acquisition", date: content?.landAcqClose ?? null, status: content?.landAcqStatus ?? null },
      { phase: "Entitlements", date: content?.entitlements ?? null, status: content?.entitlementsStatus ?? null },
      { phase: "Groundbreaking", date: content?.groundbreakingDate ?? null, status: content?.groundbreakingStatus ?? null },
      { phase: "Completion", date: content?.completionDate ?? null, status: content?.completionStatus ?? null },
      { phase: "Stabilization", date: content?.stabilization ?? null, status: content?.stabilizationStatus ?? null },
    ].filter(item => item.date);
    
    // Build scenario data from flat fields
    const scenarioData = {
      base: {
        loanAmount,
        ltv: ltv ?? null,
        ltc: ltc ?? null,
        constructionCost: totalDevCost,
      },
      upside: {
        loanAmount,
        ltv: ltv ?? null,
        ltc: ltc ?? null,
        constructionCost: totalDevCost,
      },
      downside: {
        loanAmount,
        ltv: ltv ?? null,
        ltc: ltc ?? null,
        constructionCost: totalDevCost,
      },
    };
    
    const data = scenarioData[scenario] ?? scenarioData.base;
    
    useOMPageHeader({
        subtitle: project
            ? "Overview of capital stack, key terms, milestones, and risk mitigants."
            : undefined,
    });
    
    if (!project) return <div>Project not found</div>;
    
    const quadrants = [
        {
            id: 'capital-stack',
            title: 'Capital Stack',
            icon: Layers,
            color: 'from-blue-400 to-blue-500',
            href: `/project/om/${projectId}/dashboard/deal-snapshot/capital-stack`,
            metrics: (
                <div className="space-y-3">
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Senior Debt</span>
                            <span className="font-medium">{formatPercent(debtPercent)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div className="bg-blue-500 h-full" style={{ width: `${debtPercent ?? 0}%` }} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Equity</span>
                            <span className="font-medium">{formatPercent(equityPercent)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div className="bg-green-500 h-full" style={{ width: `${equityPercent ?? 0}%` }} />
                        </div>
                    </div>
                    <MetricCard
                        label="Total Capitalization"
                        value={data.constructionCost ?? null}
                        format="currency"
                        size="sm"
                    />
                </div>
            )
        },
        {
            id: 'key-terms',
            title: 'Key Terms',
            icon: FileText,
            color: 'from-blue-400 to-blue-500',
            href: `/project/om/${projectId}/dashboard/deal-snapshot/key-terms`,
            metrics: (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="text-sm p-2 bg-white rounded-lg border-2 border-green-200 hover:border-green-400 transition-colors">
                            <div className="flex items-center space-x-1 mb-1">
                                <Percent className="h-3 w-3 text-green-600" />
                                <p className="text-xs font-medium text-green-600">Rate</p>
                            </div>
                            <p className="font-bold text-gray-900 text-xs leading-tight">{keyTerms.rate ?? null}</p>
                        </div>
                        <div className="text-sm p-2 bg-white rounded-lg border-2 border-red-200 hover:border-red-400 transition-colors">
                            <div className="flex items-center space-x-1 mb-1">
                                <Clock className="h-3 w-3 text-red-600" />
                                <p className="text-xs font-medium text-red-600">Term</p>
                            </div>
                            <p className="font-bold text-gray-900 text-xs">{keyTerms.term ?? null}</p>
                        </div>
                        <div className="text-sm p-2 bg-white rounded-lg border-2 border-red-200 hover:border-red-400 transition-colors">
                            <div className="flex items-center space-x-1 mb-1">
                                <Shield className="h-3 w-3 text-red-600" />
                                <p className="text-xs font-medium text-red-600">Recourse</p>
                            </div>
                            <p className="font-bold text-gray-900 text-xs leading-tight">{keyTerms.recourse ?? null}</p>
                        </div>
                        <div className="text-sm p-2 bg-white rounded-lg border-2 border-red-200 hover:border-red-400 transition-colors">
                            <div className="flex items-center space-x-1 mb-1">
                                <DollarSign className="h-3 w-3 text-red-600" />
                                <p className="text-xs font-medium text-red-600">Origination</p>
                            </div>
                            <p className="font-bold text-gray-900 text-xs">{keyTerms.origination ?? null}</p>
                        </div>
                    </div>
                    <div className="pt-2 border-t-2 border-blue-200">
                        <div className="flex items-center space-x-1 mb-2">
                            <FileText className="h-3 w-3 text-blue-600" />
                            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Key Covenants</p>
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between p-1.5 bg-blue-50 rounded border border-blue-200">
                                <span className="text-xs font-medium text-blue-700">Min DSCR</span>
                                <span className="text-xs font-bold text-blue-900">
                                    {keyTerms.covenants.minDSCR ?? null}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-1.5 bg-blue-50 rounded border border-blue-200">
                                <span className="text-xs font-medium text-blue-700">Max LTV / LTC</span>
                                <span className="text-xs font-bold text-blue-900">
                                    {keyTerms.covenants.maxLTV ?? null}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-1.5 bg-blue-50 rounded border border-blue-200">
                                <span className="text-xs font-medium text-blue-700">Liquidity</span>
                                <span className="text-xs font-bold text-blue-900">
                                    {keyTerms.covenants.minLiquidity ?? null}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'milestones',
            title: 'Milestones',
            icon: Calendar,
            color: 'from-green-400 to-green-500',
            href: `/project/om/${projectId}/dashboard/deal-snapshot/milestones`,
            metrics: (
                <div className="space-y-3">
                    <div className="space-y-2">
                        {milestones.slice(0, 3).map((milestone, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <span className="text-sm">{milestone.phase ?? null}</span>
                                <div className="flex items-center space-x-2">
                                    <span className="text-xs text-gray-500">{milestone.date ?? null}</span>
                                    {milestone.status && (
                                      <div className={`w-2 h-2 rounded-full ${
                                          milestone.status === 'completed'
                                              ? 'bg-green-500'
                                              : milestone.status === 'current'
                                              ? 'bg-blue-500'
                                              : milestone.status === 'upcoming'
                                              ? 'bg-red-400'
                                              : 'bg-gray-400'
                                      }`} />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )
        },
        {
            id: 'risk-analysis',
            title: 'Risk Flags & Mitigants',
            icon: AlertTriangle,
            color: 'from-red-400 to-red-500',
            href: `/project/om/${projectId}/dashboard/deal-snapshot/risk-analysis`,
            metrics: (
                <div className="space-y-3">
                    <div className="space-y-2">
                        {(() => {
                          const riskHigh = Array.isArray(content?.riskHigh) ? content.riskHigh : [];
                          const riskMedium = Array.isArray(content?.riskMedium) ? content.riskMedium : [];
                          const riskCount = riskHigh.length + riskMedium.length;
                          const riskText = riskCount > 0 ? `${riskCount} risk flags identified` : 'No risk flags identified';
                          return (
                            <div className="p-2 bg-gray-50 rounded text-sm text-gray-500 text-center">
                              <span>{riskText}</span>
                            </div>
                          );
                        })()}
                    </div>
                </div>
            )
        }
    ];
    
    return (
        <div className="space-y-6">
            <QuadrantGrid quadrants={quadrants} />
        </div>
    );
}