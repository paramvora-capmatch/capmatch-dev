// src/app/project/create/page.tsx
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MinimalSidebarLayout from '../../../components/layout/MinimalSidebarLayout';
import { RoleBasedRoute } from '../../../components/auth/RoleBasedRoute';
import { useProjects } from '../../../hooks/useProjects';
import { Loader2 } from 'lucide-react'; // For loading state

export default function CreateProjectPage() {
  const router = useRouter();
  const { createProject, projects, isLoading } = useProjects();

  useEffect(() => {
    // Wait for projects to load to get an accurate count for the new project name
    if (isLoading) {
      return;
    }

    const performCreate = async () => {
      try {
        const newProject = await createProject({
          projectName: `New Project ${projects.length + 1}`,
        });
        // Redirect to the workspace for the newly created project
        router.replace(`/project/workspace/${newProject.id}`);
      } catch (error) {
        console.error("Failed to create project:", error);
        // If creation fails, redirect back to the dashboard
        router.replace('/dashboard');
      }
    };

    performCreate();
  }, [createProject, router, projects, isLoading]);

  return (
    <RoleBasedRoute roles={['borrower']}>
      <MinimalSidebarLayout title="Creating New Project...">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Preparing your new project...</span>
        </div>
      </MinimalSidebarLayout>
    </RoleBasedRoute>
  );
}