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
    const dealSnapshotDetails = content?.dealSnapshotDetails ?? null;
    const scenarioData = content?.scenarioData ?? null;
    const data = scenarioData?.[scenario] ?? null;
    const debtPercent = data?.ltc ?? null;
    const equityPercent = debtPercent != null ? 100 - debtPercent : null;
    const formatPercent = (value: number | null | undefined) =>
      value != null ? `${value}%` : null;
    
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
                        value={data?.constructionCost ?? null}
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
                            <p className="font-bold text-gray-900 text-xs leading-tight">{dealSnapshotDetails?.keyTerms?.rate ?? null}</p>
                        </div>
                        <div className="text-sm p-2 bg-white rounded-lg border-2 border-red-200 hover:border-red-400 transition-colors">
                            <div className="flex items-center space-x-1 mb-1">
                                <Clock className="h-3 w-3 text-red-600" />
                                <p className="text-xs font-medium text-red-600">Term</p>
                            </div>
                            <p className="font-bold text-gray-900 text-xs">{dealSnapshotDetails?.keyTerms?.term ?? null}</p>
                        </div>
                        <div className="text-sm p-2 bg-white rounded-lg border-2 border-red-200 hover:border-red-400 transition-colors">
                            <div className="flex items-center space-x-1 mb-1">
                                <Shield className="h-3 w-3 text-red-600" />
                                <p className="text-xs font-medium text-red-600">Recourse</p>
                            </div>
                            <p className="font-bold text-gray-900 text-xs leading-tight">{dealSnapshotDetails?.keyTerms?.recourse ?? null}</p>
                        </div>
                        <div className="text-sm p-2 bg-white rounded-lg border-2 border-red-200 hover:border-red-400 transition-colors">
                            <div className="flex items-center space-x-1 mb-1">
                                <DollarSign className="h-3 w-3 text-red-600" />
                                <p className="text-xs font-medium text-red-600">Origination</p>
                            </div>
                            <p className="font-bold text-gray-900 text-xs">{dealSnapshotDetails?.keyTerms?.origination ?? null}</p>
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
                                    {dealSnapshotDetails?.keyTerms?.covenants?.minDSCR ?? null}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-1.5 bg-blue-50 rounded border border-blue-200">
                                <span className="text-xs font-medium text-blue-700">Max LTV / LTC</span>
                                <span className="text-xs font-bold text-blue-900">
                                    {dealSnapshotDetails?.keyTerms?.covenants?.maxLTV ?? null}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-1.5 bg-blue-50 rounded border border-blue-200">
                                <span className="text-xs font-medium text-blue-700">Liquidity</span>
                                <span className="text-xs font-bold text-blue-900">
                                    {dealSnapshotDetails?.keyTerms?.covenants?.minLiquidity ?? null}
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
                        {dealSnapshotDetails?.milestones?.slice(0, 3).map((milestone, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <span className="text-sm">{milestone.phase ?? null}</span>
                                <div className="flex items-center space-x-2">
                                    <span className="text-xs text-gray-500">{milestone.date ?? null}</span>
                                    <div className={`w-2 h-2 rounded-full ${
                                        milestone.status === 'completed'
                                            ? 'bg-green-500'
                                            : milestone.status === 'current'
                                            ? 'bg-blue-500'
                                            : 'bg-red-400'
                                    }`} />
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
                            const medium = (dealSnapshotDetails?.riskMatrix?.medium ?? []).map((item) => ({
                                ...item,
                                level: 'Medium',
                            }));
                            const low = (dealSnapshotDetails?.riskMatrix?.low ?? []).map((item) => ({
                                ...item,
                                level: 'Low',
                            }));
                            return [...medium, ...low]
                                .slice(0, 3)
                                .map((item, idx) => (
                                    <div key={idx} className="p-2 bg-gray-50 rounded">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-sm font-medium">{item.risk ?? null}</p>
                                                <p className="text-xs text-gray-500">{item.mitigation ?? null}</p>
                                            </div>
                                            <span
                                                className={`text-xs px-2 py-1 rounded ${
                                                    item.level === 'Low'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-red-100 text-red-700'
                                                }`}
                                            >
                                                {item.level}
                                            </span>
                                        </div>
                                    </div>
                                ));
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