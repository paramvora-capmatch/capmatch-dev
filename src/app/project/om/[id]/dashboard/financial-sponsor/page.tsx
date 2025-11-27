// src/app/project/om/[id]/dashboard/financial-sponsor/page.tsx
'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useProjects } from '@/hooks/useProjects';
import { QuadrantGrid } from '@/components/om/QuadrantGrid';
import { MetricCard } from '@/components/om/widgets/MetricCard';
import { MiniChart } from '@/components/om/widgets/MiniChart';
import { useOMDashboard } from '@/contexts/OMDashboardContext';
import { DollarSign, BarChart3, Users, Activity } from 'lucide-react';
import ReturnsCharts from '@/components/om/ReturnsCharts';
import { useOMPageHeader } from '@/hooks/useOMPageHeader';
import { useOmContent } from '@/hooks/useOmContent';

export default function FinancialSponsorPage() {
    const params = useParams();
    const projectId = params?.id as string;
    const { getProject } = useProjects();
    const project = projectId ? getProject(projectId) : null;
    const { scenario } = useOMDashboard();

    useOMPageHeader({
        subtitle: project
            ? "Returns, capital structure, and sponsor track record at a glance."
            : undefined,
    });
    
    const { content } = useOmContent();
    const sponsorDeals = content?.sponsorDeals ?? [];
    const financialDetails = content?.financialDetails ?? null;
    const projectOverview = content?.projectOverview ?? null;
    const sources = financialDetails?.sourcesUses?.sources ?? [];
    const uses = financialDetails?.sourcesUses?.uses ?? [];
    const propertyStats = projectOverview?.propertyStats ?? null;
    const returnProjections = financialDetails?.returnProjections ?? null;
    const sponsorProfile = financialDetails?.sponsorProfile ?? null;
    const experienceYears =
      sponsorProfile?.yearFounded != null
        ? new Date().getFullYear() - sponsorProfile.yearFounded
        : null;
    const formatMillions = (value?: number | null) =>
      value != null ? `$${(value / 1_000_000).toFixed(1)}M` : null;
    const baseIRR = returnProjections?.base?.irr ?? null;
    const upsideIRR = returnProjections?.upside?.irr ?? null;
    const downsideIRR = returnProjections?.downside?.irr ?? null;

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
                            {sources.slice(0, 2).map((source) => (
                                <div key={source.type} className="flex justify-between text-sm">
                                    <span>{source.type}</span>
                                    <span className="font-medium">
                                      {formatMillions(source.amount)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-2 pt-2 border-t">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Uses</p>
                        <div className="space-y-1">
                            {uses.slice(0, 3).map((use) => (
                                <div key={use.type} className="flex justify-between text-sm">
                                    <span>{use.type}</span>
                                    <span className="font-medium">
                                      {formatMillions(use.amount)}
                                    </span>
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
                        <MetricCard label="Yield on Cost" value={propertyStats?.yieldOnCost ?? null} format="percent" size="sm" />
                        <MetricCard label="Stabilized Cap" value={propertyStats?.capRate ?? null} format="percent" size="sm" />
                        <MetricCard label="Debt Yield" value={propertyStats?.debtYield ?? null} format="percent" size="sm" />
                        <MetricCard label="Profit Margin" value={returnProjections?.base?.profitMargin ?? null} format="percent" size="sm" />
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
                            <p className="font-medium">
                              {experienceYears != null ? `${experienceYears}+ Years` : null}
                            </p>
                        </div>
                        <div className="text-sm">
                            <p className="text-gray-500">Total Developed</p>
                            <p className="font-medium">{sponsorProfile?.totalDeveloped ?? null}</p>
                        </div>
                    </div>
                    <div className="pt-2">
                        <p className="text-xs text-gray-500 mb-2">Recent Performance</p>
                        <div className="space-y-2">
                            {sponsorDeals.slice(0, 3).map((deal, idx) => (
                                <div key={deal.project ?? idx} className="flex justify-between items-center text-xs">
                                    <span className="truncate flex-1">{deal.project ?? null}</span>
                                    <span className="font-medium text-green-600 ml-2">
                                      {deal.irr != null ? `${deal.irr}%` : null}
                                    </span>
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
                            <p className="font-medium text-blue-600">
                              {baseIRR != null ? `${baseIRR}%` : null}
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-500">Upside IRR</p>
                            <p className="font-medium text-green-600">
                              {upsideIRR != null ? `${upsideIRR}%` : null}
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-500">Downside IRR</p>
                            <p className="font-medium text-red-600">
                              {downsideIRR != null ? `${downsideIRR}%` : null}
                            </p>
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
        <div className="space-y-6">
            <QuadrantGrid quadrants={quadrants} />
        </div>
    );
}