// src/components/om/DashboardShell.tsx
import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Download, Home } from 'lucide-react';
import { cn } from '@/utils/cn';

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
    
    // Build breadcrumbs from pathname
    const pathParts = pathname.split('/').filter(Boolean);
    const breadcrumbs = pathParts.slice(3).map((part, index) => {
        const path = '/' + pathParts.slice(0, 4 + index).join('/');
        const label = part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ');
        return { label, path };
    }).filter(crumb => crumb.label !== 'Dashboard'); // Filter out "Dashboard" breadcrumb
    
    const isHome = pathname.endsWith('/dashboard');
    
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            {!isHome && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.history.back()}
                                    className="mr-2"
                                >
                                    <ArrowLeft className="h-4 w-4" />
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
            
            {/* Main Content with integrated scenario toggle */}
            <div className="p-6">
                {isHome && (
                    <div className="max-w-7xl mx-auto mb-6">
                        {/* Prominent Scenario Toggle */}
                        <div className="flex justify-center">
                            <div className="inline-flex items-center bg-white rounded-lg shadow-sm border border-gray-200 p-1">
                                <button
                                    onClick={() => onScenarioChange('downside')}
                                    className={cn(
                                        "px-6 py-2 rounded-md text-sm font-medium transition-all duration-200",
                                        currentScenario === 'downside'
                                            ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md"
                                            : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                                    )}
                                >
                                    Downside
                                </button>
                                <button
                                    onClick={() => onScenarioChange('base')}
                                    className={cn(
                                        "px-6 py-2 rounded-md text-sm font-medium transition-all duration-200",
                                        currentScenario === 'base'
                                            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md"
                                            : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                                    )}
                                >
                                    Base Case
                                </button>
                                <button
                                    onClick={() => onScenarioChange('upside')}
                                    className={cn(
                                        "px-6 py-2 rounded-md text-sm font-medium transition-all duration-200",
                                        currentScenario === 'upside'
                                            ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md"
                                            : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                                    )}
                                >
                                    Upside
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {children}
            </div>
        </div>
    );
};