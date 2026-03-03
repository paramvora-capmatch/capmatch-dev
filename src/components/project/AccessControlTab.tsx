// src/components/project/AccessControlTab.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useOrgStore } from "@/stores/useOrgStore";
import { useProjects } from "@/hooks/useProjects";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { Advisor, Permission, ProjectGrant } from "@/types/enhanced-types";
import { PillToggle, PermissionLevel } from "@/components/ui/PillToggle";
import { computeProjectLevel } from "@/components/ui/PillToggle";
import { RESOURCE_TYPES } from "@/hooks/useProjectPermissionEditor";
import { ProjectPermissionDetailPanel } from "@/components/team/ProjectPermissionDetailPanel";
import { AddLenderToProjectModal } from "@/components/project/AddLenderToProjectModal";
import { Button } from "@/components/ui/Button";
import { Loader2, User, Shield, Briefcase, Building2, PlusCircle, Trash2 } from "lucide-react";

interface AccessControlTabProps {
  projectId: string;
}

interface MemberPermissionInfo {
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  grant: ProjectGrant;
}

type ResourceIdsMap = Record<string, string>;

export const AccessControlTab: React.FC<AccessControlTabProps> = ({
  projectId,
}) => {
  const { user } = useAuth();
  const { members, loadOrg, currentOrg } = useOrgStore();
  const { activeProject } = useProjects();
  const isAdvisorView =
    user?.role === "advisor" &&
    activeProject?.assignedAdvisorUserId === user?.id;
  const [resourceIds, setResourceIds] = useState<ResourceIdsMap | null>(null);
  const [permissions, setPermissions] = useState<MemberPermissionInfo[]>([]);
  const [advisor, setAdvisor] = useState<Advisor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openMemberId, setOpenMemberId] = useState<string | null>(null);
  const [projectDocsMap, setProjectDocsMap] = useState<
    Record<string, { id: string; name: string; parent_id: string | null }[]>
  >({});
  const [projectRootsMap, setProjectRootsMap] = useState<
    Record<
      string,
      {
        projectDocsRootId: string | null;
        borrowerDocsRootId: string | null;
        underwritingTemplatesRootId: string | null;
      }
    >
  >({});
  const [projectResourcesMap, setProjectResourcesMap] = useState<
    Record<
      string,
      Map<string, { id: string; parent_id: string | null; resource_type: string }>
    >
  >({});
  const [lenderGrants, setLenderGrants] = useState<
    { lender_org_id: string; org_name: string }[]
  >([]);
  const [addLenderModalOpen, setAddLenderModalOpen] = useState(false);
  const [revokingOrgId, setRevokingOrgId] = useState<string | null>(null);

  const getDocumentRootType = useCallback(
    (
      projId: string,
      docParentId: string | null
    ): "PROJECT_DOCS_ROOT" | "BORROWER_DOCS_ROOT" | "UNDERWRITING_TEMPLATES_ROOT" | null => {
      const roots = projectRootsMap[projId];
      const resourcesMap = projectResourcesMap[projId];
      if (!roots || !resourcesMap) return null;
      let currentParentId = docParentId;
      const visited = new Set<string>();
      while (currentParentId) {
        if (visited.has(currentParentId)) break;
        visited.add(currentParentId);
        if (currentParentId === roots.projectDocsRootId)
          return "PROJECT_DOCS_ROOT";
        if (currentParentId === roots.borrowerDocsRootId)
          return "BORROWER_DOCS_ROOT";
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

  const ensureProjectDocsLoaded = useCallback(async (projId: string) => {
    if (
      projectDocsMap[projId] &&
      projectRootsMap[projId] &&
      projectResourcesMap[projId]
    )
      return;
    const { data: roots } = await supabase
      .from("resources")
      .select("id,resource_type")
      .eq("project_id", projId)
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
      [projId]: {
        projectDocsRootId,
        borrowerDocsRootId,
        underwritingTemplatesRootId,
      },
    }));
    const { data: allResources } = await supabase
      .from("resources")
      .select("id,parent_id,resource_type")
      .eq("project_id", projId)
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
    setProjectResourcesMap((prev) => ({ ...prev, [projId]: resourcesMap }));
    const { data: files } = await supabase
      .from("resources")
      .select("id,name,parent_id")
      .eq("resource_type", "FILE")
      .eq("project_id", projId);
    setProjectDocsMap((prev) => ({ ...prev, [projId]: files ?? [] }));
  }, [projectDocsMap, projectRootsMap, projectResourcesMap]);

  const fetchAllData = useCallback(async () => {
    if (!activeProject) {
      setIsLoading(false);
      return;
    }
    if (!isAdvisorView) {
      if (!currentOrg) {
        setIsLoading(false);
        return;
      }
      if (currentOrg.id !== activeProject.owner_org_id) {
        setError("Organization mismatch. Please refresh the page.");
        setIsLoading(false);
        return;
      }
    }
    setIsLoading(true);
    setError(null);
    try {
      if (activeProject.assignedAdvisorUserId) {
        const { data: advisorProfile } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("id", activeProject.assignedAdvisorUserId)
          .maybeSingle();
        if (advisorProfile) {
          setAdvisor({
            id: advisorProfile.id,
            userId: advisorProfile.id,
            name: advisorProfile.full_name || advisorProfile.email,
            email: advisorProfile.email,
            title: "Capital Advisor",
            phone: "",
            bio: "Capital Advisor at CapMatch",
            avatar: "",
            specialties: [],
            yearsExperience: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      } else {
        setAdvisor(null);
      }

      if (isAdvisorView) {
        setResourceIds(null);
        setPermissions([]);
        const { data: accessRows, error: lenderError } = await supabase
          .from("lender_project_access")
          .select("lender_org_id")
          .eq("project_id", projectId);
        if (!lenderError && accessRows?.length) {
          const orgIds = [...new Set(accessRows.map((r) => r.lender_org_id))];
          const { data: orgs } = await supabase
            .from("orgs")
            .select("id, name")
            .in("id", orgIds);
          const nameById = new Map((orgs ?? []).map((o) => [o.id, o.name ?? ""]));
          setLenderGrants(
            accessRows.map((r) => ({
              lender_org_id: r.lender_org_id,
              org_name: nameById.get(r.lender_org_id) ?? "Unknown",
            }))
          );
        } else {
          setLenderGrants([]);
        }
        setIsLoading(false);
        return;
      }

      const { data: resources, error: resourceError } = await supabase
        .from("resources")
        .select("id, resource_type")
        .eq("project_id", projectId)
        .in("resource_type", RESOURCE_TYPES);

      if (resourceError || !resources?.length) {
        throw new Error("Failed to load project resources");
      }
      const ids: ResourceIdsMap = {};
      resources.forEach((r) => {
        ids[r.resource_type] = r.id;
      });
      setResourceIds(ids);

      const rootIdList = Object.values(ids);

      // Load FILE resources and doc-root hierarchy for the detail panel (projectDocsMap, projectRootsMap, projectResourcesMap)
      const { data: docResources } = await supabase
        .from("resources")
        .select("id, name, parent_id, resource_type")
        .eq("project_id", projectId)
        .in("resource_type", [
          "FILE",
          "FOLDER",
          "PROJECT_DOCS_ROOT",
          "BORROWER_DOCS_ROOT",
          "UNDERWRITING_TEMPLATES_ROOT",
        ]);
      const fileResources = (docResources ?? []).filter(
        (r) => r.resource_type === "FILE"
      ) as { id: string; name: string; parent_id: string | null }[];
      const fileIds = fileResources.map((f) => f.id);
      setProjectDocsMap((prev) => ({ ...prev, [projectId]: fileResources }));

      const projectDocsRootId =
        docResources?.find((r) => r.resource_type === "PROJECT_DOCS_ROOT")?.id ??
        null;
      const borrowerDocsRootId =
        docResources?.find((r) => r.resource_type === "BORROWER_DOCS_ROOT")
          ?.id ?? null;
      const underwritingTemplatesRootId =
        docResources?.find(
          (r) => r.resource_type === "UNDERWRITING_TEMPLATES_ROOT"
        )?.id ?? null;
      setProjectRootsMap((prev) => ({
        ...prev,
        [projectId]: {
          projectDocsRootId,
          borrowerDocsRootId,
          underwritingTemplatesRootId,
        },
      }));
      const resourcesMap = new Map<
        string,
        { id: string; parent_id: string | null; resource_type: string }
      >();
      docResources?.forEach((r) => {
        resourcesMap.set(r.id, {
          id: r.id,
          parent_id: r.parent_id ?? null,
          resource_type: r.resource_type,
        });
      });
      setProjectResourcesMap((prev) => ({ ...prev, [projectId]: resourcesMap }));

      const resourceIdList =
        fileIds.length > 0 ? [...rootIdList, ...fileIds] : rootIdList;
      const { data: perms, error: permsError } = await supabase
        .from("permissions")
        .select("resource_id, user_id, permission")
        .in("resource_id", resourceIdList);

      if (permsError) throw new Error(permsError.message);

      const rootIdSet = new Set(rootIdList);
      const fileIdSet = new Set(fileIds);

      const getDocRootType = (
        parentId: string | null
      ): "PROJECT_DOCS_ROOT" | "BORROWER_DOCS_ROOT" | "UNDERWRITING_TEMPLATES_ROOT" | null => {
        let current = parentId;
        const visited = new Set<string>();
        while (current) {
          if (visited.has(current)) break;
          visited.add(current);
          if (current === projectDocsRootId) return "PROJECT_DOCS_ROOT";
          if (current === borrowerDocsRootId) return "BORROWER_DOCS_ROOT";
          if (current === underwritingTemplatesRootId)
            return "UNDERWRITING_TEMPLATES_ROOT";
          const parent = resourcesMap.get(current);
          if (!parent) break;
          current = parent.parent_id;
        }
        return null;
      };

      if (currentOrg && !members?.length) {
        await loadOrg(currentOrg.id);
      }
      const membersList = (members || []).filter((m) => m.role !== "owner");
      const permsByUser = new Map<
        string,
        { resource_id: string; permission: string }[]
      >();
      (perms || []).forEach((p) => {
        if (!permsByUser.has(p.user_id)) permsByUser.set(p.user_id, []);
        permsByUser.get(p.user_id)!.push({
          resource_id: p.resource_id,
          permission: p.permission,
        });
      });

      const memberPerms: MemberPermissionInfo[] = membersList.map((member) => {
        const userPerms = permsByUser.get(member.user_id) ?? [];
        const permissions = RESOURCE_TYPES.map((resource_type) => {
          const resourceId = ids[resource_type];
          const p = userPerms.find((u) => u.resource_id === resourceId);
          if (!p || p.permission === "none") return null;
          return {
            resource_type: resource_type as (typeof RESOURCE_TYPES)[number],
            permission: p.permission as Permission,
          };
        }).filter(
          (p): p is { resource_type: (typeof RESOURCE_TYPES)[number]; permission: Permission } =>
            p !== null
        );
        const rawFileOverrides = userPerms
          .filter(
            (u) =>
              fileIdSet.has(u.resource_id) &&
              (u.permission === "view" ||
                u.permission === "edit" ||
                u.permission === "none")
          )
          .map((u) => ({
            resource_id: u.resource_id,
            permission: u.permission as "view" | "edit" | "none",
          }));
        const fileOverrides = rawFileOverrides.filter((override) => {
          const doc = fileResources.find((f) => f.id === override.resource_id);
          const rootType = doc ? getDocRootType(doc.parent_id) : null;
          if (rootType === "UNDERWRITING_TEMPLATES_ROOT") return false;
          const rootPerm = rootType
            ? permissions.find((p) => p.resource_type === rootType)?.permission
            : null;
          const effectiveRoot = rootPerm ?? "view";
          return override.permission !== effectiveRoot;
        });
        const grant: ProjectGrant = {
          projectId,
          permissions,
          fileOverrides,
        };
        return {
          userId: member.user_id,
          userName: member.userName || member.userEmail || "Unknown",
          userEmail: member.userEmail ?? "",
          role: member.role,
          grant,
        };
      });
      setPermissions(memberPerms);

      // Lender access: fetch grants for this project (assigned advisor can SELECT via RLS)
      const { data: accessRows, error: lenderError } = await supabase
        .from("lender_project_access")
        .select("lender_org_id")
        .eq("project_id", projectId);
      if (!lenderError && accessRows?.length) {
        const orgIds = [...new Set(accessRows.map((r) => r.lender_org_id))];
        const { data: orgs } = await supabase
          .from("orgs")
          .select("id, name")
          .in("id", orgIds);
        const nameById = new Map((orgs ?? []).map((o) => [o.id, o.name ?? ""]));
        setLenderGrants(
          accessRows.map((r) => ({
            lender_org_id: r.lender_org_id,
            org_name: nameById.get(r.lender_org_id) ?? "Unknown",
          }))
        );
      } else {
        setLenderGrants([]);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load access control data"
      );
    } finally {
      setIsLoading(false);
    }
  }, [projectId, activeProject, members, currentOrg, loadOrg, isAdvisorView]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    if (openMemberId) {
      ensureProjectDocsLoaded(projectId);
    }
  }, [openMemberId, projectId, ensureProjectDocsLoaded]);

  const refreshLenderGrants = useCallback(async () => {
    const { data: accessRows } = await supabase
      .from("lender_project_access")
      .select("lender_org_id")
      .eq("project_id", projectId);
    if (!accessRows?.length) {
      setLenderGrants([]);
      return;
    }
    const orgIds = [...new Set(accessRows.map((r) => r.lender_org_id))];
    const { data: orgs } = await supabase
      .from("orgs")
      .select("id, name")
      .in("id", orgIds);
    const nameById = new Map((orgs ?? []).map((o) => [o.id, o.name ?? ""]));
    setLenderGrants(
      accessRows.map((r) => ({
        lender_org_id: r.lender_org_id,
        org_name: nameById.get(r.lender_org_id) ?? "Unknown",
      }))
    );
  }, [projectId]);

  const handleRevokeLender = useCallback(
    async (lenderOrgId: string) => {
      setRevokingOrgId(lenderOrgId);
      try {
        await supabase.rpc("revoke_lender_project_access_by_advisor", {
          p_project_id: projectId,
          p_lender_org_id: lenderOrgId,
        });
        await refreshLenderGrants();
      } finally {
        setRevokingOrgId(null);
      }
    },
    [projectId, refreshLenderGrants]
  );

  const setPermissionForMember = useCallback(
    async (userId: string, permission: Permission | "none") => {
      if (!resourceIds) return;
      const member = permissions.find((p) => p.userId === userId);
      const fileOverrides = member?.grant.fileOverrides ?? [];
      for (const override of fileOverrides) {
        const { error: rpcError } = await supabase.rpc(
          "set_permission_for_resource",
          {
            p_resource_id: override.resource_id,
            p_user_id: userId,
            p_permission: permission,
          }
        );
        if (rpcError) {
          console.error("Failed to update file permission", rpcError);
          fetchAllData();
          return;
        }
      }
      for (const resourceType of RESOURCE_TYPES) {
        const resourceId = resourceIds[resourceType];
        if (!resourceId) continue;
        const { error: rpcError } = await supabase.rpc(
          "set_permission_for_resource",
          {
            p_resource_id: resourceId,
            p_user_id: userId,
            p_permission: permission,
          }
        );
        if (rpcError) {
          console.error("Failed to update permission", rpcError);
          fetchAllData();
          return;
        }
      }
      setPermissions((prev) =>
        prev.map((p) => {
          if (p.userId !== userId) return p;
          const perms =
            permission === "none"
              ? []
              : RESOURCE_TYPES.map((rt) => ({
                resource_type: rt,
                permission: permission as Permission,
              }));
          return {
            ...p,
            grant: {
              projectId,
              permissions: perms,
              fileOverrides: [],
            },
          };
        })
      );
    },
    [resourceIds, projectId, fetchAllData, permissions]
  );

  const handleLevelChange = useCallback(
    (userId: string, level: PermissionLevel) => {
      if (level === "custom") {
        setOpenMemberId(userId);
        ensureProjectDocsLoaded(projectId);
        return;
      }
      if (level === "none") {
        setOpenMemberId(null);
        setPermissionForMember(userId, "none");
        return;
      }
      setOpenMemberId(null);
      const perm: Permission = level === "edit" ? "edit" : "view";
      setPermissionForMember(userId, perm);
    },
    [projectId, setPermissionForMember, ensureProjectDocsLoaded]
  );

  const handleSetResourcePermission = useCallback(
    async (
      _projectId: string,
      resourceType: string,
      permission: Permission | null,
      skipCascade?: boolean
    ) => {
      if (!openMemberId || !resourceIds) return;
      const resourceId = resourceIds[resourceType];
      if (!resourceId) return;
      const { error } = await supabase.rpc("set_permission_for_resource", {
        p_resource_id: resourceId,
        p_user_id: openMemberId,
        p_permission: permission ?? "none",
      });
      if (error) {
        console.error("Failed to set resource permission", error);
        return;
      }

      if (skipCascade) {
        // Custom mode: update root permission in local state, keep file overrides intact
        setPermissions((prev) =>
          prev.map((p) => {
            if (p.userId !== openMemberId) return p;
            const others = p.grant.permissions.filter(
              (x) => x.resource_type !== resourceType
            );
            const perms = permission
              ? [...others, { resource_type: resourceType, permission }]
              : others;
            return {
              ...p,
              grant: { ...p.grant, permissions: perms },
            };
          })
        );
        return;
      }

      const isDocsRoot =
        resourceType === "PROJECT_DOCS_ROOT" ||
        resourceType === "BORROWER_DOCS_ROOT";
      const docs = projectDocsMap[projectId] ?? [];
      const docsUnderRoot =
        isDocsRoot
          ? docs.filter(
            (doc) =>
              getDocumentRootType(projectId, doc.parent_id) === resourceType
          )
          : [];
      const permValue = permission ?? "none";
      for (const doc of docsUnderRoot) {
        await supabase.rpc("set_permission_for_resource", {
          p_resource_id: doc.id,
          p_user_id: openMemberId,
          p_permission: permValue,
        });
      }
      const idsUnderRoot = new Set(docsUnderRoot.map((d) => d.id));
      setPermissions((prev) =>
        prev.map((p) => {
          if (p.userId !== openMemberId) return p;
          const others = p.grant.permissions.filter(
            (x) => x.resource_type !== resourceType
          );
          const perms = permission
            ? [...others, { resource_type: resourceType, permission }]
            : others;
          const fileOverrides = (p.grant.fileOverrides ?? []).filter(
            (o) => !idsUnderRoot.has(o.resource_id)
          );
          return {
            ...p,
            grant: { ...p.grant, permissions: perms, fileOverrides },
          };
        })
      );
    },
    [
      openMemberId,
      resourceIds,
      projectId,
      permissions,
      projectDocsMap,
      getDocumentRootType,
    ]
  );

  const handleSetProjectDocPermission = useCallback(
    async (_projectId: string, resourceId: string, permission: Permission | "none") => {
      if (!openMemberId) return;
      const docs = projectDocsMap[projectId] ?? [];
      const doc = docs.find((d) => d.id === resourceId);
      if (doc && getDocumentRootType(projectId, doc.parent_id) === "UNDERWRITING_TEMPLATES_ROOT") {
        return;
      }
      const { error } = await supabase.rpc("set_permission_for_resource", {
        p_resource_id: resourceId,
        p_user_id: openMemberId,
        p_permission: permission,
      });
      if (error) {
        console.error("Failed to set doc permission", error);
        return;
      }
      setPermissions((prev) =>
        prev.map((p) => {
          if (p.userId !== openMemberId) return p;
          const overrides = [...(p.grant.fileOverrides ?? [])];
          const idx = overrides.findIndex((o) => o.resource_id === resourceId);
          if (permission === "none" || permission === "view" || permission === "edit") {
            if (idx >= 0) overrides[idx] = { resource_id: resourceId, permission };
            else overrides.push({ resource_id: resourceId, permission });
          } else if (idx >= 0) overrides.splice(idx, 1);
          return { ...p, grant: { ...p.grant, fileOverrides: overrides } };
        })
      );
    },
    [
      openMemberId,
      projectId,
      projectDocsMap,
      getDocumentRootType,
    ]
  );

  if (error) {
    return (
      <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">Error loading lender matching</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button
            onClick={() => {
              setError(null);
              fetchAllData();
            }}
            className="mt-3 text-sm text-red-600 hover:text-red-700 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-gray-200 shadow-sm">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600 mb-2" />
        <p className="text-sm text-gray-600">Loading lender matching...</p>
      </div>
    );
  }

  const openMember = openMemberId
    ? permissions.find((p) => p.userId === openMemberId)
    : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">

      <div>
        <h3 className="text-md font-semibold text-gray-800 flex items-center mb-3">
          <Building2 size={16} className="mr-2" />
          Matched Lenders
        </h3>
        <div className="space-y-2">
          {lenderGrants.map((grant) => (
            <div
              key={grant.lender_org_id}
              className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-400" />
                <span className="font-medium text-gray-900">{grant.org_name}</span>
              </div>
              <button
                type="button"
                onClick={() => handleRevokeLender(grant.lender_org_id)}
                disabled={revokingOrgId === grant.lender_org_id}
                className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded disabled:opacity-50 flex items-center gap-1"
              >
                {revokingOrgId === grant.lender_org_id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Revoke
              </button>
            </div>
          ))}
          {lenderGrants.length === 0 && (
            <p className="text-sm text-gray-500 py-2">No lenders have been sent this package yet.</p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => setAddLenderModalOpen(true)}
          leftIcon={<PlusCircle className="h-4 w-4" />}
        >
          Send package to lender
        </Button>
      </div>

      {!isAdvisorView && (
      <div>
        <h3 className="text-md font-semibold text-gray-800 flex items-center mb-3">
          <Shield size={16} className="mr-2" />
          Member Permissions
        </h3>
        <div className="space-y-3">
          {permissions.map((p) => (
            <div
              key={p.userId}
              className="flex items-center justify-between p-2 rounded hover:bg-gray-50"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <User size={16} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{p.userName}</p>
                  <p className="text-sm text-gray-500">{p.userEmail}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Access:</span>
                <PillToggle
                  value={computeProjectLevel(
                    p.grant.permissions,
                    RESOURCE_TYPES,
                    (p.grant.fileOverrides && p.grant.fileOverrides.length > 0) ||
                    (p.grant.exclusions && p.grant.exclusions.length > 0)
                  )}
                  onChange={(val) => handleLevelChange(p.userId, val)}
                  size="xs"
                  showCustom={true}
                />
              </div>
            </div>
          ))}
          {permissions.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              No members to manage.
            </p>
          )}
        </div>
      </div>
      )}
      {isAdvisorView && (
        <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
          <p className="text-sm text-gray-600">
            Member permissions are managed by the project owner in their team settings.
          </p>
        </div>
      )}

      {openMember && (
        <div className="border-t pt-4">
          <ProjectPermissionDetailPanel
            projectId={projectId}
            projectName={activeProject?.projectName ?? "Project"}
            grant={openMember.grant}
            projectDocsMap={projectDocsMap}
            setResourcePermission={handleSetResourcePermission}
            setProjectDocPermission={handleSetProjectDocPermission}
            getDocumentRootType={getDocumentRootType}
            onClose={() => setOpenMemberId(null)}
          />
        </div>
      )}

      <AddLenderToProjectModal
        isOpen={addLenderModalOpen}
        onClose={() => setAddLenderModalOpen(false)}
        projectId={projectId}
        existingLenderOrgIds={lenderGrants.map((g) => g.lender_org_id)}
        onSuccess={refreshLenderGrants}
      />
    </div>
  );
};
