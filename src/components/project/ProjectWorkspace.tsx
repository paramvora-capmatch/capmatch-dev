// src/components/project/ProjectWorkspace.tsx
'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useProjects } from '../../hooks/useProjects';
import { useBorrowerProfile } from '../../hooks/useBorrowerProfile';

import { ProfileSummaryCard } from './ProfileSummaryCard';
import { EnhancedProjectForm } from '../forms/EnhancedProjectForm';
import { Loader2, FileSpreadsheet } from 'lucide-react'; // Added FileSpreadsheet
import { ProjectProfile } from '@/types/enhanced-types';
import { Button } from '../ui/Button'; // Import Button
import { useAuth } from '@/hooks/useAuth'; // Add this import
import { AskAIProvider } from '../ui/AskAIProvider';
import { ConsolidatedSidebar } from './ConsolidatedSidebar';
import { generateAdvisorMessage } from '../../../lib/enhancedMockApiService';

interface ProjectWorkspaceProps {
    projectId: string;
}

export const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({ projectId }) => {
    const router = useRouter();
    const {
        activeProject, setActiveProject, isLoading: projectsLoading, getProject, updateProject, projects, addProjectMessage
    } = useProjects();
    const { borrowerProfile, isLoading: profileLoading } = useBorrowerProfile();
    const { user, isLoading: authLoading } = useAuth(); // Add auth loading state
  
    
    // State for Ask AI field drop
    const [droppedFieldId, setDroppedFieldId] = useState<string | null>(null);
    
    // State to track current form data for AskAI
    const [currentFormData, setCurrentFormData] = useState<ProjectProfile | null>(null);
    
    // Welcome message state management
    const [welcomeMessageGenerated, setWelcomeMessageGenerated] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem(`capmatch_welcomeGenerated_${projectId}`) === 'true';
        }
        return false;
    });
    const welcomeGenerationInProgress = useRef(false);

    // Helper function to persist welcome message flag in localStorage
    const setWelcomeGeneratedWithStorage = useCallback((value: boolean) => {
        setWelcomeMessageGenerated(value);
        if (typeof window !== 'undefined') {
            if (value) {
                localStorage.setItem(`capmatch_welcomeGenerated_${projectId}`, 'true');
            } else {
                localStorage.removeItem(`capmatch_welcomeGenerated_${projectId}`);
            }
        }
    }, [projectId]);

    // Calculate if we're still in initial loading phase
    const isInitialLoading = authLoading || projectsLoading || (user?.role === 'borrower' && profileLoading);

    // Generate welcome message if needed
    const generateWelcomeMessage = useCallback(async () => {
        if (
            !welcomeMessageGenerated && 
            activeProject && 
            activeProject.id === projectId && 
            activeProject.assignedAdvisorUserId && 
            !welcomeGenerationInProgress.current
        ) {
            try {
                // Set ref immediately to prevent race conditions
                welcomeGenerationInProgress.current = true;
                
                // Double-check localStorage to prevent race conditions
                const storageFlag = typeof window !== 'undefined' 
                    ? localStorage.getItem(`capmatch_welcomeGenerated_${projectId}`) === 'true'
                    : false;
                
                if (storageFlag) {
                    // Another instance already generated the message
                    setWelcomeGeneratedWithStorage(true);
                    welcomeGenerationInProgress.current = false;
                    return;
                }
                
                // Set flag to prevent duplicate generation
                setWelcomeGeneratedWithStorage(true);
                
                // Generate a welcome message
                const welcomeMessageText = await generateAdvisorMessage(
                    activeProject.assignedAdvisorUserId,
                    activeProject.id,
                    {
                        assetType: activeProject.assetType,
                        dealType: activeProject.loanType,
                        loanAmount: activeProject.loanAmountRequested,
                        stage: activeProject.projectPhase
                    }
                );

                // Add the welcome message to the project
                await addProjectMessage(welcomeMessageText, 'Advisor', activeProject.assignedAdvisorUserId);
                console.log("Generated welcome message for " + projectId);
                
                // Reset ref after successful completion
                welcomeGenerationInProgress.current = false;
            } catch (error) {
                console.error('Error generating welcome message:', error);
                // Reset flag on error so it can be retried
                setWelcomeGeneratedWithStorage(false);
                // Reset ref on error
                welcomeGenerationInProgress.current = false;
            }
        }
    }, [welcomeMessageGenerated, activeProject, projectId, addProjectMessage, setWelcomeGeneratedWithStorage]);

    // useEffect for loading and setting active project
    useEffect(() => {
        if (!projectId) return;
        
        // Don't proceed if still in initial loading phase
        if (isInitialLoading) {
            return;
        }
        
        // Only check for project existence after initial loading is complete
        if (!activeProject || activeProject.id !== projectId) {
            const projectData = getProject(projectId);
            if (projectData) {
                setActiveProject(projectData);
            } else {
                // Only show error if we're confident the project doesn't exist
                // (not just because we haven't loaded projects yet)
                console.error(`Project ${projectId} not found.`);
                console.error('Project not found.');
                router.push('/dashboard');
            }
        }
        

    }, [
        projectId,
        activeProject,
        setActiveProject,
        getProject,
        isInitialLoading,
        router
    ]);

    // Effect to generate welcome message when project is loaded
    useEffect(() => {
        if (activeProject && activeProject.id === projectId && !isInitialLoading) {
            generateWelcomeMessage();
        }
    }, [activeProject, projectId, isInitialLoading, generateWelcomeMessage]);

    // Reset welcome message flag when switching projects
    useEffect(() => {
        const currentFlag = typeof window !== 'undefined' 
            ? localStorage.getItem(`capmatch_welcomeGenerated_${projectId}`) === 'true'
            : false;
        setWelcomeMessageGenerated(currentFlag);
    }, [projectId]);

    // Cleanup effect to reset ref when component unmounts or project changes
    useEffect(() => {
        return () => {
            welcomeGenerationInProgress.current = false;
        };
    }, [projectId]);

    // Loading state render - show loading during initial loading or if project doesn't match
    if (isInitialLoading || !activeProject || activeProject.id !== projectId) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-3 text-gray-600">Loading...</span>
            </div>
        );
    }


     // Handle project update completion (no changes needed)
     const handleProjectUpdateComplete = (updatedProject: ProjectProfile) => { console.log(`Project "${updatedProject.projectName}" updated.`); };

    const projectCompleteness = activeProject?.completenessPercent || 0;
    const projectProgressColor = projectCompleteness === 100 ? 'bg-green-600' : 'bg-blue-600';
    const isProjectComplete = projectCompleteness === 100; // Check if project is complete

    return (
        <div className="space-y-2 animate-fadeIn">
            <ProfileSummaryCard profile={borrowerProfile} isLoading={profileLoading} />

            {/* Section for OM Link - Only show if project is complete */}
            {isProjectComplete && (
                <div className="bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border border-emerald-200 rounded-lg p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group animate-fadeInUp">
                    {/* Animated background pattern */}
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-100/20 via-transparent to-green-100/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    {/* Success pulse effect */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-200 to-green-200 rounded-lg blur-sm opacity-30 group-hover:opacity-50 transition-opacity duration-300 animate-pulse" />
                    
                    <div className="relative z-10">
                        <h3 className="text-base font-semibold text-emerald-800 flex items-center">
                            <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse"></span>
                            Project Ready!
                        </h3>
                        <p className="text-sm text-emerald-700">This project profile is complete. You can view the generated Offering Memorandum.</p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => router.push(`/project/om/${projectId}`)}
                        className="border-emerald-300 text-emerald-700 hover:bg-gradient-to-r hover:from-emerald-100 hover:to-green-100 hover:border-emerald-400 px-6 py-3 text-base font-medium shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 relative z-10"
                    >
                        <FileSpreadsheet className="mr-2 h-5 w-5" />
                        View OM
                    </Button>
                </div>
            )}


            <AskAIProvider onFieldAskAI={(fieldId: string) => {
              setDroppedFieldId(fieldId);
            }}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Project Form */}
                  <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow-sm border border-gray-200 max-h-[calc(100vh-280px)] overflow-hidden flex flex-col transition-all duration-300 hover:shadow-md hover:shadow-blue-100/30 relative group"> 
                       {/* Subtle background gradient on hover */}
                       <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-purple-50/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-lg" />
                       
                       <div className="mb-4 border-b pb-3 flex-shrink-0 relative z-10">
                          <div className="flex justify-between items-center mb-1">
                              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2 animate-pulse"></span>
                                  Project Resume
                              </h2>
                              <span className={`text-sm font-semibold transition-colors duration-300 ${projectCompleteness === 100 ? 'text-emerald-600' : 'text-blue-600'}`}>{projectCompleteness}% Complete</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden shadow-inner">
                              <div 
                                  className={`h-full rounded-full transition-all duration-1000 ease-out ${projectProgressColor} shadow-sm relative overflow-hidden`} 
                                  style={{ width: `${projectCompleteness}%` }}
                              >
                                  {/* Shimmer effect for progress bar */}
                                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" 
                                       style={{ 
                                         backgroundSize: '200% 100%',
                                         animation: 'shimmer 2s infinite'
                                       }} 
                                  />
                              </div>
                          </div>
                      </div>
                      <div className="flex-1 overflow-y-auto relative z-10">
                        <EnhancedProjectForm 
                          existingProject={activeProject} 
                          onComplete={handleProjectUpdateComplete}
                          onAskAI={(fieldId) => setDroppedFieldId(fieldId)}
                          onFormDataChange={setCurrentFormData}
                        />
                      </div>
                  </div>

                  {/* Right Column: Consolidated Sidebar */}
                  <div className="h-[calc(100vh-280px)]"> {/* Adjusted height to match form card and extend to bottom of sign out button */}
                      <ConsolidatedSidebar 
                        projectId={activeProject.id} 
                        formData={currentFormData || activeProject} 
                        droppedFieldId={droppedFieldId}
                        onFieldProcessed={() => {
                          setDroppedFieldId(null);
                        }}
                        welcomeMessageGenerated={welcomeMessageGenerated}
                      />
                  </div>
              </div>
            </AskAIProvider>
        </div>
    );
};