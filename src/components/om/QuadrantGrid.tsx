// src/components/om/QuadrantGrid.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { type ClassValue } from 'clsx';
import { cn } from '@/utils/cn';
import { LucideIcon, Expand } from 'lucide-react';

export interface QuadrantData {
    id: string;
    title: string;
    icon: LucideIcon;
    color: string;
    metrics?: React.ReactElement<{ children?: React.ReactNode }>;
    description?: string;
    href?: string;
}

interface QuadrantGridProps {
    quadrants: QuadrantData[];
    className?: string;
}

export const QuadrantGrid: React.FC<QuadrantGridProps> = ({ quadrants, className }) => {
    const router = useRouter();
    const [isAnimated, setIsAnimated] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsAnimated(true), 100);
        return () => clearTimeout(timer);
    }, []);
    
    return (
        <div className={cn("grid grid-cols-2 gap-6", className)}>
            {quadrants.map((quadrant) => {
                const Icon = quadrant.icon;
                
                return (
                    <div
                        key={quadrant.id}
                        onClick={() => quadrant.href && router.push(quadrant.href)}
                        className={cn(
                            "bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group",
                            quadrant.href && "cursor-pointer hover:scale-[1.02] transform",
                            quadrant.color.includes('blue') && "hover:ring-2 hover:ring-blue-400",
                            quadrant.color.includes('green') && "hover:ring-2 hover:ring-green-400",
                        )}
                    >
                        <div className={cn(
                            "h-2 bg-gradient-to-r",
                            quadrant.color
                        )} />
                        
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center">
                                    <div className={cn(
                                        "p-3 rounded-lg",
                                        quadrant.color.includes('blue') && "bg-blue-50",
                                        quadrant.color.includes('green') && "bg-green-50"
                                    )}>
                                        <Icon className={cn(
                                            "h-6 w-6",
                                            quadrant.color.includes('blue') && "text-blue-600",
                                            quadrant.color.includes('green') && "text-green-600"
                                        )} />
                                    </div>
                                    <h3 className="ml-3 text-lg font-semibold text-gray-800">
                                        {quadrant.title}
                                    </h3>
                                </div>
                                {quadrant.href && (
                                    <Expand className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-all duration-300 group-hover:scale-125" />
                                )}
                            </div>
                            
                            {quadrant.description && (
                                <p className="text-sm text-gray-600 mb-4">{quadrant.description}</p>
                            )}
                            
                            {quadrant.metrics && (
                                <div className="space-y-3">
                                    {React.Children.map(quadrant.metrics.props.children, (child, index) => {
                                        if (React.isValidElement(child)) {
                                    return React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
                                        className: cn((child.props as any).className,
                                                    "transition-all duration-500 transform-gpu",
                                                    `delay-[${index * 150}ms]`,
                                                    isAnimated
                                                        ? "opacity-100 translate-y-0"
                                                        : "opacity-0 translate-y-4"
                                                ),
                                            });
                                        }
                                        return child;
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};