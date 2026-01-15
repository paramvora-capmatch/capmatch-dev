// src/app/lender/dashboard/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RoleBasedRoute } from "../../../components/auth/RoleBasedRoute";
import { useAuth } from "../../../hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";
import { Building2, MapPin, DollarSign, Calendar } from "lucide-react";

// Resume fields can be simple values or enhanced objects with {value, source, warnings, other_values}
type ResumeFieldValue<T> = T | { value: T; source?: string; warnings?: string[]; other_values?: T[] };

interface LenderProject {
  id: string;
  name: string;
  owner_org_id: string;
  created_at: string;
  project_resume?: {
    content: {
      propertyAddressCity?: ResumeFieldValue<string>;
      propertyAddressState?: ResumeFieldValue<string>;
      loanAmountRequested?: ResumeFieldValue<number>;
      assetType?: ResumeFieldValue<string>;
      [key: string]: unknown;
    };
  };
  borrower_resume?: {
    content: {
      fullLegalName?: ResumeFieldValue<string>;
      primaryEntityName?: ResumeFieldValue<string>;
      [key: string]: unknown;
    };
  };
}

export default function LenderDashboardPage() {
  const router = useRouter();
  const { user, activeOrg } = useAuth();
  const [projects, setProjects] = useState<LenderProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLenderProjects = async () => {
      if (!user || !activeOrg) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch projects that this lender org has access to
        const { data: accessGrants, error: accessError } = await supabase
          .from("lender_project_access")
          .select("project_id")
          .eq("lender_org_id", activeOrg.id);

        if (accessError) {
          throw accessError;
        }

        if (!accessGrants || accessGrants.length === 0) {
          setProjects([]);
          setIsLoading(false);
          return;
        }

        const projectIds = accessGrants.map((g) => g.project_id);

        // Fetch project details
        const { data: projectsData, error: projectsError } = await supabase
          .from("projects")
          .select(
            `
            id,
            name,
            owner_org_id,
            created_at
          `
          )
          .in("id", projectIds);

        if (projectsError) {
          throw projectsError;
        }

        // Fetch project resumes
        const { data: projectResumes, error: resumesError } = await supabase
          .from("project_resumes")
          .select("project_id, content")
          .in("project_id", projectIds);

        if (resumesError) {
          console.error("Error fetching project resumes:", resumesError);
        }

        // Fetch borrower resumes for these projects
        // Note: borrower_resumes are project-scoped, not org-scoped
        const { data: borrowerResumes, error: borrowerError } = await supabase
          .from("borrower_resumes")
          .select("project_id, content")
          .in("project_id", projectIds);

        if (borrowerError) {
          console.error("Error fetching borrower resumes:", borrowerError);
        }

        // Combine data
        const enrichedProjects = (projectsData || []).map((project) => {
          const projectResume = projectResumes?.find(
            (r) => r.project_id === project.id
          );
          const borrowerResume = borrowerResumes?.find(
            (r) => r.project_id === project.id
          );

          return {
            ...project,
            project_resume: projectResume,
            borrower_resume: borrowerResume,
          };
        });

        setProjects(enrichedProjects);
      } catch (err) {
        console.error("Error fetching lender projects:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load projects"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchLenderProjects();
  }, [user, activeOrg]);

  const formatCurrency = (amount?: number) => {
    if (!amount) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Helper to extract value from enhanced resume fields
  // Fields can be either simple values or objects with {value, source, ...}
  const extractValue = (field: unknown): string | number | undefined => {
    if (field === null || field === undefined) return undefined;
    if (typeof field === "object" && "value" in (field as Record<string, unknown>)) {
      return (field as { value: string | number }).value;
    }
    if (typeof field === "string" || typeof field === "number") {
      return field;
    }
    return undefined;
  };

  return (
    <RoleBasedRoute roles={["lender"]}>
      <DashboardLayout title="Lender Dashboard">
        <div className="max-w-7xl mx-auto py-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Investment Opportunities
            </h1>
            <p className="mt-2 text-gray-600">
              Projects matched to your investment criteria
            </p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && projects.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
              <Building2 className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Projects Yet
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                You don't have access to any projects yet. Projects will appear
                here once an advisor grants you access.
              </p>
            </div>
          )}

          {/* Projects Grid */}
          {!isLoading && !error && projects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => {
                const content = project.project_resume?.content || {};
                const borrowerContent = project.borrower_resume?.content || {};
                // Extract values from enhanced resume fields (which may be objects with {value, source, ...})
                const city = extractValue(content.propertyAddressCity);
                const state = extractValue(content.propertyAddressState);
                const loanAmount = extractValue(content.loanAmountRequested) as number | undefined;
                const assetType = extractValue(content.assetType);
                const borrowerName =
                  extractValue(borrowerContent.primaryEntityName) ||
                  extractValue(borrowerContent.fullLegalName);

                return (
                  <div
                    key={project.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                    onClick={() =>
                      router.push(`/lender/project/${project.id}`)
                    }
                  >
                    {/* Project Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                      <h3 className="text-lg font-semibold text-white truncate">
                        {project.name}
                      </h3>
                      {borrowerName && (
                        <p className="text-blue-100 text-sm mt-1">
                          {borrowerName}
                        </p>
                      )}
                    </div>

                    {/* Project Details */}
                    <div className="px-6 py-4 space-y-3">
                      {/* Location */}
                      {(city || state) && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700">
                            {city && state
                              ? `${city}, ${state}`
                              : city || state}
                          </span>
                        </div>
                      )}

                      {/* Asset Type */}
                      {assetType && (
                        <div className="flex items-start gap-2">
                          <Building2 className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700">
                            {assetType}
                          </span>
                        </div>
                      )}

                      {/* Loan Amount */}
                      {loanAmount && (
                        <div className="flex items-start gap-2">
                          <DollarSign className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700">
                            {formatCurrency(loanAmount)} requested
                          </span>
                        </div>
                      )}

                      {/* Created Date */}
                      <div className="flex items-start gap-2">
                        <Calendar className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-500">
                          Added {formatDate(project.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Action */}
                    <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                      <button className="text-sm font-medium text-blue-600 hover:text-blue-700">
                        View Details →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DashboardLayout>
    </RoleBasedRoute>
  );
}
