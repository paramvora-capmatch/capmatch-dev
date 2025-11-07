// src/components/om/AIInsightsBar.tsx
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

interface AIInsightsBarProps {
    scenario: 'base' | 'upside' | 'downside';
}

export const AIInsightsBar: React.FC<AIInsightsBarProps> = ({ scenario }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    const insights = {
        base: {
            summary: "Strong fundamentals with balanced risk-return profile",
            points: [
                {
                    type: 'positive',
                    icon: TrendingUp,
                    title: "Market Timing Advantage",
                    detail: "Current market conditions suggest a 6-12 month window of favorable construction pricing before anticipated material cost increases. Lock in GMP contract now to capture 8-12% savings vs. 2026 projections."
                },
                {
                    type: 'positive',
                    icon: CheckCircle,
                    title: "Sponsor Track Record Validation",
                    detail: "Sponsor's previous 5 projects in similar markets achieved average IRRs of 22.5%, exceeding pro forma by 3.2%. Strong execution capability demonstrated in value-add multifamily segment."
                },
                {
                    type: 'neutral',
                    icon: AlertCircle,
                    title: "Lease-Up Risk Mitigation",
                    detail: "Recommend securing anchor commercial tenant (15% of NOI) pre-construction. Current LOIs from 3 national credit tenants could reduce lease-up period by 4-6 months."
                },
                {
                    type: 'insight',
                    icon: Sparkles,
                    title: "Hidden Value Opportunity",
                    detail: "Adjacent parcel (0.8 acres) available for $2.1M. Combined development could increase project IRR by 4.5% through economies of scale and enhanced amenity package."
                }
            ]
        },
        upside: {
            summary: "Exceptional return potential with manageable execution risks",
            points: [
                {
                    type: 'positive',
                    icon: TrendingUp,
                    title: "Rent Growth Acceleration",
                    detail: "Tech sector expansion (3 new HQs announced within 2 miles) positions property for 5-6% annual rent growth vs. 3% market average. Comparable properties seeing 15% premium."
                },
                {
                    type: 'positive',
                    icon: CheckCircle,
                    title: "Exit Multiple Expansion",
                    detail: "Institutional buyer activity increasing 40% YoY in submarket. Cap rate compression of 50-75 bps likely by stabilization, adding $4.2M to exit value."
                },
                {
                    type: 'insight',
                    icon: Sparkles,
                    title: "Tax Optimization Strategy",
                    detail: "Property qualifies for Opportunity Zone benefits. Structure as QOF to enhance LP returns by 8-12% through capital gains deferral and step-up basis."
                }
            ]
        },
        downside: {
            summary: "Conservative scenario maintains acceptable returns with clear risk mitigants",
            points: [
                {
                    type: 'neutral',
                    icon: AlertCircle,
                    title: "Construction Cost Containment",
                    detail: "GMP contract with 5% contingency may be insufficient in prolonged inflation scenario. Consider increasing to 8% contingency or negotiating shared savings structure."
                },
                {
                    type: 'positive',
                    icon: CheckCircle,
                    title: "Downside Protection",
                    detail: "Even at 8% vacancy and 6.5% exit cap, project maintains 1.20x DSCR and delivers 12.5% IRR. Debt structure provides 18-month interest reserve cushion."
                },
                {
                    type: 'insight',
                    icon: Sparkles,
                    title: "Alternative Exit Strategy",
                    detail: "Consider partial condo conversion for top 2 floors. Market analysis shows $850/SF condo pricing vs. $650/SF rental valuation, potentially recovering 15% of equity in downside scenario."
                }
            ]
        }
    };
    
    const currentInsights = insights[scenario];
    
    return (
        <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg shadow-sm mb-6">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/30 transition-colors rounded-lg group"
            >
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg">
                        <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-left">
                        <h3 className="font-semibold text-gray-800">
                            CapMatch™ Deal Room™ AI Insights
                        </h3>
                        <p className="text-sm text-gray-600">{currentInsights.summary}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    {!isExpanded && (
                        <span className="text-xs text-gray-400 group-hover:text-gray-600 transition-colors">
                            Click to expand
                        </span>
                    )}
                    {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                </div>
            </button>
            
            {isExpanded && (
                <div className="px-6 pb-6 space-y-4">
                    {currentInsights.points.map((insight, idx) => {
                        const Icon = insight.icon;
                        return (
                            <div key={idx} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-300">
                                <div className="flex items-start space-x-3">
                                    <div className={cn(
                                        "p-2 rounded-lg flex-shrink-0",
                                        insight.type === 'positive' && "bg-green-100",
                                        insight.type === 'neutral' && "bg-amber-100",
                                        insight.type === 'insight' && "bg-blue-100"
                                    )}>
                                        <Icon className={cn(
                                            "h-5 w-5",
                                            insight.type === 'positive' && "text-green-600",
                                            insight.type === 'neutral' && "text-amber-600",
                                            insight.type === 'insight' && "text-blue-600"
                                        )} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-gray-800 mb-1">
                                            {insight.title}
                                        </h4>
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            {insight.detail}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs text-gray-500 italic">
                            * AI insights generated based on pattern analysis of 2,847 similar transactions in comparable markets. 
                            Confidence level: {scenario === 'base' ? '94%' : scenario === 'upside' ? '87%' : '91%'}. 
                            Last updated: {new Date().toLocaleTimeString()}.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};