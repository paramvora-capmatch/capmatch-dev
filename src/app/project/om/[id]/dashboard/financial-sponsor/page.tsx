// src/app/project/om/[id]/dashboard/financial-sponsor/page.tsx
'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useProjects } from '@/hooks/useProjects';
import { QuadrantGrid } from '@/components/om/QuadrantGrid';
import { MetricCard } from '@/components/om/widgets/MetricCard';
import { MiniChart } from '@/components/om/widgets/MiniChart';
import { useOMDashboard } from '@/contexts/OMDashboardContext';
import { sponsorDeals, financialDetails, projectOverview } from '@/services/mockOMData';
import { DollarSign, BarChart3, Users, Activity } from 'lucide-react';
import ReturnsCharts from '@/components/om/ReturnsCharts';

export default function FinancialSponsorPage() {
    const params = useParams();
    const projectId = params?.id as string;
    const { getProject } = useProjects();
    const project = projectId ? getProject(projectId) : null;
    const { scenario } = useOMDashboard();
    
    if (!project) return <div>Project not found</div>;
    
    const quadrants = [
        {
            id: 'sources-uses',
            title: 'Sources & Uses',
            icon: DollarSign,
            color: 'from-green-400 to-green-500',
            href: `/project/om/${projectId}/dashboard/financial-sponsor/sources-uses`,
            metrics: (
                <div className="space-y-3">
                    <div className="space-y-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Sources</p>
                        <div className="space-y-1">
                            {financialDetails.sourcesUses.sources.slice(0, 2).map((source) => (
                                <div key={source.type} className="flex justify-between text-sm">
                                    <span>{source.type}</span>
                                    <span className="font-medium">${(source.amount / 1_000_000).toFixed(1)}M</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-2 pt-2 border-t">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Uses</p>
                        <div className="space-y-1">
                            {financialDetails.sourcesUses.uses.slice(0, 3).map((use) => (
                                <div key={use.type} className="flex justify-between text-sm">
                                    <span>{use.type}</span>
                                    <span className="font-medium">${(use.amount / 1_000_000).toFixed(2)}M</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'underwriting-metrics',
            title: 'Underwriting Metrics',
            icon: BarChart3,
            color: 'from-blue-400 to-blue-500',
            metrics: (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <MetricCard label="Yield on Cost" value={projectOverview.propertyStats.yieldOnCost} format="percent" size="sm" />
                        <MetricCard label="Stabilized Cap" value={projectOverview.propertyStats.capRate} format="percent" size="sm" />
                        <MetricCard label="Debt Yield" value={projectOverview.propertyStats.debtYield} format="percent" size="sm" />
                        <MetricCard label="Profit Margin" value={financialDetails.returnProjections.base.profitMargin} format="percent" size="sm" />
                    </div>
                    <div className="pt-2">
                        <p className="text-xs text-gray-500 mb-2">5-Year Cash Flow</p>
                        <MiniChart
                            type="line"
                            data={[
                                { value: -2.5 }, { value: 0.8 }, { value: 1.2 },
                                { value: 1.4 }, { value: 15.5 }
                            ]}
                            height={60}
                        />
                    </div>
                </div>
            )
        },
        {
            id: 'sponsor-team',
            title: 'Sponsor & Team',
            icon: Users,
            color: 'from-green-400 to-green-500',
            href: `/project/om/${projectId}/dashboard/financial-sponsor/sponsor-profile`,
            metrics: (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="text-sm">
                            <p className="text-gray-500">Experience</p>
                            <p className="font-medium">{new Date().getFullYear() - financialDetails.sponsorProfile.yearFounded}+ Years</p>
                        </div>
                        <div className="text-sm">
                            <p className="text-gray-500">Total Developed</p>
                            <p className="font-medium">{financialDetails.sponsorProfile.totalDeveloped}</p>
                        </div>
                    </div>
                    <div className="pt-2">
                        <p className="text-xs text-gray-500 mb-2">Recent Performance</p>
                        <div className="space-y-2">
                            {sponsorDeals.slice(0, 3).map((deal) => (
                                <div key={deal.project} className="flex justify-between items-center text-xs">
                                    <span className="truncate flex-1">{deal.project}</span>
                                    <span className="font-medium text-green-600 ml-2">{deal.irr}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'sensitivity-stress',
            title: 'Sensitivity / Stress Tests',
            icon: Activity,
            color: 'from-blue-400 to-blue-500',
            href: `/project/om/${projectId}/dashboard/financial-sponsor/returns`,
            metrics: (
                <div className="space-y-3">
                    <div className="h-32 overflow-hidden">
                        <ReturnsCharts compact={true} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                            <p className="text-gray-500">Base IRR</p>
                            <p className="font-medium text-blue-600">{financialDetails.returnProjections.base.irr}%</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Upside IRR</p>
                            <p className="font-medium text-green-600">{financialDetails.returnProjections.upside.irr}%</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Downside IRR</p>
                            <p className="font-medium text-red-600">{financialDetails.returnProjections.downside.irr}%</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Break-even</p>
                            <p className="font-medium">78%</p>
                        </div>
                    </div>
                </div>
            )
        }
    ];
    
    return (
        <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Financial & Sponsor Details</h2>
            <QuadrantGrid quadrants={quadrants} />
        </div>
    );
}