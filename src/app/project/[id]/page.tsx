// src/app/project/[id]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader } from '../../../components/ui/card';
import { Button } from '../../../components/ui/Button';
import { RoleBasedRoute } from '../../../components/auth/RoleBasedRoute';
import { useProjects } from '../../../hooks/useProjects';
import { useBorrowerProfile } from '../../../hooks/useBorrowerProfile';

import { LoadingOverlay } from '../../../components/ui/LoadingOverlay';
import { BorrowerProfileForm } from '../../../components/forms/BorrowerProfileForm';
import { MessagePanel } from '../../../components/dashboard/MessagePanel';
import { EnhancedProjectForm } from '../../../components/forms/EnhancedProjectForm';
import { ChevronLeft, Home } from 'lucide-react';

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { getProject, isLoading, activeProject, setActiveProject } = useProjects();
  


  // Load project
  useEffect(() => {
    const loadProject = async () => {
      const projectId = params?.id as string;
      
      if (!projectId) {
        router.push('/dashboard');
        return;
      }
      
      const project = getProject(projectId);
      if (project) {
        setActiveProject(project);
      } else {
        console.error('Project not found');
        router.push('/dashboard');
      }
    };
    
    loadProject();
  }, [params, router, getProject, setActiveProject]);

  // Render placeholder if no project is loaded
  if (!activeProject) {
    return (
      <RoleBasedRoute roles={['borrower']}>
        <DashboardLayout title="Deal Room™">
          <LoadingOverlay isLoading={false} />
          <div className="text-center py-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Project not found</h2>
            <p className="text-gray-600 mb-6">The project you're looking for doesn't exist or has been removed.</p>
            <Button 
              variant="outline"
              leftIcon={<ChevronLeft size={16} />}
              onClick={() => router.push('/dashboard')}
            >
              Back to Dashboard
            </Button>
          </div>
        </DashboardLayout>
      </RoleBasedRoute>
    );
  }

  return (
    <RoleBasedRoute roles={['borrower']}>
      <DashboardLayout 
        title={activeProject.projectName}
        sidebarMinimal={true}
        sidebarLinks={[
          { label: 'Dashboard', icon: <Home size={16} />, href: '/dashboard' }
        ]}
      >
        <LoadingOverlay isLoading={false} />
        
        <div className="mb-6">
          <Button 
            variant="outline"
            leftIcon={<ChevronLeft size={16} />}
            onClick={() => router.push('/dashboard')}
          >
            Back to Dashboard
          </Button>
        </div>
        
        <div className="grid grid-cols-1 gap-6">
          {/* Project Form - Left Side */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm h-full">
              <CardHeader className="border-b bg-gray-50 pb-3">
                <h2 className="text-xl font-semibold text-gray-800">Project Details</h2>
              </CardHeader>
              <CardContent className="p-4">
                <EnhancedProjectForm 
                  existingProject={activeProject}
                  compact={true}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </RoleBasedRoute>
  );
}