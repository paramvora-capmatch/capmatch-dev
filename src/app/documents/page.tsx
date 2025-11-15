// src/app/documents/page.tsx
"use client";

import React from "react";
import { RoleBasedRoute } from "../../components/auth/RoleBasedRoute";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "../../components/ui/Button";

export default function DocumentsPage() {
  const { user, isLoading } = useAuth();
  const { projects } = useProjects();
  const primaryProject = projects[0] || null;

  return (
    <RoleBasedRoute roles={["borrower"]}>
      <DashboardLayout title="My Documents">
        {isLoading || !user ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="max-w-3xl space-y-6 mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 space-y-4">
                <h2 className="text-xl font-semibold text-gray-800">Borrower Documents Are Now Project-Specific</h2>
                <p className="text-sm text-gray-600">
                  Each project contains its own borrower documents and resume. Manage your files from the project workspace to keep everything organized for lender reviews.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  {primaryProject ? (
                    <Button
                      onClick={() => {
                        window.location.href = `/project/workspace/${primaryProject.id}?step=documents`;
                      }}
                    >
                      Go to Current Project
                    </Button>
                  ) : (
                    <Link href="/dashboard" className="text-sm font-medium text-blue-600 hover:underline">
                      Create a project to start uploading documents
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </RoleBasedRoute>
  );
}