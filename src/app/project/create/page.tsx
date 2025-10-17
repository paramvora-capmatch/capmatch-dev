// src/app/project/create/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MinimalSidebarLayout from '../../../components/layout/MinimalSidebarLayout';
import { RoleBasedRoute } from '../../../components/auth/RoleBasedRoute';
import { useProjects } from '../../../hooks/useProjects';
import { useAuthStore } from '../../../stores/useAuthStore';
import { Loader2, Plus, ArrowLeft } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../../components/ui/card';

export default function CreateProjectPage() {
  const router = useRouter();
  const { createProject, projects, isLoading } = useProjects();
  const { activeOrg } = useAuthStore();
  const [projectName, setProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    // Wait for projects to load to get an accurate count for the new project name
    if (isLoading) {
      return;
    }

    // Set default project name
    setProjectName(`New Project ${projects.length + 1}`);
  }, [isLoading, projects.length]);

  const handleCreate = async () => {
    if (!projectName.trim()) return;
    
    setIsCreating(true);
    try {
      const newProject = await createProject({
        projectName: projectName.trim()
      });
      // Redirect to the workspace for the newly created project
      router.replace(`/project/workspace/${newProject.id}`);
    } catch (error) {
      console.error("Failed to create project:", error);
      // If creation fails, redirect back to the dashboard
      router.replace('/dashboard');
    } finally {
      setIsCreating(false);
    }
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

  return (
    <RoleBasedRoute roles={['borrower']}>
      <MinimalSidebarLayout title="Create New Project">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Plus className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Create New Project</h1>
                  <p className="text-gray-600">Set up a new real estate project for funding</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  id="projectName"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter project name"
                  disabled={isCreating}
                />
                <p className="mt-1 text-sm text-gray-500">
                  Choose a descriptive name for your project
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">Role-based Permissions</h3>
                <p className="text-sm text-blue-800">
                  Project access is automatically managed based on team member roles:
                </p>
                <ul className="mt-2 text-sm text-blue-700 space-y-1">
                  <li>• <strong>Owners:</strong> Full access to all projects and documents</li>
                  <li>• <strong>Project Managers:</strong> Can edit all project resources</li>
                  <li>• <strong>Members:</strong> Can view project resumes and documents as granted</li>
                </ul>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isCreating}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={isCreating || !projectName.trim()}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Project
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </MinimalSidebarLayout>
    </RoleBasedRoute>
  );
}