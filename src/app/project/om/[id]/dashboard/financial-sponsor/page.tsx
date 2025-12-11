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
import { formatFixed } from '@/lib/om-utils';

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
    
    // Access flat fields directly
    const totalDevCost = content?.totalDevelopmentCost ?? 0;
    const loanAmount = content?.loanAmountRequested ?? 0;
    const sponsorEquity = content?.sponsorEquity ?? 0;
    const taxCreditEquity = content?.taxCreditEquity ?? 0;
    const gapFinancing = content?.gapFinancing ?? 0;
    const landAcquisition = content?.landAcquisition ?? content?.purchasePrice ?? 0;
    const baseConstruction = content?.baseConstruction ?? 0;
    const contingency = content?.contingency ?? 0;
    const developerFee = content?.developerFee ?? 0;
    const aeFees = content?.aeFees ?? 0;
    
    // Build sources & uses from flat fields
    const sources = [
      { type: "Senior Construction Loan", amount: loanAmount },
      { type: "Sponsor Equity", amount: sponsorEquity },
      { type: "Tax Credit Equity", amount: taxCreditEquity },
      { type: "Gap Financing", amount: gapFinancing },
    ].filter(s => s.amount > 0);
    
    const uses = [
      { type: "Land Acquisition", amount: landAcquisition },
      { type: "Base Construction", amount: baseConstruction },
      { type: "Contingency", amount: contingency },
      { type: "Developer Fee", amount: developerFee },
      { type: "A&E Fees", amount: aeFees },
    ].filter(u => u.amount > 0);
    
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
    
    // Build scenario IRRs from flat fields (placeholder - adjust based on actual scenario data)
    const baseIRR = irr ?? null;
    const upsideIRR = irr != null ? irr * 1.1 : null;
    const downsideIRR = irr != null ? irr * 0.9 : null;

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
                        {/* Hardcoded chart data */}
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
                            <p className="font-medium">{content?.breakEven ?? 78}%</p>
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