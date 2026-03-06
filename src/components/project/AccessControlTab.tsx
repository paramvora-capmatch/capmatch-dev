// src/components/project/AccessControlTab.tsx
"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
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
import { Loader2, Building2, PlusCircle, Trash2, Zap, RefreshCw, AlertCircle, Trophy, Clock, BarChart3 } from "lucide-react";
import { useMatchmaking, type MatchScore } from "@/hooks/useMatchmaking";
import { MatchmakingResultsLayout } from "@/components/matchmaking/MatchmakingResultsLayout";
import { MatchmakingDials, type MatchmakingDialsValues } from "@/components/matchmaking/MatchmakingDials";

export interface MatchmakingRun {
  id: string;
  label: string;
  projectResumeVersionId: string | null;
  projectResumeVersionNumber: number | null;
  createdAt: string;
  matchScores: MatchScore[];
}

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
  const [selectedLenderId, setSelectedLenderId] = useState<string | null>(null);
  const [matchRuns, setMatchRuns] = useState<MatchmakingRun[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const runJustCompletedRef = useRef(false);

  const {
    isRunning: matchRunning,
    isLoading: matchLoading,
    visualizationData,
    matchScores,
    totalLenders: matchedLenderCount,
    topMatchName,
    topMatchScore,
    lastRunAt,
    error: matchError,
    runMatchmaking,
  } = useMatchmaking(projectId);

  // When a matchmaking run completes, add it to run history (mock iterations)
  useEffect(() => {
    if (!matchRunning && runJustCompletedRef.current && matchScores.length > 0) {
      runJustCompletedRef.current = false;
      const runNumber = matchRuns.length + 1;
      const newRun: MatchmakingRun = {
        id: `run-${Date.now()}`,
        label: `Run ${runNumber} (v${runNumber})`,
        projectResumeVersionId: null,
        projectResumeVersionNumber: runNumber,
        createdAt: new Date().toISOString(),
        matchScores: [...matchScores],
      };
      setMatchRuns((prev) => [...prev, newRun]);
      setActiveRunId(newRun.id);
    }
  }, [matchRunning, matchScores.length, matchRuns.length]);

  const activeRun = activeRunId ? matchRuns.find((r) => r.id === activeRunId) : null;
  const scoresToShow = activeRun?.matchScores ?? matchScores;
  const summaryTopScore = scoresToShow.length > 0 ? scoresToShow[0] : null;
  const summaryTopName = summaryTopScore?.lender_name ?? summaryTopScore?.lender_lei ?? topMatchName;
  const summaryTopValue = summaryTopScore?.total_score ?? topMatchScore;

  const dialInitialValues: Partial<MatchmakingDialsValues> | undefined = activeProject
    ? {
        loanAmountRequested: activeProject.loanAmountRequested ?? undefined,
        stabilizedValue: (activeProject as any).stabilizedValue ?? undefined,
        purchasePrice: activeProject.purchasePrice ?? undefined,
        targetLtvPercent: activeProject.targetLtvPercent ?? undefined,
        dscr: (activeProject as any).dscr ?? undefined,
        propertyNoiT12: activeProject.propertyNoiT12 ?? undefined,
        interestRate: (activeProject as any).interestRate ?? undefined,
        totalResidentialUnits: activeProject.totalResidentialUnits ?? undefined,
        requestedTerm: activeProject.requestedTerm ?? undefined,
        interestOnlyPeriodMonths: activeProject.interestOnlyPeriodMonths ?? undefined,
        projectPhase: activeProject.projectPhase ?? undefined,
        propertyAddressState: activeProject.propertyAddressState ?? undefined,
        propertyAddressCounty: activeProject.propertyAddressCounty ?? undefined,
        propertyAddressCity: activeProject.propertyAddressCity ?? undefined,
        propertyAddressZip: activeProject.propertyAddressZip ?? undefined,
        msaName: (activeProject as any).msaName ?? undefined,
      }
    : undefined;

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

  const formatDate = (iso: string | null) => {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-md font-semibold text-gray-800 flex items-center">
            <Building2 size={16} className="mr-2" />
            Matched Lenders
          </h3>
          {isAdvisorView && (
            <button
              onClick={() => {
                runJustCompletedRef.current = true;
                runMatchmaking();
              }}
              disabled={matchRunning}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {matchRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running Engine...
                </>
              ) : visualizationData ? (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Re-run Matchmaking
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Run Matchmaking
                </>
              )}
            </button>
          )}
        </div>

        {/* Matchmaking error */}
        {matchError && (
          <div className="flex items-start gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Matchmaking failed</p>
              <p className="text-red-600 mt-0.5">{matchError}</p>
            </div>
          </div>
        )}

        {/* Running indicator */}
        {matchRunning && (
          <div className="flex flex-col items-center justify-center py-16 px-6 mb-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-gray-200 rounded-full" />
              <div className="absolute inset-0 w-16 h-16 border-4 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
            </div>
            <p className="text-sm text-gray-700 mt-4 font-medium">Running matchmaking engine...</p>
            <p className="text-xs text-gray-500 mt-1">Profiling lenders from HMDA data and scoring against your deal</p>
          </div>
        )}

        {/* Financial dials: tune deal parameters for matchmaking (advisor only) */}
        <MatchmakingDials
          initialValues={dialInitialValues}
          onRunMatchmaking={() => {
            runJustCompletedRef.current = true;
            runMatchmaking();
          }}
          disabled={matchRunning}
          isAdvisorView={isAdvisorView}
        />

        {/* Matchmaking runs: always visible; empty state when no runs yet */}
        {isAdvisorView && !matchRunning && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-medium text-gray-600">Matchmaking run:</span>
            {matchRuns.length === 0 ? (
              <span className="text-sm text-gray-500">No runs yet. Run matchmaking below to create your first run.</span>
            ) : (
              <select
                value={activeRunId ?? ""}
                onChange={(e) => setActiveRunId(e.target.value || null)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {matchRuns.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Summary bar */}
        {(scoresToShow.length > 0 || visualizationData) && !matchRunning && (
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-medium text-gray-600">
              <BarChart3 className="h-3.5 w-3.5" />
              {scoresToShow.length} lenders scored
            </div>
            {summaryTopName && summaryTopValue !== null && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-lg text-xs font-medium text-emerald-700">
                <Trophy className="h-3.5 w-3.5" />
                Top: {summaryTopName} ({summaryTopValue.toFixed(1)}/100)
              </div>
            )}
            {lastRunAt && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-medium text-gray-500">
                <Clock className="h-3.5 w-3.5" />
                {formatDate(lastRunAt)}
              </div>
            )}
          </div>
        )}

        {/* Two-panel: lender list (left) + lender report with improvement tips (right) */}
        {scoresToShow.length > 0 && !matchRunning && (
          <MatchmakingResultsLayout
            matchScores={scoresToShow}
            selectedLenderId={selectedLenderId}
            onSelectLender={setSelectedLenderId}
          />
        )}

        {/* Empty state: no matches yet, not loading, advisor view */}
        {isAdvisorView && !matchLoading && matchScores.length === 0 && !visualizationData && !matchRunning && !matchError && lenderGrants.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 px-6 mb-4 bg-gray-50 rounded-xl border border-gray-200 border-dashed">
            <BarChart3 className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500 text-center max-w-sm">
              No matchmaking results yet. Click &quot;Run Matchmaking&quot; to score lenders against this deal
              using HMDA multifamily lending data.
            </p>
          </div>
        )}

        {/* Manually granted lenders */}
        {lenderGrants.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Sent Packages</p>
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
          </div>
        )}

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

      <AddLenderToProjectModal
        isOpen={addLenderModalOpen}
        onClose={() => setAddLenderModalOpen(false)}
        projectId={projectId}
        existingLenderOrgIds={lenderGrants.map((g) => g.lender_org_id)}
        onSuccess={refreshLenderGrants}
      />
    </div>
    </div>
  );
};
