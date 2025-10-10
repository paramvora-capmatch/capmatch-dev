// src/components/dashboard/ProjectCard.tsx
import React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/Button";
import {
	ChevronRight,
	CheckCircle,
	Trash2,
	Calendar,
	Building,
	Star,
	TrendingUp,
	FileSpreadsheet,
} from "lucide-react";
import { ProjectProfile } from "@/types/enhanced-types";
import { useProjectStore as useProjects } from "@/stores/useProjectStore";

interface ProjectCardProps {
	project: ProjectProfile;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
	const router = useRouter();
	const { deleteProject } = useProjects();

	const completeness = project.completenessPercent || 0;
	const isComplete = completeness === 100;

	// Format date helper (could be moved to utils)
	const formatDate = (dateString?: string) => {
		if (!dateString) return "N/A";
		try {
			const date = new Date(dateString);
			if (isNaN(date.getTime())) return "Invalid Date";
			return date.toLocaleDateString("en-US", {
				year: "numeric",
				month: "short",
				day: "numeric",
			});
		} catch (e) {
			return "Invalid Date";
		}
	};

	const handleDelete = async (e: React.MouseEvent) => {
		e.stopPropagation(); // Prevent card click navigation
		if (
			window.confirm(
				`Are you sure you want to delete "${project.projectName}"? This action cannot be undone.`
			)
		) {
			try {
				await deleteProject(project.id);
				// Optionally show a success toast message here
				console.log("Project deleted successfully");
			} catch (error) {
				console.error("Failed to delete project:", error);
				// Optionally show an error toast message here
			}
		}
	};

	// Enhanced status color helper with gradients
	const getStatusColorClasses = (status: string) => {
		switch (status) {
			case "Draft":
				return "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-200";
			case "Info Gathering":
				return "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-200";
			case "Advisor Review":
				return "bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 border border-amber-200";
			case "Matches Curated":
				return "bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border border-purple-200";
			case "Introductions Sent":
				return "bg-gradient-to-r from-indigo-100 to-indigo-200 text-indigo-800 border border-indigo-200";
			case "Term Sheet Received":
				return "bg-gradient-to-r from-teal-100 to-teal-200 text-teal-800 border border-teal-200";
			case "Closed":
				return "bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-200";
			default:
				return "bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-200"; // For Stalled/Withdrawn
		}
	};

	return (
		<div className="group relative">
			<Card className="h-full flex flex-col rounded-xl overflow-hidden">
				{/* Completion status indicator bar */}
				<div className="h-1 bg-gray-100">
					<div
						className={`h-full transition-all duration-500 ${
							isComplete
								? "bg-gradient-to-r from-emerald-500 to-green-500"
								: "bg-gradient-to-r from-blue-500 to-cyan-500"
						}`}
						style={{ width: `${completeness}%` }}
					/>
				</div>

				<CardContent className="p-6 flex flex-col flex-grow">
					<div className="flex justify-between items-start mb-4 gap-2">
						<h3
							className="text-lg font-bold text-gray-800 truncate mr-3 group-hover:text-blue-800 transition-colors duration-200"
							title={project.projectName || "Unnamed Project"}
						>
							{project.projectName || "Unnamed Project"}
						</h3>
						<div className="flex items-center space-x-2 flex-shrink-0">
							<span
								className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap shadow-sm ${getStatusColorClasses(
									project.projectStatus
								)}`}
							>
								{project.projectStatus === "Closed" ? (
									<CheckCircle className="h-3.5 w-3.5 mr-1.5" />
								) : (
									<TrendingUp className="h-3.5 w-3.5 mr-1.5" />
								)}
								{project.projectStatus}
							</span>
							<Button
								variant="ghost"
								size="icon"
								onClick={handleDelete}
								className="h-6 w-6 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-full"
							>
								<Trash2 size={14} />
							</Button>
						</div>
					</div>

					<div className="space-y-3 mb-5">
						<div className="flex items-center text-sm text-gray-600">
							<Building className="h-4 w-4 mr-2 text-blue-600 flex-shrink-0" />
							<span className="font-medium">
								{project.assetType || "Asset Type TBD"}
							</span>
						</div>

						<div className="flex items-center text-sm text-gray-600">
							<Calendar className="h-4 w-4 mr-2 text-green-600 flex-shrink-0" />
							<span>
								Updated:{" "}
								<span className="font-medium">
									{formatDate(project.updatedAt)}
								</span>
							</span>
						</div>
					</div>

					<div className="mb-5 mt-auto">
						<div className="flex justify-between items-center text-xs mb-1">
							<span className="text-gray-500">Progress</span>
							<span
								className={`font-semibold ${
									isComplete
										? "text-green-600"
										: "text-blue-600"
								}`}
							>
								{completeness}%
							</span>
						</div>

						<div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner">
							<div
								className={`absolute top-0 left-0 h-full rounded-full transition-all duration-700 shadow-sm ${
									isComplete
										? "bg-gradient-to-r from-emerald-500 to-green-500"
										: "bg-gradient-to-r from-blue-500 to-cyan-500"
								}`}
								style={{ width: `${completeness}%` }}
							/>
						</div>

						{isComplete && (
							<div className="flex items-center justify-center mt-2 text-xs text-green-700 bg-green-50 rounded-md py-1">
								<CheckCircle className="h-3.5 w-3.5 mr-1" />
								OM Ready
							</div>
						)}
					</div>

					<div className="space-y-3 flex-shrink-0">
						{isComplete && (
							<Button
								variant="outline"
								fullWidth
								size="sm"
								onClick={(e) => {
									e.stopPropagation();
									router.push(`/project/om/${project.id}`);
								}}
								className="border-gray-200 hover:border-green-300 hover:bg-green-50/70 hover:text-green-700 font-medium"
							>
								<FileSpreadsheet className="mr-2 h-4 w-4" />
								View OM
							</Button>
						)}

						<Button
							variant="primary"
							fullWidth
							size="sm"
							rightIcon={<ChevronRight size={16} />}
							onClick={() =>
								router.push(`/project/workspace/${project.id}`)
							}
							className="font-medium"
						>
							{isComplete ? "Open Workspace" : "Continue Setup"}
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};
