"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PillToggle, PermissionLevel } from "@/components/ui/PillToggle";
import { Permission, ProjectGrant } from "@/types/enhanced-types";
import { Briefcase, X } from "lucide-react";
import {
  RESOURCE_TYPES,
  resourceLabels,
  ResourceType,
  ProjectDocsMap,
} from "@/hooks/useProjectPermissionEditor";

/** Underwriting template document names – never show in per-document permission UI. */
const UNDERWRITING_TEMPLATE_DOC_NAMES = new Set([
  "T12 Financial Statement",
  "Sources & Uses Model",
  "Personal Financial Statement (PFS)",
  "Personal Financial Statement",
  "Sponsor Bio",
  "Current Rent Roll",
  "Schedule of Real Estate Owned (SREO)",
  "CapEx Report",
  "ProForma Cash flow",
  "Pro Forma Cash flow",
]);

export interface ProjectPermissionDetailPanelProps {
  projectId: string;
  projectName: string;
  grant: ProjectGrant;
  projectDocsMap: ProjectDocsMap;
  setResourcePermission: (
    projectId: string,
    resourceType: ResourceType,
    permission: Permission | null,
    skipCascade?: boolean
  ) => void;
  setProjectDocPermission: (
    projectId: string,
    resourceId: string,
    permission: Permission | "none"
  ) => void;
  getDocumentRootType: (
    projectId: string,
    docParentId: string | null
  ) => "PROJECT_DOCS_ROOT" | "BORROWER_DOCS_ROOT" | "UNDERWRITING_TEMPLATES_ROOT" | null;
  onClose: () => void;
}

export const ProjectPermissionDetailPanel: React.FC<
  ProjectPermissionDetailPanelProps
> = ({
  projectId,
  projectName,
  grant,
  projectDocsMap,
  setResourcePermission,
  setProjectDocPermission,
  getDocumentRootType,
  onClose,
}) => {
  const docs = projectDocsMap[projectId] ?? [];
  const hasDocsRootAccess =
    grant.permissions.some((p) => p.resource_type === "PROJECT_DOCS_ROOT") ||
    grant.permissions.some((p) => p.resource_type === "BORROWER_DOCS_ROOT");
  const visibleDocs = docs.filter((doc) => {
    const rootType = getDocumentRootType(projectId, doc.parent_id);
    if (rootType === "UNDERWRITING_TEMPLATES_ROOT") return false;
    const name = doc.name?.trim() ?? "";
    if (UNDERWRITING_TEMPLATE_DOC_NAMES.has(name)) return false;
    if (rootType && !grant.permissions.some((p) => p.resource_type === rootType))
      return false;
    return true;
  });
  const showPerDocSection = hasDocsRootAccess && visibleDocs.length > 0;

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between">
        <h3 className="flex items-center text-xl font-semibold">
          <Briefcase className="h-5 w-5 mr-2" />
          {projectName} - Permissions
        </h3>
        <Button variant="outline" size="sm" onClick={onClose}>
          <X size={16} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {RESOURCE_TYPES.map((resourceType) => {
          const isDocsRoot =
            resourceType === "PROJECT_DOCS_ROOT" ||
            resourceType === "BORROWER_DOCS_ROOT";
          const rootPerm = grant.permissions.find(
            (perm) => perm.resource_type === resourceType
          )?.permission;
          // For docs roots, show "custom" when there are per-file overrides under this root
          const hasOverridesUnderRoot =
            isDocsRoot &&
            rootPerm &&
            (grant.fileOverrides ?? []).some((o) => {
              const doc = docs.find((d) => d.id === o.resource_id);
              const docRoot = doc
                ? getDocumentRootType(projectId, doc.parent_id)
                : null;
              return docRoot === resourceType;
            });
          const displayValue: PermissionLevel = hasOverridesUnderRoot
            ? "custom"
            : ((rootPerm as PermissionLevel) || "none");

          return (
            <div
              key={resourceType}
              className="flex items-center justify-between"
            >
              <span className="text-base text-gray-800">
                {resourceLabels[resourceType]}
              </span>
              <PillToggle
                value={displayValue}
                onChange={(val) => {
                  if (val === "custom") {
                    // Custom mode: set root to "view" if currently none, otherwise keep current. Don't cascade.
                    const effectivePerm: Permission = (rootPerm as Permission) || "view";
                    setResourcePermission(projectId, resourceType, effectivePerm, true);
                    return;
                  }
                  setResourcePermission(
                    projectId,
                    resourceType,
                    val === "none" ? null : (val as Permission)
                  );
                }}
                size="sm"
                showCustom={isDocsRoot}
              />
            </div>
          );
        })}

        {showPerDocSection && (
          <div className="border-t pt-2 space-y-1">
            <div className="text-sm text-gray-500">
              Set per-document permissions
            </div>
            {visibleDocs.map((doc) => {
              const rootType = getDocumentRootType(projectId, doc.parent_id);
              const rootPerm = rootType
                ? grant.permissions.find((p) => p.resource_type === rootType)
                    ?.permission
                : grant.permissions.find(
                    (p) =>
                      p.resource_type === "PROJECT_DOCS_ROOT" ||
                      p.resource_type === "BORROWER_DOCS_ROOT"
                  )?.permission;
              const current =
                grant.fileOverrides?.find((o) => o.resource_id === doc.id)
                  ?.permission ?? rootPerm ?? "view";
              const docCategory =
                rootType === "BORROWER_DOCS_ROOT"
                  ? " (Borrower)"
                  : rootType === "PROJECT_DOCS_ROOT"
                    ? " (Project)"
                    : "";

              return (
                <div
                  key={doc.id}
                  className="flex items-center justify-between text-base py-1"
                >
                  <span className="text-gray-700 truncate pr-2">
                    {doc.name}
                    {docCategory && (
                      <span className="text-xs text-gray-500">
                        {docCategory}
                      </span>
                    )}
                  </span>
                  <PillToggle
                    value={current as PermissionLevel}
                    onChange={(val) =>
                      setProjectDocPermission(
                        projectId,
                        doc.id,
                        val as Permission | "none"
                      )
                    }
                    size="xs"
                    showCustom={false}
                  />
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
