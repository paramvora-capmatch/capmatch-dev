// src/components/om/widgets/MiniChart.tsx
import React from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface MiniChartProps {
    type: 'line' | 'bar' | 'pie';
    data: Record<string, unknown>[];
    dataKey?: string;
    height?: number;
    colors?: string[];
}

export const MiniChart: React.FC<MiniChartProps> = ({
    type,
    data,
    dataKey = 'value',
    height = 60,
    colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']
}) => {
    if (type === 'pie') {
        return (
            <ResponsiveContainer width="100%" height={height}>
                <PieChart>
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
                    <Bar dataKey={dataKey} fill="#3B82F6" />
                </BarChart>
            </ResponsiveContainer>
        );
    }
    
    return (
        <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data}>
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