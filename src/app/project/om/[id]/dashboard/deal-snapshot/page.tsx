// src/app/project/om/[id]/dashboard/deal-snapshot/page.tsx
'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useProjects } from '@/hooks/useProjects';
import { QuadrantGrid } from '@/components/om/QuadrantGrid';
import { MetricCard } from '@/components/om/widgets/MetricCard';
import { useOMDashboard } from '@/contexts/OMDashboardContext';
import { scenarioData, dealSnapshotDetails } from '@/services/mockOMData';
import { Layers, FileText, Calendar, AlertTriangle, Percent, Clock, Shield, DollarSign } from 'lucide-react';

export default function DealSnapshotPage() {
    const params = useParams();
    const projectId = params?.id as string;
    const { getProject } = useProjects();
    const project = projectId ? getProject(projectId) : null;
    const { scenario } = useOMDashboard();
    const data = scenarioData[scenario];
    
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
                            <span className="font-medium">{data.ltc}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div className="bg-blue-500 h-full" style={{ width: `${data.ltc}%` }} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Equity</span>
                            <span className="font-medium">{100 - data.ltc}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div className="bg-green-500 h-full" style={{ width: `${100 - data.ltc}%` }} />
                        </div>
                    </div>
                    <MetricCard label="Total Capitalization" value={data.constructionCost} format="currency" size="sm" />
                </div>
            )
        },
        {
            id: 'key-terms',
            title: 'Key Terms',
            icon: FileText,
            color: 'from-purple-400 to-purple-500',
            href: `/project/om/${projectId}/dashboard/deal-snapshot/key-terms`,
            metrics: (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="text-sm p-2 bg-white rounded-lg border-2 border-green-200 hover:border-green-400 transition-colors">
                            <div className="flex items-center space-x-1 mb-1">
                                <Percent className="h-3 w-3 text-green-600" />
                                <p className="text-xs font-medium text-green-600">Rate</p>
                            </div>
                            <p className="font-bold text-gray-900 text-xs leading-tight">{dealSnapshotDetails.keyTerms.rate}</p>
                        </div>
                        <div className="text-sm p-2 bg-white rounded-lg border-2 border-amber-200 hover:border-amber-400 transition-colors">
                            <div className="flex items-center space-x-1 mb-1">
                                <Clock className="h-3 w-3 text-amber-600" />
                                <p className="text-xs font-medium text-amber-600">Term</p>
                            </div>
                            <p className="font-bold text-gray-900 text-xs">{dealSnapshotDetails.keyTerms.term}</p>
                        </div>
                        <div className="text-sm p-2 bg-white rounded-lg border-2 border-red-200 hover:border-red-400 transition-colors">
                            <div className="flex items-center space-x-1 mb-1">
                                <Shield className="h-3 w-3 text-red-600" />
                                <p className="text-xs font-medium text-red-600">Recourse</p>
                            </div>
                            <p className="font-bold text-gray-900 text-xs leading-tight">{dealSnapshotDetails.keyTerms.recourse}</p>
                        </div>
                        <div className="text-sm p-2 bg-white rounded-lg border-2 border-orange-200 hover:border-orange-400 transition-colors">
                            <div className="flex items-center space-x-1 mb-1">
                                <DollarSign className="h-3 w-3 text-orange-600" />
                                <p className="text-xs font-medium text-orange-600">Origination</p>
                            </div>
                            <p className="font-bold text-gray-900 text-xs">{dealSnapshotDetails.keyTerms.origination}</p>
                        </div>
                    </div>
                    <div className="pt-2 border-t-2 border-violet-200">
                        <div className="flex items-center space-x-1 mb-2">
                            <FileText className="h-3 w-3 text-violet-600" />
                            <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide">Key Covenants</p>
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between p-1.5 bg-violet-50 rounded border border-violet-200">
                                <span className="text-xs font-medium text-violet-700">Min DSCR</span>
                                <span className="text-xs font-bold text-violet-900">{dealSnapshotDetails.keyTerms.covenants.minDSCR}</span>
                            </div>
                            <div className="flex items-center justify-between p-1.5 bg-purple-50 rounded border border-purple-200">
                                <span className="text-xs font-medium text-purple-700">Max LTV / LTC</span>
                                <span className="text-xs font-bold text-purple-900">{dealSnapshotDetails.keyTerms.covenants.maxLTV}</span>
                            </div>
                            <div className="flex items-center justify-between p-1.5 bg-indigo-50 rounded border border-indigo-200">
                                <span className="text-xs font-medium text-indigo-700">Liquidity</span>
                                <span className="text-xs font-bold text-indigo-900">{dealSnapshotDetails.keyTerms.covenants.minLiquidity}</span>
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
                        {dealSnapshotDetails.milestones.slice(0, 3).map((milestone, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <span className="text-sm">{milestone.phase}</span>
                                <div className="flex items-center space-x-2">
                                    <span className="text-xs text-gray-500">{milestone.date}</span>
                                    <div className={`w-2 h-2 rounded-full ${
                                        milestone.status === 'completed'
                                            ? 'bg-green-500'
                                            : milestone.status === 'current'
                                            ? 'bg-blue-500'
                                            : 'bg-amber-400'
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
            color: 'from-amber-400 to-amber-500',
            href: `/project/om/${projectId}/dashboard/deal-snapshot/risk-analysis`,
            metrics: (
                <div className="space-y-3">
                    <div className="space-y-2">
                        {[
                            ...dealSnapshotDetails.riskMatrix.medium.map(item => ({ ...item, level: 'Medium' })),
                            ...dealSnapshotDetails.riskMatrix.low.map(item => ({ ...item, level: 'Low' }))
                        ].slice(0, 3).map((item, idx) => (
                            <div key={idx} className="p-2 bg-gray-50 rounded">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-medium">{item.risk}</p>
                                        <p className="text-xs text-gray-500">{item.mitigation}</p>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded ${
                                        item.level === 'Low' ? 'bg-green-100 text-green-700' :
                                        item.level === 'Medium' ? 'bg-amber-100 text-amber-700' :
                                        'bg-red-100 text-red-700'
                                    }`}>
                                        {item.level}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )
        }
    ];
    
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Deal Snapshot Details</h2>
            <QuadrantGrid quadrants={quadrants} />
        </div>
    );
}