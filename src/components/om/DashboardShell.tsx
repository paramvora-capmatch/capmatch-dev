// src/components/om/DashboardShell.tsx
import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Download, Home, ChevronLeft } from 'lucide-react';
import { cn } from '@/utils/cn';
import { OMChatCard } from './OMChatCard';


interface DashboardShellProps {
    children: React.ReactNode;
    projectId: string;
    projectName: string;
    currentScenario: 'base' | 'upside' | 'downside';
    onScenarioChange: (scenario: 'base' | 'upside' | 'downside') => void;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({
    children,
    projectId,
    projectName,
    currentScenario,
    onScenarioChange
}) => {
    const router = useRouter();
    const pathname = usePathname();
    const [isChatCollapsed, setIsChatCollapsed] = useState<boolean>(() => {
        try {
            return JSON.parse(
                typeof window !== "undefined"
                    ? localStorage.getItem(`omChatCollapsed:${projectId}`) || "false"
                    : "false"
            );
        } catch {
            return false;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(
                `omChatCollapsed:${projectId}`,
                JSON.stringify(isChatCollapsed)
            );
        } catch {}
    }, [isChatCollapsed, projectId]);
    
    // Build breadcrumbs from pathname
    const pathParts = pathname.split('/').filter(Boolean);
    const breadcrumbs = pathParts.slice(3).map((part, index) => {
        const path = '/' + pathParts.slice(0, 4 + index).join('/');
        const label = part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ');
        return { label, path };
    }).filter(crumb => crumb.label !== 'Dashboard'); // Filter out "Dashboard" breadcrumb
    
    const isHome = pathname.endsWith('/dashboard');
    
    return (
        <div className="relative min-h-screen w-full flex flex-row animate-fadeIn bg-gray-200">
            {/* Global page background (grid + blue tint) behind both columns */}
            <div className="pointer-events-none absolute inset-0 z-0">
                <div className="absolute inset-0 opacity-[0.5]">
                    <svg className="absolute inset-0 h-full w-full text-blue-500" aria-hidden="true">
                        <defs>
                            <pattern id="om-grid-pattern" width="24" height="24" patternUnits="userSpaceOnUse">
                                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="0.5" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#om-grid-pattern)" />
                    </svg>
                </div>
            </div>

            {/* Header - Fixed at top */}
            <div className="fixed top-0 left-0 right-0 bg-white shadow-sm border-b border-gray-200 z-50">
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            {!isHome && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.back()}
                                    className="mr-2"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                            )}
                            
                            {/* Breadcrumbs */}
                            <div className="flex items-center space-x-2 text-sm">
                                {/* Project Name - First Breadcrumb */}
                                <button
                                    onClick={() => router.push(`/project/workspace/${projectId}`)}
                                    className="text-gray-500 hover:text-gray-700 font-medium"
                                >
                                    {projectName}
                                </button>
                                
                                {/* Separator */}
                                <span className="text-gray-400">/</span>
                                
                                {/* OM Dashboard - Second Breadcrumb */}
                                <button
                                    onClick={() => router.push(`/project/om/${projectId}/dashboard`)}
                                    className="text-gray-500 hover:text-gray-700 flex items-center"
                                >
                                    <Home className="h-4 w-4 mr-1" />
                                    OM Dashboard
                                </button>
                                
                                {/* Additional Breadcrumbs */}
                                {breadcrumbs.map((crumb, idx) => (
                                    <React.Fragment key={idx}>
                                        <span className="text-gray-400">/</span>
                                        <button
                                            onClick={() => router.push(crumb.path)}
                                            className="text-gray-500 hover:text-gray-700"
                                        >
                                            {crumb.label}
                                        </button>
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                            {/* Export Button */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => alert('Export functionality coming soon')}
                            >
                                <Download className="h-4 w-4 mr-1" />
                                Export PDF
                            </Button>
                        </div>
                    </div>
                    
                    {/* Project Name */}
                    <div className="mt-2">
                        <h1 className="text-xl font-semibold text-gray-800">{projectName}</h1>
                    </div>
                </div>
            </div>

            {/* Left Column: Scrollable content */}
            <div className="flex-1 relative z-[1] min-w-0">
                {/* Content with padding */}
                <div className="relative p-6 min-w-0 pt-32">
                    {children}
                </div>
            </div>

            {/* Right Column: Sticky collapsible chat card */}
            <OMChatCard
                projectId={projectId}
                isCollapsed={isChatCollapsed}
                onCollapseChange={setIsChatCollapsed}
                topOffsetClassName="top-32"
                widthClassName="w-[30%]"
            />
        </div>
    );
};