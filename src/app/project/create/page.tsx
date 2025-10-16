// src/app/project/create/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MinimalSidebarLayout from '../../../components/layout/MinimalSidebarLayout';
import { RoleBasedRoute } from '../../../components/auth/RoleBasedRoute';
import { useProjects } from '../../../hooks/useProjects';
import { useAuthStore } from '../../../stores/useAuthStore';
import { MemberPermissionSelector } from '../../../components/forms/MemberPermissionSelector';
import { Loader2 } from 'lucide-react';

export default function CreateProjectPage() {
  const router = useRouter();
  const { createProject, projects, isLoading } = useProjects();
  const { activeEntity } = useAuthStore();
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<Array<{user_id: string}>>([]);
  const [projectName, setProjectName] = useState('');

  useEffect(() => {
    // Wait for projects to load to get an accurate count for the new project name
    if (isLoading) {
      return;
    }

    // Set default project name
    setProjectName(`New Project ${projects.length + 1}`);
    
    // Check if entity has members (other than owners)
    if (activeEntity) {
      // For now, always show the member selector if there's an active entity
      // In a real app, you might want to check if there are actually members
      setShowMemberSelector(true);
    } else {
      // No active entity, create project directly
      performCreate();
    }
  }, [isLoading, projects.length, activeEntity]);

  const performCreate = async (memberPermissions: Array<{user_id: string}> = []) => {
    try {
      const newProject = await createProject({
        projectName,
        memberPermissions
      });
      // Redirect to the workspace for the newly created project
      router.replace(`/project/workspace/${newProject.id}`);
    } catch (error) {
      console.error("Failed to create project:", error);
      // If creation fails, redirect back to the dashboard
      router.replace('/dashboard');
    }
  };

  const handleMemberSelection = (members: Array<{user_id: string}>) => {
    setSelectedMembers(members);
  };

  const handleComplete = () => {
    performCreate(selectedMembers);
  };

  const handleCancel = () => {
    router.replace('/dashboard');
  };

  if (isLoading) {
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

  if (showMemberSelector && activeEntity) {
    return (
      <RoleBasedRoute roles={['borrower']}>
        <MinimalSidebarLayout title="Create New Project">
          <div className="max-w-4xl mx-auto">
            <MemberPermissionSelector
              entityId={activeEntity.id}
              selectedMembers={selectedMembers}
              onSelectionChange={handleMemberSelection}
              onComplete={handleComplete}
              onCancel={handleCancel}
            />
          </div>
        </MinimalSidebarLayout>
      </RoleBasedRoute>
    );
  }

  // Fallback - should not reach here in normal flow
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