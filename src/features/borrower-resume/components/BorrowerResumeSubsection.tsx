"use client";

import React from "react";
import { Lock, Unlock, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/utils/cn";
import type { BorrowerSubsectionBadgeState } from "@/features/borrower-resume/domain/subsectionBadgeState";

export interface BorrowerResumeSubsectionSubsection {
	id: string;
	title: string;
	fields?: string[];
}

export interface BorrowerResumeSubsectionProps {
	subsection: BorrowerResumeSubsectionSubsection;
	sectionId: string;
	isExpanded: boolean;
	onToggle: () => void;
	badgeState: BorrowerSubsectionBadgeState;
	onLockClick: () => void;
	children: React.ReactNode;
}

/**
 * Accordion row + subsection lock + badges; when expanded renders children in wrapper.
 * Title is cleaned (strip "1.1 " style).
 */
export function BorrowerResumeSubsection({
	subsection,
	isExpanded,
	onToggle,
	badgeState,
	onLockClick,
	children,
}: BorrowerResumeSubsectionProps): React.ReactElement {
	const {
		showError,
		showNeedsInput,
		showComplete,
		subsectionLocked: isLocked,
		subsectionLockDisabled,
		subsectionLockTitle,
	} = badgeState;

	const cleanTitle = subsection.title.replace(/^\d+\.\d+\s*/, "");

	return (
		<div className="rounded-md border border-gray-200 bg-gray-50 overflow-hidden shadow-md">
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
								(isLocked
									? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
									: "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100")
						)}
						title={subsectionLockTitle}
					>
						{isLocked ? (
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
