// src/components/om/DashboardShell.tsx
import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Download, Home, ChevronLeft } from "lucide-react";
import { cn } from "@/utils/cn";
import { OMChatCard } from "./OMChatCard";
import { useOMDashboard } from "@/contexts/OMDashboardContext";

interface DashboardShellProps {
	children: React.ReactNode;
	projectId: string;
	projectName: string;
	currentScenario: "base" | "upside" | "downside";
	onScenarioChange: (scenario: "base" | "upside" | "downside") => void;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({
	children,
	projectId,
	projectName,
	currentScenario,
	onScenarioChange,
}) => {
	const router = useRouter();
	const pathname = usePathname();
	const { pageHeader } = useOMDashboard();
	const [isChatCollapsed, setIsChatCollapsed] = useState<boolean>(() => {
		try {
			return JSON.parse(
				typeof window !== "undefined"
					? localStorage.getItem(`omChatCollapsed:${projectId}`) ||
							"false"
					: "false"
			);
		} catch {
			return false;
		}
	});

	useEffect(() => {
		try {
			localStorage.setItem(
				`omChatCollapsed:${projectId}`,
				JSON.stringify(isChatCollapsed)
			);
		} catch {}
	}, [isChatCollapsed, projectId]);

	// Build breadcrumbs from pathname
	const pathParts = pathname.split("/").filter(Boolean);
	const breadcrumbs = pathParts
		.slice(3)
		.map((part, index) => {
			const path = "/" + pathParts.slice(0, 4 + index).join("/");
			const label =
				part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, " ");
			return { label, path };
		})
		.filter((crumb) => crumb.label !== "Dashboard"); // Filter out "Dashboard" breadcrumb

	const isHome = pathname.endsWith("/dashboard");

	const handleBackClick = () => {
		if (isHome) {
			router.push(`/project/workspace/${projectId}`);
			return;
		}
		router.back();
	};

	const [showStickyTitle, setShowStickyTitle] = useState(false);
	const headerRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0];
				setShowStickyTitle(!entry.isIntersecting);
			},
			{ root: null, threshold: 0, rootMargin: "-80px 0px 0px 0px" }
		);

		if (headerRef.current) {
			observer.observe(headerRef.current);
		}

		return () => {
			observer.disconnect();
		};
	}, []);

	const displayTitle = pageHeader.title?.trim() || projectName;
	const displaySubtitle = pageHeader.subtitle?.trim();

	return (
		<div
			className="relative w-full flex flex-row animate-fadeIn bg-gray-200"
			style={{ minHeight: "100vh", height: "auto" }}
		>
			{/* Global page background (grid + blue tint) behind both columns */}
			<div
				className="pointer-events-none absolute inset-0 z-0"
				style={{
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					minHeight: "100vh",
				}}
			>
				<div className="absolute inset-0 opacity-[0.5]">
					<svg
						className="absolute inset-0 h-full w-full text-blue-500"
						aria-hidden="true"
					>
						<defs>
							<pattern
								id="om-grid-pattern"
								width="24"
								height="24"
								patternUnits="userSpaceOnUse"
							>
								<path
									d="M 24 0 L 0 0 0 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="0.5"
								/>
							</pattern>
						</defs>
						<rect
							width="100%"
							height="100%"
							fill="url(#om-grid-pattern)"
						/>
					</svg>
				</div>
			</div>

			{/* Header - Fixed at top */}
			<div className="fixed top-0 left-0 right-0 bg-white shadow-sm border-b border-gray-200 z-50">
				<div className="px-6 py-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-6">
							<nav className="flex items-center space-x-2 text-base">
								<button
									onClick={handleBackClick}
									className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-gray-300 rounded-md transition-colors"
									aria-label="Go back"
								>
									<ChevronLeft className="h-4 w-4" />
								</button>

								<button
									onClick={() =>
										router.push(
											`/project/workspace/${projectId}`
										)
									}
									className="text-gray-500 hover:text-gray-700 font-medium"
								>
									Project Workspace
								</button>
								<span className="text-gray-400">/</span>

								{breadcrumbs.length === 0 ? (
									<span className="text-gray-800 font-semibold flex items-center">
										<Home className="h-4 w-4 mr-1" />
										OM Dashboard
									</span>
								) : (
									<>
										<button
											onClick={() =>
												router.push(
													`/project/om/${projectId}/dashboard`
												)
											}
											className="text-gray-500 hover:text-gray-700 font-medium flex items-center"
										>
											<Home className="h-4 w-4 mr-1" />
											OM Dashboard
										</button>
										{breadcrumbs.map((crumb, idx) => {
											const isLast =
												idx === breadcrumbs.length - 1;
											return (
												<React.Fragment key={idx}>
													<span className="text-gray-400">
														/
													</span>
													{isLast ? (
														<span className="text-gray-800 font-semibold">
															{crumb.label}
														</span>
													) : (
														<button
															onClick={() =>
																router.push(
																	crumb.path
																)
															}
															className="text-gray-500 hover:text-gray-700"
														>
															{crumb.label}
														</button>
													)}
												</React.Fragment>
											);
										})}
									</>
								)}
							</nav>
							<div
								className={cn(
									"text-lg font-semibold text-gray-900 transition-opacity duration-300",
									showStickyTitle
										? "opacity-100"
										: "opacity-0"
								)}
								aria-hidden={!showStickyTitle}
							>
								{projectName}
							</div>
						</div>

						<div className="flex items-center space-x-4">
							{/* Export Button */}
							<Button
								variant="outline"
								size="sm"
								onClick={() =>
									alert("Export functionality coming soon")
								}
							>
								<Download className="h-4 w-4 mr-1" />
								Export PDF
							</Button>
						</div>
					</div>
				</div>
			</div>

			{/* Left Column: Scrollable content */}
			<div className="flex-1 relative z-[1] min-w-0">
				{/* Content with padding */}
				<div className="relative p-6 min-w-0 pt-32">
					<div ref={headerRef} className="mb-6 space-y-1">
						<h1 className="text-3xl font-bold text-gray-900">
							{displayTitle}
						</h1>
						{displaySubtitle && (
							<p className="text-sm text-gray-500">
								{displaySubtitle}
							</p>
						)}
					</div>
					{children}
				</div>
			</div>

			{/* Right Column: Sticky collapsible chat card */}
			<OMChatCard
				projectId={projectId}
				isCollapsed={isChatCollapsed}
				onCollapseChange={setIsChatCollapsed}
				topOffsetClassName="top-32"
				widthClassName="w-[30%]"
			/>
		</div>
	);
};
