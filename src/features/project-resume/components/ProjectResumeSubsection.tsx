"use client";

import React from "react";
import { ChevronDown, ChevronRight, Lock, Unlock } from "lucide-react";
import { cn } from "@/utils/cn";

export interface ProjectResumeSubsectionBadgeState {
	showError: boolean;
	showNeedsInput: boolean;
	showComplete: boolean;
	subsectionLocked: boolean;
	subsectionLockDisabled: boolean;
	subsectionLockTitle: string;
}

export interface ProjectResumeSubsectionProps {
	/** Subsection from schema: { id, title, fields? } */
	subsection: { id: string; title: string; fields?: string[] };
	/** Parent section id (e.g. "property-specs") */
	sectionId: string;
	isExpanded: boolean;
	onToggle: () => void;
	badgeState: ProjectResumeSubsectionBadgeState;
	onLockClick: () => void;
	children: React.ReactNode;
}

/**
 * Accordion row for a project resume subsection: expand/collapse, title,
 * subsection-level lock CTA, and status badges (Error / Needs Input / Complete).
 * Expanded content is rendered as children.
 */
export function ProjectResumeSubsection({
	subsection,
	sectionId,
	isExpanded,
	onToggle,
	badgeState,
	onLockClick,
	children,
}: ProjectResumeSubsectionProps): React.ReactElement {
	const subsectionId = subsection.id;
	const cleanTitle = subsection.title.replace(/^\d+\.\d+\s*/, "");
	const {
		showError,
		showNeedsInput,
		showComplete,
		subsectionLocked,
		subsectionLockDisabled,
		subsectionLockTitle,
	} = badgeState;

	return (
		<div
			key={subsectionId}
			className="rounded-md border border-gray-200 bg-gray-50 overflow-hidden shadow-md"
		>
			<button
				type="button"
				onClick={onToggle}
				className="w-full flex items-center justify-between p-3 hover:bg-gray-100 transition-colors"
			>
				<div className="flex items-center gap-2">
					{isExpanded ? (
						<ChevronDown className="h-4 w-4 text-gray-500" />
					) : (
						<ChevronRight className="h-4 w-4 text-gray-500" />
					)}
					<h3 className="text-sm font-semibold text-gray-800">
						{cleanTitle}
					</h3>
				</div>
				<div className="flex items-center gap-2">
					<div
						onClick={(e) => {
							e.stopPropagation();
							if (subsectionLockDisabled) return;
							onLockClick();
						}}
						className={cn(
							"flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all border",
							subsectionLockDisabled
								? "cursor-not-allowed bg-gray-50 text-gray-400 border-gray-200"
								: "cursor-pointer",
							!subsectionLockDisabled &&
								(subsectionLocked
									? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
									: "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100")
						)}
						title={subsectionLockTitle}
					>
						{subsectionLocked ? (
							<>
								<Lock className="h-3 w-3" />
								<span>Unlock</span>
							</>
						) : (
							<>
								<Unlock className="h-3 w-3" />
								<span>Lock</span>
							</>
						)}
					</div>
					{showError && (
						<span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 font-medium">
							Error
						</span>
					)}
					{showNeedsInput && (
						<span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
							Needs Input
						</span>
					)}
					{showComplete && (
						<span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">
							Complete
						</span>
					)}
				</div>
			</button>
			{isExpanded && (
				<div className="p-3 pt-0 space-y-4">
					{children}
				</div>
			)}
		</div>
	);
}
