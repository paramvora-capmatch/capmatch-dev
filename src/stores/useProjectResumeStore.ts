/**
 * Project resume store: resume content mapping and DB/resume helpers.
 * Split from useProjectStore for decomposition; used by useProjectStore.
 */
import { create } from "zustand";
import type { ProjectResumeContent } from "@/lib/project-queries";
import type { ProjectProfile } from "@/types/enhanced-types";

// Maps ProjectProfile fields to core projects table columns
const projectProfileToDbProject = (
	profileData: Partial<ProjectProfile>
): Record<string, unknown> => {
	const dbData: Record<string, unknown> = {};
	const keyMap: { [key in keyof ProjectProfile]?: string } = {
		projectName: "name",
		assignedAdvisorUserId: "assigned_advisor_id",
	};
	for (const key in profileData) {
		const mappedKey = keyMap[key as keyof ProjectProfile];
		if (mappedKey) {
			dbData[mappedKey] = profileData[key as keyof ProjectProfile];
		}
	}
	return dbData;
};

// Maps ProjectProfile fields to project_resumes.content JSONB column
const projectProfileToResumeContent = (
	profileData: Partial<ProjectProfile>
): Partial<ProjectResumeContent> => {
	const resumeContent: Partial<ProjectResumeContent> = {};
	const skipFields = new Set([
		"id", "owner_org_id", "assignedAdvisorUserId", "createdAt", "updatedAt",
		"_metadata", "_lockedFields", "_fieldStates", "_lockedSections",
		"projectSections", "borrowerSections", "borrowerProgress",
		"completenessPercent",
	]);
	for (const key in profileData) {
		if (skipFields.has(key)) continue;
		const value = (profileData as Record<string, unknown>)[key];
		if (typeof value === "function" || value === undefined) continue;
		if (key === "targetCloseDate" && value === "") {
			(resumeContent as Record<string, unknown>)[key] = null;
		} else {
			(resumeContent as Record<string, unknown>)[key] = value;
		}
	}
	return resumeContent;
};

interface ProjectResumeState {
	projectProfileToDbProject: (profileData: Partial<ProjectProfile>) => Record<string, unknown>;
	projectProfileToResumeContent: (profileData: Partial<ProjectProfile>) => Partial<ProjectResumeContent>;
}

export const useProjectResumeStore = create<ProjectResumeState>(() => ({
	projectProfileToDbProject,
	projectProfileToResumeContent,
}));
