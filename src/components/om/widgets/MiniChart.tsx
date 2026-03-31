// src/components/om/widgets/MiniChart.tsx
import React from 'react';
import {
    Bar,
    BarChart,
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
} from 'recharts';

interface MiniChartProps {
    type: 'line' | 'bar' | 'pie';
    data: Record<string, unknown>[];
    dataKey?: string;
    height?: number;
    colors?: string[];
    labelKey?: string;
    tooltipLabel?: string;
    valueFormatter?: (value: number, entry: Record<string, unknown>) => string;
}

export const MiniChart: React.FC<MiniChartProps> = ({
    type,
    data,
    dataKey = 'value',
    height = 60,
    colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
    labelKey,
    tooltipLabel,
    valueFormatter,
}) => {
    const formatTooltipValue = (
        rawValue: unknown,
        payload: { payload?: Record<string, unknown> } | undefined
    ) => {
        const numericValue =
            typeof rawValue === 'number' ? rawValue : Number(rawValue ?? 0);
        const formattedValue =
            Number.isFinite(numericValue) && valueFormatter
                ? valueFormatter(numericValue, payload?.payload ?? {})
                : Number.isFinite(numericValue)
                ? numericValue.toLocaleString()
                : String(rawValue ?? '');

        return [formattedValue, tooltipLabel ?? dataKey];
    };

    if (type === 'pie') {
        return (
            <ResponsiveContainer width="100%" height={height}>
                <PieChart>
                    <Tooltip formatter={(value, _name, payload) => formatTooltipValue(value, payload)} />
                    <Pie
                        data={data}
                        dataKey={dataKey}
                        cx="50%"
                        cy="50%"
                        outerRadius={height / 2 - 5}
                        fill="#8884d8"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
        );
    }
    
    if (type === 'bar') {
        return (
            <ResponsiveContainer width="100%" height={height}>
                <BarChart data={data}>
                    <Tooltip
                        cursor={false}
                        formatter={(value, _name, payload) => formatTooltipValue(value, payload)}
                        labelFormatter={(label) => (label != null ? String(label) : '')}
                    />
                    <Bar dataKey={dataKey} fill="#3B82F6" />
                </BarChart>
            </ResponsiveContainer>
        );
    }
    
    return (
        <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data}>
                <Tooltip
                    cursor={false}
                    formatter={(value, _name, payload) => formatTooltipValue(value, payload)}
                    labelFormatter={(label, payload) => {
                        if (labelKey && payload && payload.length > 0) {
                            const entry = payload[0]?.payload as Record<string, unknown> | undefined;
                            const labelValue = entry?.[labelKey];
                            return labelValue != null ? String(labelValue) : '';
                        }
                        return label != null ? String(label) : '';
                    }}
                />
                <Line
                    type="monotone"
                    dataKey={dataKey}
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={false}
                />
            </LineChart>
        </ResponsiveContainer>
    );
};