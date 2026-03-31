// src/app/project/om/[id]/dashboard/financial-sponsor/page.tsx
'use client';

import React from 'react';
import { QuadrantGrid } from '@/components/om/QuadrantGrid';
import { MetricCard } from '@/components/om/widgets/MetricCard';
import dynamic from "next/dynamic";
import { DollarSign, BarChart3, Users, Activity } from 'lucide-react';
import { useOMPageHeader } from '@/hooks/useOMPageHeader';
import { useOmContent } from '@/hooks/useOmContent';
import { formatFixed } from '@/lib/om-utils';
import { useOMProject } from '@/hooks/useOMProject';
import { buildCapitalSources, buildCapitalUses } from '@/lib/om-display';

const MiniChart = dynamic(
    () => import("@/components/om/widgets/MiniChart").then((m) => ({ default: m.MiniChart })),
    { ssr: false }
);

const ReturnsCharts = dynamic(() => import('@/components/om/ReturnsCharts'), {
    ssr: false,
    loading: () => <div className="min-h-[200px] animate-pulse rounded-lg bg-muted/50" />,
});

export default function FinancialSponsorPage() {
    const { projectId, project, dealType } = useOMProject();

    useOMPageHeader({
        subtitle: project
            ? "Returns, capital structure, and sponsor track record at a glance."
            : undefined,
    });

    const { content } = useOmContent();

    // Access flat fields directly
    const sources = buildCapitalSources(content, dealType);
    const uses = buildCapitalUses(content, dealType);

    // Access flat return fields
    const yieldOnCost = content?.yieldOnCost ?? null;
    const capRate = content?.capRate ?? null;
    const debtYield = content?.debtYield ?? null;
    const irr = content?.irr ?? null;
    const equityMultiple = content?.equityMultiple ?? null;

    // Access flat sponsor fields
    const sponsorEntityName = content?.sponsorEntityName ?? null;
    const sponsorExperience = content?.sponsorExperience ?? null;
    const priorDevelopments = content?.priorDevelopments ?? null;

    const formatMillions = (value?: number | null) =>
        value != null ? `$${formatFixed(value / 1_000_000, 1) ?? "0.0"}M` : null;

    // Build scenario IRRs from flat fields
    const baseIRR = irr ?? null;
    const upsideIRR = content?.upsideIRR ?? null;
    const downsideIRR = content?.downsideIRR ?? null;

    if (!project) return <div>Project not found</div>;

    const quadrants = [
        {
            id: 'sources-uses',
            title: 'Sources & Uses',
            icon: DollarSign,
            color: 'from-blue-400 to-blue-500',
            href: `/project/om/${projectId}/dashboard/financial-sponsor/sources-uses`,
            metrics: (
                <div className="space-y-3">
                    <div className="space-y-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Sources</p>
                        <div className="space-y-1">
                            {sources.slice(0, 2).map((source: { type?: string | null; amount?: number | null }) => (
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
                            {uses.slice(0, 3).map((use: { type?: string | null; amount?: number | null }) => (
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
                        <MetricCard label="Yield on Cost" value={yieldOnCost ?? null} format="percent" size="sm" />
                        <MetricCard label="Stabilized Cap" value={capRate ?? null} format="percent" size="sm" />
                        <MetricCard label="Debt Yield" value={debtYield ?? null} format="percent" size="sm" />
                        <MetricCard label="Equity Multiple" value={equityMultiple ?? null} format="number" size="sm" />
                    </div>
                    <div className="pt-2">
                        <p className="text-xs text-gray-500 mb-2">5-Year Cash Flow</p>
                        {content?.fiveYearCashFlow && Array.isArray(content.fiveYearCashFlow) ? (
                            <MiniChart
                                type="line"
                                data={content.fiveYearCashFlow.map((value: number, index: number) => ({
                                    year: `Year ${index + 1}`,
                                    value: value / 1_000_000,
                                }))}
                                height={60}
                                labelKey="year"
                                tooltipLabel="Cash Flow"
                                valueFormatter={(value) => `$${formatFixed(value, 2)}M`}
                            />
                        ) : null}
                    </div>
                </div>
            )
        },
        {
            id: 'sponsor-team',
            title: 'Sponsor & Team',
            icon: Users,
            color: 'from-blue-400 to-blue-500',
            href: `/project/om/${projectId}/dashboard/financial-sponsor/sponsor-profile`,
            metrics: (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="text-sm">
                            <p className="text-gray-500">Experience</p>
                            <p className="font-medium">
                                {sponsorExperience ?? null}
                            </p>
                        </div>
                        <div className="text-sm">
                            <p className="text-gray-500">Total Developed</p>
                            <p className="font-medium">{priorDevelopments ?? null}</p>
                        </div>
                    </div>
                    <div className="pt-2">
                        <p className="text-xs text-gray-500 mb-2">Sponsor</p>
                        <div className="text-sm font-medium">
                            {sponsorEntityName ?? null}
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
                                {baseIRR != null ? `${formatFixed(baseIRR, 2)}%` : null}
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-500">Upside IRR</p>
                            <p className="font-medium text-blue-700">
                                {upsideIRR != null ? `${formatFixed(upsideIRR, 2)}%` : null}
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-500">Downside IRR</p>
                            <p className="font-medium text-slate-700">
                                {downsideIRR != null ? `${formatFixed(downsideIRR, 2)}%` : null}
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-500">Break-even</p>
                            <p className="font-medium">{content?.breakEven ?? null}</p>
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