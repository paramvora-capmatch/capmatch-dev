"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Permission, ProjectGrant } from "@/types/enhanced-types";
import { computeProjectLevel, PermissionLevel } from "@/components/ui/PillToggle";

export const RESOURCE_TYPES = [
  "PROJECT_RESUME",
  "PROJECT_DOCS_ROOT",
  "BORROWER_RESUME",
  "BORROWER_DOCS_ROOT",
] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const resourceLabels: Record<ResourceType, string> = {
  PROJECT_RESUME: "Project Resume",
  PROJECT_DOCS_ROOT: "Project Documents",
  BORROWER_RESUME: "Borrower Resume",
  BORROWER_DOCS_ROOT: "Borrower Documents",
};

function levelToPermission(level: PermissionLevel): Permission | null {
  if (level === "none" || level === "custom") return null;
  return level === "edit" ? "edit" : "view";
}

function defaultPermissionsForLevel(level: PermissionLevel): ProjectGrant["permissions"] {
  const permission = levelToPermission(level);
  if (!permission) return [];
  return RESOURCE_TYPES.map((resource_type) => ({ resource_type, permission }));
}

export type ProjectDocsMap = Record<
  string,
  { id: string; name: string; parent_id: string | null }[]
>;
export type ProjectResourcesMap = Record<
  string,
  Map<string, { id: string; parent_id: string | null; resource_type: string }>
>;
export type ProjectRootsMap = Record<
  string,
  {
    projectDocsRootId: string | null;
    borrowerDocsRootId: string | null;
    underwritingTemplatesRootId: string | null;
  }
>;

export interface UseProjectPermissionEditorResult {
  projectGrants: ProjectGrant[];
  setProjectGrants: React.Dispatch<React.SetStateAction<ProjectGrant[]>>;
  projectDocsMap: ProjectDocsMap;
  projectResourcesMap: ProjectResourcesMap;
  projectRootsMap: ProjectRootsMap;
  setProjectLevel: (projectId: string, level: PermissionLevel) => void;
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
  getProjectLevel: (projectId: string) => PermissionLevel;
  ensureProjectDocsLoaded: (projectId: string) => Promise<void>;
  getDocumentRootType: (
    projectId: string,
    docParentId: string | null
  ) => "PROJECT_DOCS_ROOT" | "BORROWER_DOCS_ROOT" | "UNDERWRITING_TEMPLATES_ROOT" | null;
  levelToPermission: (level: PermissionLevel) => Permission | null;
  defaultPermissionsForLevel: (level: PermissionLevel) => ProjectGrant["permissions"];
}

export function useProjectPermissionEditor(
  onOpenDetailPanelChange?: (projectId: string | null) => void
): UseProjectPermissionEditorResult {
  const [projectGrants, setProjectGrants] = useState<ProjectGrant[]>([]);
  const [projectDocsMap, setProjectDocsMap] = useState<ProjectDocsMap>({});
  const [projectResourcesMap, setProjectResourcesMap] = useState<ProjectResourcesMap>({});
  const [projectRootsMap, setProjectRootsMap] = useState<ProjectRootsMap>({});

  const ensureProjectDocsLoaded = useCallback(
    async (projectId: string) => {
      if (
        projectDocsMap[projectId] &&
        projectRootsMap[projectId] &&
        projectResourcesMap[projectId]
      )
        return;

      const { data: roots } = await supabase
        .from("resources")
        .select("id,resource_type")
        .eq("project_id", projectId)
        .in("resource_type", [
          "PROJECT_DOCS_ROOT",
          "BORROWER_DOCS_ROOT",
          "UNDERWRITING_TEMPLATES_ROOT",
        ]);

      const projectDocsRootId =
        roots?.find((r) => r.resource_type === "PROJECT_DOCS_ROOT")?.id ?? null;
      const borrowerDocsRootId =
        roots?.find((r) => r.resource_type === "BORROWER_DOCS_ROOT")?.id ?? null;
      const underwritingTemplatesRootId =
        roots?.find((r) => r.resource_type === "UNDERWRITING_TEMPLATES_ROOT")
          ?.id ?? null;

      setProjectRootsMap((prev) => ({
        ...prev,
        [projectId]: {
          projectDocsRootId,
          borrowerDocsRootId,
          underwritingTemplatesRootId,
        },
      }));

      const { data: allResources } = await supabase
        .from("resources")
        .select("id,parent_id,resource_type")
        .eq("project_id", projectId)
        .in("resource_type", [
          "FILE",
          "FOLDER",
          "PROJECT_DOCS_ROOT",
          "BORROWER_DOCS_ROOT",
          "UNDERWRITING_TEMPLATES_ROOT",
        ]);

      const resourcesMap = new Map<
        string,
        { id: string; parent_id: string | null; resource_type: string }
      >();
      allResources?.forEach((r) => {
        resourcesMap.set(r.id, {
          id: r.id,
          parent_id: r.parent_id,
          resource_type: r.resource_type,
        });
      });

      setProjectResourcesMap((prev) => ({ ...prev, [projectId]: resourcesMap }));

      const { data: files } = await supabase
        .from("resources")
        .select("id,name,parent_id")
        .eq("resource_type", "FILE")
        .eq("project_id", projectId);
      setProjectDocsMap((prev) => ({ ...prev, [projectId]: files ?? [] }));
    },
    [projectDocsMap, projectRootsMap, projectResourcesMap]
  );

  const getDocumentRootType = useCallback(
    (
      projectId: string,
      docParentId: string | null
    ): "PROJECT_DOCS_ROOT" | "BORROWER_DOCS_ROOT" | "UNDERWRITING_TEMPLATES_ROOT" | null => {
      const roots = projectRootsMap[projectId];
      const resourcesMap = projectResourcesMap[projectId];
      if (!roots || !resourcesMap) return null;

      let currentParentId = docParentId;
      const visited = new Set<string>();

      while (currentParentId) {
        if (visited.has(currentParentId)) break;
        visited.add(currentParentId);
        if (currentParentId === roots.projectDocsRootId) return "PROJECT_DOCS_ROOT";
        if (currentParentId === roots.borrowerDocsRootId) return "BORROWER_DOCS_ROOT";
        if (currentParentId === roots.underwritingTemplatesRootId)
          return "UNDERWRITING_TEMPLATES_ROOT";
        const parent = resourcesMap.get(currentParentId);
        if (!parent) break;
        currentParentId = parent.parent_id;
      }
      return null;
    },
    [projectRootsMap, projectResourcesMap]
  );

  const getProjectLevel = useCallback(
    (projectId: string): PermissionLevel => {
      const grant = projectGrants.find((g) => g.projectId === projectId);
      if (!grant) return "none";
      const hasOverrides =
        (grant.fileOverrides && grant.fileOverrides.length > 0) ||
        (grant.exclusions && grant.exclusions.length > 0);
      return computeProjectLevel(grant.permissions, RESOURCE_TYPES, hasOverrides);
    },
    [projectGrants]
  );

  const setProjectLevel = useCallback(
    (projectId: string, level: PermissionLevel) => {
      if (level === "none") {
        setProjectGrants((prev) => prev.filter((g) => g.projectId !== projectId));
        onOpenDetailPanelChange?.(null);
        return;
      }
      if (level === "custom") {
        // Open the detail panel; ensure there is a grant (default all view) so the panel has something to edit
        setProjectGrants((prev) => {
          const existing = prev.find((g) => g.projectId === projectId);
          if (existing) return prev;
          return [
            ...prev,
            {
              projectId,
              permissions: RESOURCE_TYPES.map((resource_type) => ({
                resource_type,
                permission: "view" as Permission,
              })),
              fileOverrides: [],
            },
          ];
        });
        ensureProjectDocsLoaded(projectId);
        onOpenDetailPanelChange?.(projectId);
        return;
      }
      setProjectGrants((prev) => {
        const existing = prev.find((g) => g.projectId === projectId);
        const nextPerm: Permission = level === "edit" ? "edit" : "view";
        const updated: ProjectGrant = {
          projectId,
          permissions: RESOURCE_TYPES.map((resource_type) => ({
            resource_type,
            permission: nextPerm,
          })),
          fileOverrides: [],
        };
        return existing
          ? prev.map((g) => (g.projectId === projectId ? updated : g))
          : [...prev, updated];
      });
      onOpenDetailPanelChange?.(null);
      ensureProjectDocsLoaded(projectId);
    },
    [ensureProjectDocsLoaded, onOpenDetailPanelChange]
  );

  const setResourcePermission = useCallback(
    (
      projectId: string,
      resourceType: ResourceType,
      permission: Permission | null,
      skipCascade?: boolean
    ) => {
      setProjectGrants((prev) => {
        const existing = prev.find((g) => g.projectId === projectId);
        if (!existing) {
          if (!permission) return prev;
          return [
            ...prev,
            {
              projectId,
              permissions: [{ resource_type: resourceType, permission }],
              fileOverrides: [],
            },
          ];
        }
        const others = existing.permissions.filter(
          (p) => p.resource_type !== resourceType
        );
        const perms = permission
          ? [...others, { resource_type: resourceType, permission }]
          : others;
        const isDocsRoot =
          resourceType === "BORROWER_DOCS_ROOT" ||
          resourceType === "PROJECT_DOCS_ROOT";
        // In custom (skipCascade) mode, keep file overrides intact
        const newOverrides =
          !skipCascade && isDocsRoot && projectDocsMap[projectId]
            ? (existing.fileOverrides ?? []).filter((override) => {
              const doc = projectDocsMap[projectId]?.find(
                (d) => d.id === override.resource_id
              );
              const docRootType = doc
                ? getDocumentRootType(projectId, doc.parent_id)
                : null;
              return docRootType !== resourceType;
            })
            : existing.fileOverrides ?? [];
        return prev.map((g) =>
          g.projectId === projectId
            ? { ...g, permissions: perms, fileOverrides: newOverrides }
            : g
        );
      });
      if (
        (resourceType === "BORROWER_DOCS_ROOT" ||
          resourceType === "PROJECT_DOCS_ROOT") &&
        permission
      ) {
        ensureProjectDocsLoaded(projectId);
      }
    },
    [ensureProjectDocsLoaded, projectDocsMap, getDocumentRootType]
  );

  const setProjectDocPermission = useCallback(
    (
      projectId: string,
      resourceId: string,
      permission: Permission | "none"
    ) => {
      const doc = projectDocsMap[projectId]?.find((d) => d.id === resourceId);
      const rootType = doc
        ? getDocumentRootType(projectId, doc.parent_id)
        : null;
      if (rootType === "UNDERWRITING_TEMPLATES_ROOT") return;
      setProjectGrants((prev) =>
        prev.map((g) => {
          if (g.projectId !== projectId) return g;
          const overrides = [...(g.fileOverrides ?? [])];
          const idx = overrides.findIndex((o) => o.resource_id === resourceId);
          const rootPerm = rootType
            ? g.permissions.find((p) => p.resource_type === rootType)?.permission
            : g.permissions.find(
              (p) =>
                p.resource_type === "PROJECT_DOCS_ROOT" ||
                p.resource_type === "BORROWER_DOCS_ROOT"
            )?.permission;

          if (permission === (rootPerm ?? "view")) {
            if (idx >= 0) overrides.splice(idx, 1);
          } else {
            const override = { resource_id: resourceId, permission };
            if (idx >= 0) overrides[idx] = override;
            else overrides.push(override);
          }
          return { ...g, fileOverrides: overrides };
        })
      );
    },
    [projectDocsMap, getDocumentRootType]
  );

  return {
    projectGrants,
    setProjectGrants,
    projectDocsMap,
    projectResourcesMap,
    projectRootsMap,
    setProjectLevel,
    setResourcePermission,
    setProjectDocPermission,
    getProjectLevel,
    ensureProjectDocsLoaded,
    getDocumentRootType,
    levelToPermission,
    defaultPermissionsForLevel,
  };
}
