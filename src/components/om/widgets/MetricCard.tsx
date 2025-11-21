// src/components/om/widgets/MetricCard.tsx
import React from 'react';
import { cn } from '@/utils/cn';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { DataSourceTooltip } from '@/components/om/DataSourceTooltip';

interface MetricCardProps {
    label: string;
    value: string | number;
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
                    return `${value}%`;
                default:
                    return value.toLocaleString();
            }
        }
        return value;
    };
    
    return (
        <div className={cn("bg-gray-50 rounded-lg p-3 relative", className)}>
            <div className="flex items-start justify-between mb-1">
                <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
                {dataSourceFields && (
                    <div className="ml-2 flex-shrink-0">
                        <DataSourceTooltip
                            fields={dataSourceFields}
                            iconSize={14}
                            placement="top"
                        />
                    </div>
                )}
            </div>
            <div className="flex items-end justify-between">
                <p className={cn(
                    "font-semibold",
                    size === 'sm' && "text-lg",
                    size === 'md' && "text-xl",
                    size === 'lg' && "text-2xl"
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