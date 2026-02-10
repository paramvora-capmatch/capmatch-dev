// src/app/page.tsx
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { EnhancedHeader } from "../components/ui/EnhancedHeader";
import { Footer } from "../components/ui/Footer";
import FilterSection from "../components/filter-section";
import LenderGraph from "../components/graph/LenderGraph";
import { useLenders } from "../hooks/useLenders";
import { LenderFilters } from "@/stores/useLenderStore";
import { LenderProfile } from "@/types/lender";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";
import { cn } from "@/utils/cn";
import {
	BusinessModelSection,
	HowItWorksSection,
	FeatureGridSection,
	WhoItsForSection,
	PlatformDemoSection,
	CaseStudiesSection,
	ClosingSection,
} from "@/components/landing";

export default function HomePage() {
	const router = useRouter();
	const { filteredLenders, filters, setFilters, selectLender, loadLenders } =
		useLenders();

	const [scrolled, setScrolled] = useState(false);
	const [textAnimation, setTextAnimation] = useState({
		part1Visible: false,
		part2Visible: false,
		part3Visible: false,
		part4Visible: false,
	});

	useEffect(() => {
		let ticking = false;
		const handleScroll = () => {
			if (!ticking) {
				window.requestAnimationFrame(() => {
					setScrolled(window.scrollY > 10);
					ticking = false;
				});
				ticking = true;
			}
		};
		handleScroll();
		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	useEffect(() => {
		const t1 = setTimeout(
			() => setTextAnimation((p) => ({ ...p, part1Visible: true })),
			300
		);
		const t2 = setTimeout(
			() => setTextAnimation((p) => ({ ...p, part2Visible: true })),
			800
		);
		const t3 = setTimeout(
			() => setTextAnimation((p) => ({ ...p, part3Visible: true })),
			1300
		);
		const t4 = setTimeout(
			() => setTextAnimation((p) => ({ ...p, part4Visible: true })),
			1700
		);
		return () => {
			clearTimeout(t1);
			clearTimeout(t2);
			clearTimeout(t3);
			clearTimeout(t4);
		};
	}, []);

	useEffect(() => {
		const load = async () => {
			try {
				await loadLenders();
			} catch (e) {
				console.error("Err load lenders:", e);
			}
		};
		load();
	}, [loadLenders]);

	const handleFilterChange = useCallback(
		(newFilters: Partial<LenderFilters>) => {
			setFilters(newFilters);
		},
		[setFilters]
	);

	const handleContactLendersClick = useCallback(() => {
		try {
			localStorage.setItem("lastFormData", JSON.stringify(filters));
			router.push("/login?from=lenderline");
		} catch (error) {
			console.error("Error saving filters or navigating:", error);
		}
	}, [filters, router]);

	const handleLenderClick = useCallback(
		(lender: LenderProfile | null) => {
			selectLender(lender);
		},
		[selectLender]
	);

	const handleScrollToHowItWorks = useCallback(() => {
		document
			.getElementById("how-it-works")
			?.scrollIntoView({ behavior: "smooth" });
	}, []);

	const handleAccessDealRoom = useCallback(() => {
		router.push("/login");
	}, [router]);

	const allFilterCategoriesSelected = useMemo(
		() =>
			filters.asset_types.length > 0 &&
			filters.deal_types.length > 0 &&
			filters.capital_types.length > 0 &&
			filters.debt_ranges.length > 0 &&
			filters.locations.length > 0,
		[filters]
	);

	const filtersAreAppliedByUser = useMemo(
		() =>
			filters.asset_types.length > 0 ||
			filters.deal_types.length > 0 ||
			filters.capital_types.length > 0 ||
			filters.debt_ranges.length > 0 ||
			filters.locations.length > 0,
		[filters]
	);

	const topLenders = useMemo(
		() =>
			filteredLenders.filter((lender) => (lender.match_score ?? 0) > 0.7),
		[filteredLenders]
	);

	return (
		<div
			className={cn(
				"min-h-screen flex flex-col transition-colors duration-300 relative z-10"
			)}
			style={{
				backgroundColor: "#ffffff",
				backgroundImage: `
          repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            rgba(209, 213, 219, 0.097) 10px,
            rgba(209, 213, 219, 0.097) 11px
          ),
          repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 10px,
            rgba(209, 213, 219, 0.097) 10px,
            rgba(209, 213, 219, 0.097) 11px
          )
        `,
			}}
		>
			<EnhancedHeader scrolled={scrolled} textVisible={true} />

			<main className="flex-grow transition-colors duration-300 relative z-10">
				{/* Hero */}
				<section
					className="relative overflow-hidden transition-colors duration-300 pt-24 pb-24"
					style={{
						minHeight: "100vh",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						backgroundColor: "transparent",
					}}
				>
					<motion.div
						className="container mx-auto px-4 max-w-7xl text-center relative z-20"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.8 }}
					>
						<motion.div className="mb-8">
							<div className="overflow-hidden">
								<motion.div
									initial={{ opacity: 0, y: 20 }}
									animate={{
										opacity: textAnimation.part1Visible
											? 1
											: 0,
										y: textAnimation.part1Visible ? 0 : 20,
									}}
									transition={{ duration: 0.6 }}
									className="text-5xl md:text-6xl lg:text-7xl leading-tight text-gray-900"
								>
									CRE Funding
								</motion.div>
							</div>
							<div className="overflow-hidden mt-2">
								<motion.div
									initial={{ opacity: 0, y: 20 }}
									animate={{
										opacity: textAnimation.part2Visible
											? 1
											: 0,
										y: textAnimation.part2Visible ? 0 : 20,
									}}
									transition={{ duration: 0.6 }}
									className="text-5xl md:text-6xl lg:text-7xl leading-tight text-gray-900"
								>
									From{" "}
									<span className="text-blue-500">Months</span>{" "}
									to{" "}
									<span className="text-blue-500">Minutes</span>
								</motion.div>
							</div>
							<div className="overflow-hidden mt-4">
								<motion.div
									initial={{ opacity: 0, y: 20 }}
									animate={{
										opacity: textAnimation.part3Visible
											? 1
											: 0,
										y: textAnimation.part3Visible ? 0 : 20,
									}}
									transition={{ duration: 0.6 }}
									className="text-xl md:text-2xl text-gray-600 font-medium"
								>
									The Operating System for Commercial Real
									Estate Financing
								</motion.div>
							</div>
							<div className="overflow-hidden mt-6">
								<motion.div
									initial={{ opacity: 0, y: 20 }}
									animate={{
										opacity: textAnimation.part4Visible
											? 1
											: 0,
										y: textAnimation.part4Visible ? 0 : 20,
									}}
									transition={{ duration: 0.6 }}
									className="text-lg md:text-xl max-w-3xl mx-auto text-gray-600"
								>
									CapMatch is a fully integrated, AI-enabled
									brokerage—from document intake to loan
									closing. We handle everything in between.
								</motion.div>
							</div>
						</motion.div>
						<motion.div
							initial={{ opacity: 0 }}
							animate={{
								opacity: textAnimation.part4Visible ? 1 : 0,
							}}
							transition={{ duration: 0.6, delay: 0.3 }}
						>
							<div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 justify-center">
								<Button
									variant="primary"
									size="lg"
									className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-8"
									style={{
										boxShadow:
											"0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
									}}
									onClick={handleScrollToHowItWorks}
								>
									See How It Works
								</Button>
								<Button
									variant="outline"
									size="lg"
									onClick={handleAccessDealRoom}
									className="rounded-full border-gray-300 !text-blue-600 hover:bg-gray-100 hover:border-gray-400 bg-white"
									style={{
										boxShadow:
											"0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
									}}
								>
									Access Deal Room
								</Button>
							</div>
						</motion.div>
						{/* Placeholder for platform preview video or auto-fill animation */}
						<motion.div
							className="mt-16 mx-auto max-w-4xl"
							initial={{ opacity: 0, y: 24 }}
							animate={{
								opacity: textAnimation.part4Visible ? 1 : 0,
								y: textAnimation.part4Visible ? 0 : 24,
							}}
							transition={{ duration: 0.6, delay: 0.5 }}
						>
							<div className="aspect-video rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
								<span className="text-gray-500 text-sm">
									[ Platform preview video or auto-fill
									animation placeholder ]
								</span>
							</div>
						</motion.div>
					</motion.div>
				</section>

				<BusinessModelSection />
				<HowItWorksSection />
				<FeatureGridSection />
				<WhoItsForSection />
				<PlatformDemoSection />
				<CaseStudiesSection />

				{/* LenderLine section — repositioned with intro and callout */}
				<section
					id="lender-matching-section"
					className="min-h-screen py-24 relative flex items-center"
					style={{
						backgroundColor: "transparent",
						position: "relative",
						zIndex: 1,
					}}
				>
					<div className="container mx-auto px-4 max-w-7xl w-full">
						<motion.div
							className="text-center mb-8"
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true, margin: "-100px" }}
							transition={{ duration: 0.6 }}
						>
							<h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
								LenderLine™
							</h2>
							<p className="text-lg max-w-2xl mx-auto text-gray-600 mb-2">
								CapMatch&apos;s intelligent lender matching
								engine. Select your project criteria below to
								see matching lenders visualized in real-time.
							</p>
							<p className="text-sm max-w-xl mx-auto text-gray-500">
								After matching, CapMatch handles
								everything—from document preparation to OM
								generation to deal closing.
							</p>
						</motion.div>

						<div className="flex flex-col lg:flex-row gap-8 items-center">
							<motion.div
								className="w-full lg:w-1/2 flex flex-col"
								initial={{ opacity: 0, x: -50 }}
								whileInView={{ opacity: 1, x: 0 }}
								viewport={{ once: true, margin: "-100px" }}
								transition={{ duration: 0.6, ease: "easeOut" }}
							>
								<div
									className="border rounded-xl p-6 flex-grow flex flex-col bg-white border-gray-200"
									style={{
										boxShadow:
											"0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
									}}
								>
									<div className="flex-grow flex flex-col justify-between space-y-6 md:space-y-8 gap-6">
										<FilterSection
											formData={filters}
											onChange={handleFilterChange}
											filterType="asset_types"
										/>
										<FilterSection
											formData={filters}
											onChange={handleFilterChange}
											filterType="deal_types"
										/>
										<FilterSection
											formData={filters}
											onChange={handleFilterChange}
											filterType="capital_types"
										/>
										<FilterSection
											formData={filters}
											onChange={handleFilterChange}
											filterType="locations"
										/>
										<FilterSection
											formData={filters}
											onChange={handleFilterChange}
											filterType="debt_ranges"
										/>
									</div>
									<div className="mt-6 pt-6 border-t text-center border-gray-200">
										{allFilterCategoriesSelected &&
											topLenders.length > 0 && (
												<>
													<Button
														variant="primary"
														rightIcon={
															<ArrowRight
																size={16}
															/>
														}
														onClick={
															handleContactLendersClick
														}
														className="shadow-xl text-white rounded-full px-8 py-3 text-lg font-medium transition-transform hover:scale-105"
														style={{
															backgroundColor:
																"#10b981",
														}}
														onMouseEnter={(e) =>
															(e.currentTarget.style.backgroundColor =
																"#059669")
														}
														onMouseLeave={(e) =>
															(e.currentTarget.style.backgroundColor =
																"#10b981")
														}
													>
														Contact Your Top{" "}
														{topLenders.length}{" "}
														Lender
														{topLenders.length > 1
															? "s"
															: ""}
													</Button>
													<p className="text-sm md:text-base mt-2 text-gray-500">
														Sign in to connect and
														share your project.
													</p>
												</>
											)}
										{allFilterCategoriesSelected &&
											topLenders.length === 0 && (
												<div className="p-4 border rounded-lg bg-amber-50 border-amber-200">
													<p className="font-medium text-sm md:text-base text-amber-700">
														No exact matches found.
													</p>
													<p className="text-sm md:text-base text-amber-600">
														Try broadening your
														filters.
													</p>
												</div>
											)}
										{!allFilterCategoriesSelected && (
											<div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
												<p className="font-medium text-sm md:text-base text-blue-700">
													Select filters in all
													categories above
												</p>
												<p className="text-sm md:text-base text-blue-600">
													to see matches and connect.
												</p>
											</div>
										)}
									</div>
								</div>
							</motion.div>

							<motion.div
								className="w-full lg:w-1/2 h-[600px] lg:h-[700px] relative overflow-visible lg:-mr-8 xl:-mr-16"
								initial={{ opacity: 0, x: 50 }}
								whileInView={{ opacity: 1, x: 0 }}
								viewport={{ once: true, margin: "-100px" }}
								transition={{ duration: 0.6, ease: "easeOut" }}
							>
								<LenderGraph
									lenders={filteredLenders}
									formData={filters}
									filtersApplied={filtersAreAppliedByUser}
									onLenderClick={handleLenderClick}
									allFiltersSelected={
										allFilterCategoriesSelected
									}
								/>
							</motion.div>
						</div>
					</div>
				</section>

				<ClosingSection />
			</main>

			<Footer />
		</div>
	);
}
