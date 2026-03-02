/**
 * Project progress store: completion calculation only.
 * Split from useProjectStore for decomposition; used by useProjectStore.
 */
import { create } from "zustand";
import type { ProjectResumeContent, BorrowerResumeContent } from "@/lib/project-queries";
import type { ProjectProfile } from "@/types/enhanced-types";
import {
	computeBorrowerCompletion,
	computeProjectCompletion,
} from "@/utils/resumeCompletion";

interface ProjectProgressState {
	calculateProgress: (project: ProjectProfile) => {
		borrowerProgress: number;
		completenessPercent: number;
		totalProgress: number;
	};
}

export const useProjectProgressStore = create<ProjectProgressState>(() => ({
	calculateProgress: (project) => {
		const projectResumeContent =
			(project.projectSections as ProjectResumeContent | undefined) || null;
		const borrowerContent =
			(project.borrowerSections as BorrowerResumeContent | undefined) || null;

		const storedCompletenessPercent = project.completenessPercent;
		const storedBorrowerProgress = project.borrowerProgress;

		const completenessPercent =
			storedCompletenessPercent !== undefined &&
			storedCompletenessPercent !== null &&
			typeof storedCompletenessPercent === "number" &&
			storedCompletenessPercent >= 0
				? storedCompletenessPercent
				: computeProjectCompletion(project);

		const borrowerProgress =
			storedBorrowerProgress !== undefined &&
			storedBorrowerProgress !== null &&
			typeof storedBorrowerProgress === "number" &&
			storedBorrowerProgress >= 0
				? storedBorrowerProgress
				: computeBorrowerCompletion(borrowerContent);

		const totalProgress = Math.round(
			(completenessPercent + borrowerProgress) / 2
		);

		return {
			borrowerProgress,
			completenessPercent,
			totalProgress,
		};
	},
}));
