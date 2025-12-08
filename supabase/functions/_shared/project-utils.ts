import type { PostgrestError } from "https://esm.sh/@supabase/supabase-js@2";

// Hardcoded field-to-subsection mapping (matching enhanced-project-form.schema.json)
const FIELD_TO_SUBSECTION: Record<string, string> = {
	// basic-info section subsections
	projectName: "project-identity",
	propertyAddressStreet: "project-identity",
	propertyAddressCity: "project-identity",
	propertyAddressState: "project-identity",
	propertyAddressZip: "project-identity",
	propertyAddressCounty: "project-identity",
	dealStatus: "project-identity",
	assetType: "classification",
	constructionType: "classification",
	projectPhase: "classification",
	projectDescription: "classification",
	parcelNumber: "classification",
	zoningDesignation: "classification",
};

// Field-to-section mapping
const FIELD_TO_SECTION: Record<string, string> = {
	projectName: "basic-info",
	propertyAddressStreet: "basic-info",
	propertyAddressCity: "basic-info",
	propertyAddressState: "basic-info",
	propertyAddressZip: "basic-info",
	propertyAddressCounty: "basic-info",
	parcelNumber: "basic-info",
	zoningDesignation: "basic-info",
	primaryAssetClass: "basic-info",
	constructionType: "basic-info",
	groundbreakingDate: "basic-info",
	completionDate: "basic-info",
	totalDevelopmentCost: "basic-info",
	loanAmountRequested: "basic-info",
	loanType: "basic-info",
	requestedLoanTerm: "basic-info",
	masterPlanName: "basic-info",
	phaseNumber: "basic-info",
	projectDescription: "basic-info",
	projectPhase: "basic-info",
	assetType: "basic-info",
	dealStatus: "basic-info",
};

// Helper to get subsection for a field
function getSubsectionForField(
	fieldId: string,
	sectionId: string
): string | null {
	return FIELD_TO_SUBSECTION[fieldId] || null;
}

// Group flat data by sections and subsections
function groupBySections(
	flatData: Record<string, unknown>
): Record<string, any> {
	// Known section IDs from the schema
	const knownSectionIds = [
		"basic-info",
		"property-specs",
		"financial-summary",
		"borrower-info",
		"online-presence",
		"project-details",
	];

	// Check if data is already in grouped format (has known section IDs as top-level keys)
	const topLevelKeys = Object.keys(flatData);
	const isAlreadyGrouped = topLevelKeys.some((key) => {
		if (knownSectionIds.includes(key)) {
			// Check if the value is an object (section structure) not a primitive field
			const value = flatData[key];
			return (
				value !== null &&
				typeof value === "object" &&
				!Array.isArray(value)
			);
		}
		return false;
	});

	if (isAlreadyGrouped) {
		console.log(
			`[project-utils] Data is already grouped (detected section IDs: ${topLevelKeys
				.filter((k) => knownSectionIds.includes(k))
				.join(", ")}), returning as-is`
		);
		return flatData as Record<string, any>;
	}

	const grouped: Record<string, any> = {};

	const keys = Object.keys(flatData);
	console.log(
		`[project-utils] groupBySections called with ${keys.length} keys: ${keys.join(", ")}`
	);

	for (const [fieldId, fieldValue] of Object.entries(flatData)) {
		// Skip special/metadata fields
		if (
			fieldId.startsWith("_") ||
			fieldId === "projectSections" ||
			fieldId === "borrowerSections" ||
			fieldId === "completenessPercent"
		) {
			continue;
		}

		// Check if this looks like a subsection ID (not a field ID)
		// Subsection IDs like "project-identity" should not be processed as fields
		// MUST check this BEFORE checking FIELD_TO_SECTION to avoid placing subsection IDs in "unknown"
		const hasDash = fieldId.includes("-");
		const notInFieldMap = !FIELD_TO_SECTION[fieldId];
		const isObject = typeof fieldValue === "object" && fieldValue !== null && !Array.isArray(fieldValue);
		
		console.log(
			`[project-utils] Processing key '${fieldId}': hasDash=${hasDash}, notInFieldMap=${notInFieldMap}, isObject=${isObject}`
		);
		
		if (hasDash && notInFieldMap && isObject) {
			// This is a subsection ID with nested field data - process the nested fields
			console.log(
				`[project-utils] Found subsection ID '${fieldId}' as key, processing nested fields`
			);

			// Determine which section this subsection belongs to
			let targetSectionId: string | null = null;
			if (fieldId === "project-identity") {
				targetSectionId = "basic-info";
			} else if (fieldId === "classification") {
				targetSectionId = "basic-info";
			} else {
				// Try to find the section by checking which fields in this subsection belong to which section
				const nestedFields = Object.keys(fieldValue as Record<string, unknown>);
				if (nestedFields.length > 0) {
					const firstFieldSection = FIELD_TO_SECTION[nestedFields[0]];
					if (firstFieldSection) {
						targetSectionId = firstFieldSection;
					}
				}
			}

			if (!targetSectionId) {
				console.warn(
					`[project-utils] Could not determine section for subsection '${fieldId}', skipping`
				);
				continue; // Skip this subsection entirely
			}

			// Process nested fields and place them in the correct section
			for (const [nestedFieldId, nestedValue] of Object.entries(
				fieldValue as Record<string, unknown>
			)) {
				const nestedSectionId =
					FIELD_TO_SECTION[nestedFieldId] || targetSectionId;
				if (!grouped[nestedSectionId]) {
					grouped[nestedSectionId] = {};
				}
				const nestedSubsectionId = getSubsectionForField(
					nestedFieldId,
					nestedSectionId
				);
				if (nestedSubsectionId) {
					if (!grouped[nestedSectionId][nestedSubsectionId]) {
						grouped[nestedSectionId][nestedSubsectionId] = {};
					}
					grouped[nestedSectionId][nestedSubsectionId][
						nestedFieldId
					] = nestedValue;
				} else {
					grouped[nestedSectionId][nestedFieldId] = nestedValue;
				}
			}
			continue; // CRITICAL: Skip creating "unknown" entry for the subsection ID itself
		}

		const sectionId = FIELD_TO_SECTION[fieldId];
		if (sectionId) {
			if (!grouped[sectionId]) {
				grouped[sectionId] = {};
			}

			// Check if this section has subsections
			const subsectionId = getSubsectionForField(fieldId, sectionId);

			if (subsectionId) {
				// Section has subsections - nest field in subsection
				if (!grouped[sectionId][subsectionId]) {
					grouped[sectionId][subsectionId] = {};
				}
				console.log(
					`[project-utils] Placing field '${fieldId}' in '${sectionId}' > '${subsectionId}'`
				);
				grouped[sectionId][subsectionId][fieldId] = fieldValue;
			} else {
				// Section has no subsections - place field directly in section
				console.log(
					`[project-utils] Placing field '${fieldId}' in '${sectionId}' (no subsection)`
				);
				grouped[sectionId][fieldId] = fieldValue;
			}
		} else {
			// Field not found in mapping
			// BUT: if it's a subsection ID that we missed, don't put it in unknown
			// Check again with more lenient conditions
			if (
				fieldId.includes("-") &&
				typeof fieldValue === "object" &&
				fieldValue !== null &&
				!Array.isArray(fieldValue)
			) {
				// This might be a subsection ID we missed - try to process it
				console.warn(
					`[project-utils] Field '${fieldId}' not in FIELD_TO_SECTION but looks like subsection ID, attempting to process nested fields`
				);
				
				let targetSectionId: string | null = null;
				if (fieldId === "project-identity") {
					targetSectionId = "basic-info";
				} else if (fieldId === "classification") {
					targetSectionId = "basic-info";
				} else {
					const nestedFields = Object.keys(fieldValue as Record<string, unknown>);
					if (nestedFields.length > 0) {
						const firstFieldSection = FIELD_TO_SECTION[nestedFields[0]];
						if (firstFieldSection) {
							targetSectionId = firstFieldSection;
						}
					}
				}
				
				if (targetSectionId) {
					// Process nested fields
					for (const [nestedFieldId, nestedValue] of Object.entries(
						fieldValue as Record<string, unknown>
					)) {
						const nestedSectionId =
							FIELD_TO_SECTION[nestedFieldId] || targetSectionId;
						if (!grouped[nestedSectionId]) {
							grouped[nestedSectionId] = {};
						}
						const nestedSubsectionId = getSubsectionForField(
							nestedFieldId,
							nestedSectionId
						);
						if (nestedSubsectionId) {
							if (!grouped[nestedSectionId][nestedSubsectionId]) {
								grouped[nestedSectionId][nestedSubsectionId] = {};
							}
							grouped[nestedSectionId][nestedSubsectionId][
								nestedFieldId
							] = nestedValue;
						} else {
							grouped[nestedSectionId][nestedFieldId] = nestedValue;
						}
					}
					continue; // Skip placing in unknown
				}
			}
			
			// Field not found in mapping - log for debugging
			console.warn(
				`[project-utils] Field '${fieldId}' not found in FIELD_TO_SECTION mapping, placing in 'unknown'`
			);
			if (!grouped["unknown"]) grouped["unknown"] = {};
			grouped["unknown"][fieldId] = fieldValue;
		}
	}

	return grouped;
}

export interface CreateProjectOptions {
	name: string;
	owner_org_id: string;
	creator_id: string;
	assigned_advisor_id?: string | null;
	address?: string;
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
const SITE_IMAGES_SUBDIR = "site-images";
const ARCHITECTURAL_DIAGRAMS_SUBDIR = "architectural-diagrams";
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
	context: "borrower" | "project",
	userId?: string | null
) {
	const safeName = fileName.replace(/\\/g, "");
	const base =
		context === "borrower" ? BORROWER_DOCS_SUBDIR : PROJECT_DOCS_SUBDIR;
	const userSuffix = userId ? `_user${userId}` : "";
	return `${projectId}/${base}/${resourceId}/v${versionNumber}${userSuffix}_${safeName}`;
}

async function ensureStorageFolders(
	supabaseAdmin: any,
	bucketId: string,
	projectId: string
) {
	const paths = [
		`${projectId}/${PROJECT_DOCS_SUBDIR}/${PLACEHOLDER_FILENAME}`,
		`${projectId}/${BORROWER_DOCS_SUBDIR}/${PLACEHOLDER_FILENAME}`,
		`${projectId}/${SITE_IMAGES_SUBDIR}/${PLACEHOLDER_FILENAME}`,
		`${projectId}/${ARCHITECTURAL_DIAGRAMS_SUBDIR}/${PLACEHOLDER_FILENAME}`,
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

	const candidates =
		(data as Array<Record<string, any>> | null | undefined)
			?.map((row) => {
				const content =
					(row?.content as
						| Record<string, unknown>
						| null
						| undefined) ?? {};
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
				(
					row
				): row is {
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
		(projectResources as ResourceRecord[]).map((resource) => [
			resource.id,
			resource,
		])
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
		createCallback: (
			resource: ResourceRecord,
			parentId: string
		) => Promise<string>
	) => {
		const queue = [...pending];
		while (queue.length) {
			let progress = false;
			for (let i = queue.length - 1; i >= 0; i--) {
				const item = queue[i];
				const parentId = item.parent_id
					? idMap.get(item.parent_id)
					: null;
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
				"borrower",
				version.created_by
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
		(projectResources as ResourceRecord[]).map((resource) => [
			resource.id,
			resource,
		])
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
	const { name, owner_org_id, assigned_advisor_id, address } = options;
	console.log(
		`[project-utils] Creating project: ${name} for org: ${owner_org_id}`
	);

	// Build initial project resume content with fixed structure
	// Directly create the correct nested structure - no grouping logic needed
	const initialResumeContent: Record<string, any> = {
		"basic-info": {
			"project-identity": {
				projectName: {
					value: name,
					source: {
						type: "user_input",
					},
					warnings: [],
					other_values: [],
				},
			},
		},
	};

	// Add address if provided
	if (address && typeof address === "string" && address.trim().length > 0) {
		initialResumeContent["basic-info"]["project-identity"]["propertyAddressStreet"] = {
			value: address.trim(),
			source: {
				type: "user_input",
			},
			warnings: [],
			other_values: [],
		};
	}

	console.log(
		`[project-utils] Initial resume content structure: ${JSON.stringify(
			initialResumeContent,
			null,
			2
		)}`
	);

	console.log("[project-utils] Step 1: Creating project record");
	const { data: project, error: projectError } = await supabaseAdmin
		.from("projects")
		.insert({ name, owner_org_id, assigned_advisor_id })
		.select()
		.single();
	if (projectError) {
		console.error(
			`[project-utils] Project creation failed: ${JSON.stringify(
				projectError
			)}`
		);
		throw new Error(`Project creation failed: ${projectError.message}`);
	}

	// Cleanup helper (defined early for use in error handling)
	const cleanupProject = async () => {
		await supabaseAdmin.from("projects").delete().eq("id", project.id);
	};

	// Phase 1: Parallelize independent operations after project creation
	console.log(
		"[project-utils] Phase 1: Creating project resources in parallel"
	);
	let resumeResult,
		storageResult,
		projectResumeResourceResult,
		projectDocsRootResourceResult,
		borrowerRootsResult,
		borrowerResumeFetchResult,
		ownerMembersResult;

	try {
		[
			resumeResult,
			storageResult,
			projectResumeResourceResult,
			projectDocsRootResourceResult,
			borrowerRootsResult,
			borrowerResumeFetchResult,
			ownerMembersResult,
		] = await Promise.all([
			// Step 2: Create project resume with initial content (name and address if provided)
			supabaseAdmin
				.from("project_resumes")
				.insert({
					project_id: project.id,
					content: initialResumeContent,
					created_by: options.creator_id,
				})
				.then(({ error }) => {
					if (error) {
						throw new Error(
							`Project resume creation failed: ${error.message}`
						);
					}
					return { success: true };
				}),
			// Step 3: Prepare storage directories
			ensureStorageFolders(supabaseAdmin, owner_org_id, project.id).catch(
				(storageError) => {
					throw new Error(
						`Storage folder creation failed: ${
							(storageError as PostgrestError)?.message ??
							storageError
						}`
					);
				}
			),
			// Step 4: Create PROJECT_RESUME resource
			supabaseAdmin
				.from("resources")
				.insert({
					org_id: owner_org_id,
					project_id: project.id,
					resource_type: "PROJECT_RESUME",
					name: `${name} Resume`,
				})
				.select()
				.single()
				.then(({ data, error }) => {
					if (error) {
						throw new Error(
							`Project resume resource creation failed: ${error.message}`
						);
					}
					return data;
				}),
			// Step 5: Create PROJECT_DOCS_ROOT resource
			supabaseAdmin
				.from("resources")
				.insert({
					org_id: owner_org_id,
					project_id: project.id,
					resource_type: "PROJECT_DOCS_ROOT",
					name: `${name} Documents`,
				})
				.select()
				.single()
				.then(({ data, error }) => {
					if (error) {
						throw new Error(
							`Project docs root resource creation failed: ${error.message}`
						);
					}
					return data;
				}),
			// Step 5.5: Ensure borrower root resources
			supabaseAdmin
				.rpc("ensure_project_borrower_roots", {
					p_project_id: project.id,
				})
				.then(({ data, error }) => {
					if (error) {
						throw new Error(
							`Failed to ensure borrower root resources: ${error.message}`
						);
					}
					return data;
				}),
			// Fetch most complete borrower resume (independent query)
			fetchMostCompleteBorrowerResume(
				supabaseAdmin,
				owner_org_id,
				project.id
			),
			// Load org owners (independent query)
			supabaseAdmin
				.from("org_members")
				.select("user_id")
				.eq("org_id", owner_org_id)
				.eq("role", "owner")
				.then(({ data, error }) => {
					if (error) {
						console.warn(
							"[project-utils] Failed to load org owners for project grants",
							error
						);
						return [];
					}
					return (data as Array<{ user_id: string }> | null) || [];
				}),
		]);
	} catch (error) {
		await cleanupProject();
		throw error instanceof Error ? error : new Error(String(error));
	}

	// Extract results
	const projectResumeResource = projectResumeResourceResult as ResourceRecord;
	const projectDocsRootResource =
		projectDocsRootResourceResult as ResourceRecord;
	const borrowerRoots = borrowerRootsResult as BorrowerRootsRow[] | null;
	const borrowerRootRow = borrowerRoots?.[0];
	const { content: borrowerResumeContent, projectId: sourceResumeProjectId } =
		borrowerResumeFetchResult;

	// Build owner IDs set
	const ownerIds = new Set<string>([options.creator_id]);
	for (const member of ownerMembersResult) {
		if (member?.user_id) {
			ownerIds.add(member.user_id);
		}
	}

	// Phase 2: Create borrower resume and clone documents (can be parallel)
	console.log(
		"[project-utils] Phase 2: Creating borrower resume and cloning documents"
	);
	let borrowerResumeResult, cloneResult;

	try {
		[borrowerResumeResult, cloneResult] = await Promise.all([
			// Step 6: Create borrower resume record
			supabaseAdmin
				.from("borrower_resumes")
				.insert({
					project_id: project.id,
					content: borrowerResumeContent,
				})
				.then(({ error }) => {
					if (error) {
						throw new Error(
							`Failed to create borrower resume: ${error.message}`
						);
					}
					return { success: true };
				}),
			// Clone borrower documents if source exists (non-blocking)
			sourceResumeProjectId &&
			borrowerRootRow?.borrower_docs_root_resource_id
				? cloneBorrowerDocuments({
						supabaseAdmin,
						ownerOrgId: owner_org_id,
						sourceProjectId: sourceResumeProjectId,
						targetProjectId: project.id,
						targetDocsRootId:
							borrowerRootRow.borrower_docs_root_resource_id,
				  }).catch((cloneError) => {
						console.error(
							"[project-utils] Failed to clone borrower documents",
							cloneError
						);
						return { success: false, error: cloneError };
				  })
				: Promise.resolve({ success: true }),
		]);
	} catch (error) {
		await cleanupProject();
		throw error instanceof Error ? error : new Error(String(error));
	}

	// Build permission targets
	const permissionTargets: string[] = [
		projectDocsRootResource.id,
		projectResumeResource.id,
	];

	if (borrowerRootRow?.borrower_docs_root_resource_id) {
		permissionTargets.push(borrowerRootRow.borrower_docs_root_resource_id);
	}
	if (borrowerRootRow?.borrower_resume_resource_id) {
		permissionTargets.push(borrowerRootRow.borrower_resume_resource_id);
	}

	// Phase 3: Batch grant project access and permissions
	console.log(
		"[project-utils] Phase 3: Batch granting project access and permissions"
	);
	const projectAccessGrants = Array.from(ownerIds).map((ownerId) => ({
		project_id: project.id,
		org_id: owner_org_id,
		user_id: ownerId,
		granted_by: options.creator_id,
	}));

	const permissionGrants: Array<{
		resource_id: string;
		user_id: string;
		permission: string;
		granted_by: string;
	}> = [];
	for (const ownerId of ownerIds) {
		for (const resourceId of permissionTargets) {
			permissionGrants.push({
				resource_id: resourceId,
				user_id: ownerId,
				permission: "edit",
				granted_by: options.creator_id,
			});
		}
	}

	// Batch insert all grants in parallel
	let accessGrantsResult, permissionsResult;

	try {
		[accessGrantsResult, permissionsResult] = await Promise.all([
			supabaseAdmin
				.from("project_access_grants")
				.upsert(projectAccessGrants, {
					onConflict: "project_id,user_id",
				})
				.then(({ error }) => {
					if (error) {
						throw new Error(
							`Failed to grant project access: ${error.message}`
						);
					}
					console.log(
						`[project-utils] Granted project access to ${projectAccessGrants.length} owners`
					);
					return { success: true };
				}),
			supabaseAdmin
				.from("permissions")
				.upsert(permissionGrants, { onConflict: "resource_id,user_id" })
				.then(({ error }) => {
					if (error) {
						throw new Error(
							`Failed to grant permissions: ${error.message}`
						);
					}
					console.log(
						`[project-utils] Granted permissions on ${permissionTargets.length} resources to ${ownerIds.size} owners`
					);
					return { success: true };
				}),
		]);
	} catch (error) {
		await cleanupProject();
		throw error instanceof Error ? error : new Error(String(error));
	}

	// Phase 4: Defer non-critical operations (chat thread, advisor permissions)
	// These can be done after response or in background
	console.log("[project-utils] Phase 4: Deferring non-critical operations");

	// Create chat thread (fire and forget)
	supabaseAdmin
		.from("chat_threads")
		.insert({ project_id: project.id, topic: "General" })
		.select()
		.single()
		.then(({ data: chatThread, error: chatThreadError }) => {
			if (chatThreadError) {
				console.warn(
					"[project-utils] Default chat thread creation failed (non-critical)",
					chatThreadError
				);
				return;
			}

			const participantIds = new Set<string>(ownerIds);
			if (options.assigned_advisor_id) {
				participantIds.add(options.assigned_advisor_id);
			}

			const participants = Array.from(participantIds).map((userId) => ({
				thread_id: chatThread.id,
				user_id: userId,
			}));

			return supabaseAdmin
				.from("chat_thread_participants")
				.insert(participants)
				.then(({ error: participantsError }) => {
					if (participantsError) {
						console.warn(
							"[project-utils] Failed to add participants to default thread (non-critical)",
							participantsError
						);
					}
				});
		})
		.catch((err) => {
			console.warn(
				`[project-utils] Chat thread creation failed (non-critical): ${err.message}`
			);
		});

	// Grant advisor permissions (fire and forget)
	if (assigned_advisor_id) {
		supabaseAdmin
			.rpc("grant_advisor_project_permissions", {
				p_project_id: project.id,
				p_advisor_id: assigned_advisor_id,
				p_granted_by_id: options.creator_id,
			})
			.then(({ error: advisorPermError }) => {
				if (advisorPermError) {
					console.warn(
						"[project-utils] Failed to grant advisor permissions (non-critical)",
						advisorPermError
					);
				}
			})
			.catch((err) => {
				console.warn(
					`[project-utils] Advisor permissions failed (non-critical): ${err.message}`
				);
			});
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
