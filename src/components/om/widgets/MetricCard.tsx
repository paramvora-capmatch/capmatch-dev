// src/components/om/widgets/MetricCard.tsx
import React from 'react';
import { cn } from '@/utils/cn';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { DataSourceTooltip } from '@/components/om/DataSourceTooltip';
import { formatFixed } from '@/lib/om-utils';

interface MetricCardProps {
    label: string;
    value: string | number | null;
    change?: number;
    format?: 'currency' | 'percent' | 'number';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    dataSourceFields?: string | string[];
}

export const MetricCard: React.FC<MetricCardProps> = ({
    label,
    value,
    change,
    format = 'number',
    size = 'md',
    className,
    dataSourceFields
}) => {
    const formattedValue = () => {
        if (value === null) {
            return null;
        }

        if (typeof value === 'number') {
            switch (format) {
                case 'currency':
                    return new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                    }).format(value);
                case 'percent':
                    return `${formatFixed(value, 2)}%`;
                default:
                    return value.toLocaleString();
            }
        }
        return value;
    };
    
    return (
        <div className={cn("rounded-lg border border-blue-100 bg-blue-50/60 p-4 relative", className)}>
            <div className="flex items-start justify-between mb-2">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
                {dataSourceFields && (
                    <div className="ml-2 flex-shrink-0">
                        <DataSourceTooltip
                            fields={dataSourceFields}
                            iconSize={17}
                            placement="top"
                        />
                    </div>
                )}
            </div>
            <div className="flex items-end justify-between">
                <p className={cn(
                    "font-semibold text-gray-900",
                    size === 'sm' && "text-lg",
                    size === 'md' && "text-2xl",
                    size === 'lg' && "text-3xl"
                )}>
                    {formattedValue()}
                </p>
                {change !== undefined && (
                    <div className={cn(
                        "flex items-center text-xs",
                        change >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                        {change >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                        {Math.abs(change)}%
                    </div>
                )}
            </div>
        </div>
    );
};