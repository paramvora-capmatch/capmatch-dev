import type { PostgrestError } from "https://esm.sh/@supabase/supabase-js@2";

export interface CreateProjectOptions {
  name: string;
  owner_org_id: string;
  creator_id: string;
  assigned_advisor_id?: string | null;
}

interface BorrowerRootsRow {
  borrower_resume_resource_id: string | null;
  borrower_docs_root_resource_id: string | null;
}

interface CloneBorrowerDocsParams {
  supabaseAdmin: any;
  ownerOrgId: string;
  sourceProjectId: string;
  targetProjectId: string;
  targetDocsRootId: string;
}

const BORROWER_DOCS_SUBDIR = "borrower-docs";
const PROJECT_DOCS_SUBDIR = "project-docs";
const PLACEHOLDER_BLOB = new Blob(["keep"], {
  type: "text/plain;charset=UTF-8",
});
const PLACEHOLDER_FILENAME = ".keep";

type ResourceRecord = {
  id: string;
  org_id: string;
  project_id: string;
  parent_id: string | null;
  resource_type: string;
  name: string;
  current_version_id: string | null;
};

type DocumentVersionRecord = {
  id: string;
  resource_id: string;
  version_number: number;
  storage_path: string;
  created_by: string | null;
  metadata: Record<string, unknown> | null;
  changes_url: string | null;
  status: string;
};

function buildStoragePath(
  projectId: string,
  resourceId: string,
  versionNumber: number,
  fileName: string,
  context: "borrower" | "project"
) {
  const safeName = fileName.replace(/\\/g, "");
  const base = context === "borrower" ? BORROWER_DOCS_SUBDIR : PROJECT_DOCS_SUBDIR;
  return `${projectId}/${base}/${resourceId}/v${versionNumber}_${safeName}`;
}

async function ensureStorageFolders(
  supabaseAdmin: any,
  bucketId: string,
  projectId: string
) {
  const paths = [
    `${projectId}/${PROJECT_DOCS_SUBDIR}/${PLACEHOLDER_FILENAME}`,
    `${projectId}/${BORROWER_DOCS_SUBDIR}/${PLACEHOLDER_FILENAME}`,
  ];

  for (const path of paths) {
    const { error } = await supabaseAdmin.storage
      .from(bucketId)
      .upload(path, PLACEHOLDER_BLOB, { upsert: true });
    if (error) {
      console.error(
        `[project-utils] Failed to create placeholder ${path}: ${error.message}`
      );
      throw error;
    }
  }
}

function parseCompletenessPercent(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function hasMeaningfulBorrowerContent(
  content: Record<string, unknown> | null | undefined
): boolean {
  if (!content) return false;

  const ignoredKeys = new Set([
    "completenessPercent",
    "createdAt",
    "updatedAt",
    "masterProfileId",
    "lastSyncedAt",
    "customFields",
  ]);

  return Object.entries(content).some(([key, value]) => {
    if (ignoredKeys.has(key)) return false;
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    if (value === null || value === undefined) return false;
    if (typeof value === "string") {
      return value.trim().length > 0;
    }
    if (typeof value === "number") {
      return true;
    }
    if (typeof value === "boolean") {
      return true;
    }
    if (typeof value === "object") {
      return Object.keys(value as Record<string, unknown>).length > 0;
    }
    return false;
  });
}

async function fetchMostCompleteBorrowerResume(
  supabaseAdmin: any,
  ownerOrgId: string,
  excludeProjectId: string
): Promise<{ content: Record<string, unknown>; projectId: string | null }> {
  const { data, error } = await supabaseAdmin
    .from("borrower_resumes")
    .select(
      `project_id, content, updated_at,
       projects!inner(id, owner_org_id, updated_at)`
    )
    .eq("projects.owner_org_id", ownerOrgId)
    .neq("project_id", excludeProjectId);

  if (error && error.code !== "PGRST116") {
    console.error(
      "[project-utils] Error fetching borrower resumes for duplication",
      error
    );
    return { content: {}, projectId: null };
  }

  const candidates = (data as Array<Record<string, any>> | null | undefined)
    ?.map((row) => {
      const content =
        (row?.content as Record<string, unknown> | null | undefined) ?? {};
      const completeness = parseCompletenessPercent(
        (content as Record<string, unknown>)?.completenessPercent
      );
      const updatedAt =
        row?.updated_at ?? row?.projects?.updated_at ?? null;

      return {
        projectId: row?.project_id as string | undefined,
        content,
        completeness,
        updatedAt: updatedAt ? new Date(updatedAt).getTime() : 0,
        hasMeaningfulContent: hasMeaningfulBorrowerContent(content),
      };
    })
    .filter(
      (row): row is {
        projectId: string;
        content: Record<string, unknown>;
        completeness: number;
        updatedAt: number;
        hasMeaningfulContent: boolean;
      } => Boolean(row?.projectId)
    ) ?? [];

  if (!candidates.length) {
    return { content: {}, projectId: null };
  }

  candidates.sort((a, b) => {
    if (b.completeness !== a.completeness) {
      return b.completeness - a.completeness;
    }
    return b.updatedAt - a.updatedAt;
  });

  const filledCandidate =
    candidates.find(
      (candidate) =>
        candidate.completeness > 0 && candidate.hasMeaningfulContent
    ) ?? candidates.find((candidate) => candidate.hasMeaningfulContent);

  const selected = filledCandidate ?? candidates[0];

  if (!selected || !selected.projectId) {
    return { content: {}, projectId: null };
  }

  return {
    content: selected.content,
    projectId: selected.projectId,
  };
}

function isDescendant(
  resourcesById: Map<string, ResourceRecord>,
  resource: ResourceRecord,
  rootId: string
) {
  let currentParent = resource.parent_id;
  while (currentParent) {
    if (currentParent === rootId) return true;
    const parent = resourcesById.get(currentParent);
    if (!parent) return false;
    currentParent = parent.parent_id;
  }
  return false;
}

export async function cloneBorrowerDocuments({
  supabaseAdmin,
  ownerOrgId,
  sourceProjectId,
  targetProjectId,
  targetDocsRootId,
}: CloneBorrowerDocsParams) {
  console.log(
    `[project-utils] Cloning borrower documents from ${sourceProjectId} to ${targetProjectId}`
  );

  const { data: sourceRoot, error: sourceRootError } = await supabaseAdmin
    .from("resources")
    .select("id")
    .eq("project_id", sourceProjectId)
    .eq("resource_type", "BORROWER_DOCS_ROOT")
    .maybeSingle();

  if (sourceRootError && sourceRootError.code !== "PGRST116") {
    console.error(
      "[project-utils] Unable to locate source borrower docs root",
      sourceRootError
    );
    return;
  }

  if (!sourceRoot) {
    console.log(
      "[project-utils] Source project has no borrower documents to clone"
    );
    return;
  }

  const { data: projectResources, error: projectResourcesError } =
    await supabaseAdmin
      .from("resources")
      .select("*")
      .eq("project_id", sourceProjectId);

  if (projectResourcesError) {
    console.error(
      "[project-utils] Failed to load borrower resource tree",
      projectResourcesError
    );
    return;
  }

  const resourcesById = new Map<string, ResourceRecord>(
    (projectResources as ResourceRecord[]).map((resource) => [resource.id, resource])
  );

  const descendants = (projectResources as ResourceRecord[]).filter(
    (resource) =>
      resource.id !== sourceRoot.id &&
      isDescendant(resourcesById, resource, sourceRoot.id)
  );

  if (!descendants.length) {
    console.log(
      "[project-utils] Source borrower docs root contains no child resources"
    );
    return;
  }

  const folders = descendants.filter(
    (resource) => resource.resource_type === "FOLDER"
  );
  const files = descendants.filter(
    (resource) => resource.resource_type === "FILE"
  );

  const idMap = new Map<string, string>();
  idMap.set(sourceRoot.id, targetDocsRootId);

  const processHierarchicalInsert = async (
    pending: ResourceRecord[],
    createCallback: (resource: ResourceRecord, parentId: string) => Promise<string>
  ) => {
    const queue = [...pending];
    while (queue.length) {
      let progress = false;
      for (let i = queue.length - 1; i >= 0; i--) {
        const item = queue[i];
        const parentId = item.parent_id ? idMap.get(item.parent_id) : null;
        if (!parentId) continue;

        const newId = await createCallback(item, parentId);
        idMap.set(item.id, newId);
        queue.splice(i, 1);
        progress = true;
      }

      if (!progress) {
        console.warn(
          "[project-utils] Could not resolve parent relationships for resources",
          queue.map((f) => ({ id: f.id, parent: f.parent_id }))
        );
        break;
      }
    }
  };

  await processHierarchicalInsert(folders, async (folder, parentId) => {
    const { data, error } = await supabaseAdmin
      .from("resources")
      .insert({
        org_id: ownerOrgId,
        project_id: targetProjectId,
        parent_id: parentId,
        resource_type: "FOLDER",
        name: folder.name,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }
    return (data as ResourceRecord).id;
  });

  const fileIds = files.map((file) => file.id);
  const versionsByResource = new Map<string, DocumentVersionRecord[]>();

  if (fileIds.length) {
    const { data: versions, error: versionsError } = await supabaseAdmin
      .from("document_versions")
      .select("*")
      .in("resource_id", fileIds)
      .order("version_number", { ascending: true });

    if (versionsError) {
      throw versionsError;
    }

    (versions as DocumentVersionRecord[]).forEach((version) => {
      const list = versionsByResource.get(version.resource_id) ?? [];
      list.push(version);
      versionsByResource.set(version.resource_id, list);
    });
  }

  await processHierarchicalInsert(files, async (file, parentId) => {
    const { data: newFile, error: newFileError } = await supabaseAdmin
      .from("resources")
      .insert({
        org_id: ownerOrgId,
        project_id: targetProjectId,
        parent_id: parentId,
        resource_type: "FILE",
        name: file.name,
      })
      .select()
      .single();

    if (newFileError) {
      throw newFileError;
    }

    const newResource = newFile as ResourceRecord;
    const versions = versionsByResource.get(file.id) ?? [];
    let currentVersionId: string | null = null;

    for (const version of versions) {
      const { data: insertedVersion, error: insertVersionError } =
        await supabaseAdmin
          .from("document_versions")
          .insert({
            resource_id: newResource.id,
            created_by: version.created_by,
            metadata: version.metadata,
            changes_url: version.changes_url,
            status: version.status ?? "active",
            storage_path: "pending",
          })
          .select()
          .single();

      if (insertVersionError) {
        throw insertVersionError;
      }

      const resolvedVersion = insertedVersion as DocumentVersionRecord;
      const storagePath = buildStoragePath(
        targetProjectId,
        newResource.id,
        resolvedVersion.version_number,
        file.name,
        "borrower"
      );

      if (version.storage_path) {
        const { error: copyError } = await supabaseAdmin.storage
          .from(ownerOrgId)
          .copy(version.storage_path, storagePath);

        if (copyError) {
          throw copyError;
        }
      }

      const { error: updateVersionError } = await supabaseAdmin
        .from("document_versions")
        .update({
          storage_path: storagePath,
          metadata: version.metadata,
          changes_url: version.changes_url,
          status: version.status ?? "active",
        })
        .eq("id", resolvedVersion.id);

      if (updateVersionError) {
        throw updateVersionError;
      }

      if (file.current_version_id === version.id) {
        currentVersionId = resolvedVersion.id;
      }
    }

    if (currentVersionId) {
      const { error: resourceUpdateError } = await supabaseAdmin
        .from("resources")
        .update({ current_version_id: currentVersionId })
        .eq("id", newResource.id);

      if (resourceUpdateError) {
        throw resourceUpdateError;
      }
    }

    return newResource.id;
  });

  console.log("[project-utils] Borrower documents cloned successfully");
}

export async function clearBorrowerDocuments(
  supabaseAdmin: any,
  targetProjectId: string,
  targetDocsRootId: string,
  bucketId: string
) {
  console.log(
    `[project-utils] Clearing borrower documents for project ${targetProjectId}`
  );

  const { data: projectResources, error: projectResourcesError } =
    await supabaseAdmin
      .from("resources")
      .select("*")
      .eq("project_id", targetProjectId);

  if (projectResourcesError) {
    throw projectResourcesError;
  }

  const resourcesById = new Map<string, ResourceRecord>(
    (projectResources as ResourceRecord[]).map((resource) => [resource.id, resource])
  );

  const descendants = (projectResources as ResourceRecord[]).filter(
    (resource) =>
      resource.id !== targetDocsRootId &&
      isDescendant(resourcesById, resource, targetDocsRootId)
  );

  if (!descendants.length) {
    return;
  }

  const fileIds = descendants
    .filter((resource) => resource.resource_type === "FILE")
    .map((resource) => resource.id);

  if (fileIds.length) {
    const { data: versions, error: versionsError } = await supabaseAdmin
      .from("document_versions")
      .select("storage_path")
      .in("resource_id", fileIds);

    if (versionsError) {
      throw versionsError;
    }

    const storagePaths = (versions || [])
      .map((v) => v.storage_path)
      .filter((path): path is string => Boolean(path));

    if (storagePaths.length) {
      const { error: removeError } = await supabaseAdmin.storage
        .from(bucketId)
        .remove(storagePaths);

      if (removeError) {
        throw removeError;
      }
    }
  }

  const descendantIds = descendants.map((resource) => resource.id);
  const { error: deleteError } = await supabaseAdmin
    .from("resources")
    .delete()
    .in("id", descendantIds);

  if (deleteError) {
    throw deleteError;
  }
}

export async function createProjectWithResumeAndStorage(
  supabaseAdmin: any,
  options: CreateProjectOptions
) {
  const { name, owner_org_id, assigned_advisor_id } = options;
  console.log(
    `[project-utils] Creating project: ${name} for org: ${owner_org_id}`
  );

  console.log("[project-utils] Step 1: Creating project record");
  const { data: project, error: projectError } = await supabaseAdmin
    .from("projects")
    .insert({ name, owner_org_id, assigned_advisor_id })
    .select()
    .single();
  if (projectError) {
    console.error(
      `[project-utils] Project creation failed: ${JSON.stringify(projectError)}`
    );
    throw new Error(`Project creation failed: ${projectError.message}`);
  }

  console.log("[project-utils] Step 2: Creating project resume");
  const { error: resumeError } = await supabaseAdmin
    .from("project_resumes")
    .insert({ project_id: project.id, content: {} });
  if (resumeError) {
    await supabaseAdmin.from("projects").delete().eq("id", project.id);
    throw new Error(
      `Project resume creation failed: ${resumeError.message}`
    );
  }

  console.log("[project-utils] Step 3: Preparing storage directories");
  try {
    await ensureStorageFolders(supabaseAdmin, owner_org_id, project.id);
  } catch (storageError) {
    await supabaseAdmin.from("projects").delete().eq("id", project.id);
    throw new Error(
      `Storage folder creation failed: ${(storageError as PostgrestError)?.message ?? storageError}`
    );
  }

  console.log("[project-utils] Step 4: Creating PROJECT_RESUME resource");
  const { data: projectResumeResource, error: projectResumeError } =
    await supabaseAdmin
      .from("resources")
      .insert({
        org_id: owner_org_id,
        project_id: project.id,
        resource_type: "PROJECT_RESUME",
        name: `${name} Resume`,
      })
      .select()
      .single();

  if (projectResumeError) {
    await supabaseAdmin.from("projects").delete().eq("id", project.id);
    throw new Error(
      `Project resume resource creation failed: ${projectResumeError.message}`
    );
  }

  console.log("[project-utils] Step 5: Creating PROJECT_DOCS_ROOT resource");
  const { data: projectDocsRootResource, error: projectDocsRootError } =
    await supabaseAdmin
      .from("resources")
      .insert({
        org_id: owner_org_id,
        project_id: project.id,
        resource_type: "PROJECT_DOCS_ROOT",
        name: `${name} Documents`,
      })
      .select()
      .single();

  if (projectDocsRootError) {
    await supabaseAdmin.from("projects").delete().eq("id", project.id);
    throw new Error(
      `Project docs root resource creation failed: ${projectDocsRootError.message}`
    );
  }

  console.log("[project-utils] Step 5.5: Ensuring borrower root resources");
  const { data: borrowerRoots, error: borrowerRootError } =
    await supabaseAdmin.rpc("ensure_project_borrower_roots", {
      p_project_id: project.id,
    });

  if (borrowerRootError) {
    await supabaseAdmin.from("projects").delete().eq("id", project.id);
    throw new Error(
      `Failed to ensure borrower root resources: ${borrowerRootError.message}`
    );
  }

  const borrowerRootRow = (borrowerRoots as BorrowerRootsRow[] | null)?.[0];

  const { content: borrowerResumeContent, projectId: sourceResumeProjectId } =
    await fetchMostCompleteBorrowerResume(
      supabaseAdmin,
      owner_org_id,
      project.id
    );

  console.log("[project-utils] Step 6: Creating borrower resume record");
  const { error: borrowerResumeInsertError } = await supabaseAdmin
    .from("borrower_resumes")
    .insert({ project_id: project.id, content: borrowerResumeContent });

  if (borrowerResumeInsertError) {
    await supabaseAdmin.from("projects").delete().eq("id", project.id);
    throw new Error(
      `Failed to create borrower resume: ${borrowerResumeInsertError.message}`
    );
  }

  if (
    sourceResumeProjectId &&
    borrowerRootRow?.borrower_docs_root_resource_id
  ) {
    try {
      await cloneBorrowerDocuments({
        supabaseAdmin,
        ownerOrgId: owner_org_id,
        sourceProjectId: sourceResumeProjectId,
        targetProjectId: project.id,
        targetDocsRootId: borrowerRootRow.borrower_docs_root_resource_id,
      });
    } catch (cloneError) {
      console.error(
        "[project-utils] Failed to clone borrower documents",
        cloneError
      );
    }
  }

  const permissionTargets: string[] = [
    (projectDocsRootResource as ResourceRecord).id,
    (projectResumeResource as ResourceRecord).id,
  ];

  if (borrowerRootRow?.borrower_docs_root_resource_id) {
    permissionTargets.push(borrowerRootRow.borrower_docs_root_resource_id);
  }
  if (borrowerRootRow?.borrower_resume_resource_id) {
    permissionTargets.push(borrowerRootRow.borrower_resume_resource_id);
  }

  const ownerIds = new Set<string>([options.creator_id]);
  try {
    const { data: ownerMembers, error: ownerMembersError } = await supabaseAdmin
      .from("org_members")
      .select("user_id")
      .eq("org_id", owner_org_id)
      .eq("role", "owner");

    if (ownerMembersError) {
      console.error(
        "[project-utils] Failed to load org owners for project grants",
        ownerMembersError
      );
    } else {
      for (const member of ownerMembers as Array<{ user_id: string }> | null | undefined) {
        if (member?.user_id) {
          ownerIds.add(member.user_id);
        }
      }
    }
  } catch (ownerFetchError) {
    console.error(
      "[project-utils] Unexpected error loading org owners",
      ownerFetchError
    );
  }

  console.log("[project-utils] Step 7: Granting org owners project access");
  for (const ownerId of ownerIds) {
    const { error: grantError } = await supabaseAdmin
      .from("project_access_grants")
      .upsert(
        {
          project_id: project.id,
          org_id: owner_org_id,
          user_id: ownerId,
          granted_by: options.creator_id,
        },
        { onConflict: "project_id,user_id" }
      );

    if (grantError) {
      await supabaseAdmin.from("projects").delete().eq("id", project.id);
      throw new Error(
        `Failed to grant project access to owner ${ownerId}: ${grantError.message}`
      );
    }

    console.log(
      `[project-utils] Granted project access to owner ${ownerId} (project ${project.id})`
    );

    for (const resourceId of permissionTargets) {
      const { error: permError } = await supabaseAdmin
        .from("permissions")
        .upsert(
          {
            resource_id: resourceId,
            user_id: ownerId,
            permission: "edit",
            granted_by: options.creator_id,
          },
          { onConflict: "resource_id,user_id" }
        );

      if (permError) {
        await supabaseAdmin.from("projects").delete().eq("id", project.id);
        throw new Error(
          `Failed to grant permissions on resource ${resourceId} for owner ${ownerId}: ${permError.message}`
        );
      }
    }
  }

  console.log("[project-utils] Step 8.5: Creating default chat thread");
  const { data: chatThread, error: chatThreadError } = await supabaseAdmin
    .from("chat_threads")
    .insert({ project_id: project.id, topic: "General" })
    .select()
    .single();

  if (chatThreadError) {
    console.error(
      "[project-utils] Default chat thread creation failed",
      chatThreadError
    );
  } else {
    const participantIds = new Set<string>(ownerIds);
    if (options.assigned_advisor_id) {
      participantIds.add(options.assigned_advisor_id);
    }

    const participants = Array.from(participantIds).map((userId) => ({
      thread_id: chatThread.id,
      user_id: userId,
    }));

    const { error: participantsError } = await supabaseAdmin
      .from("chat_thread_participants")
      .insert(participants);

    if (participantsError) {
      console.error(
        "[project-utils] Failed to add participants to default thread",
        participantsError
      );
    }
  }

  if (assigned_advisor_id) {
    console.log("[project-utils] Step 9: Granting advisor permissions");
    const { error: advisorPermError } = await supabaseAdmin.rpc(
      "grant_advisor_project_permissions",
      {
        p_project_id: project.id,
        p_advisor_id: assigned_advisor_id,
        p_granted_by_id: options.creator_id,
      }
    );

    if (advisorPermError) {
      console.error(
        "[project-utils] Failed to grant advisor permissions",
        advisorPermError
      );
    }
  }

  console.log(
    `[project-utils] Project creation completed successfully: ${project.id}`
  );
  return {
    project,
    borrowerResumeContent,
    borrowerResumeSourceProjectId: sourceResumeProjectId,
  };
}
