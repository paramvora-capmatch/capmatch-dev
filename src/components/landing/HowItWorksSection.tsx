"use client";

import React, { useRef, useState } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import {
	Upload,
	Sparkles,
	FileText,
	LayoutDashboard,
	Search,
	Send,
	type LucideIcon,
} from "lucide-react";
import { cn } from "@/utils/cn";

const steps: {
	title: string;
	description: string;
	icon: LucideIcon;
}[] = [
		{
			title: "Upload Your Documents",
			description:
				"Drop in whatever you have—PDF, Excel, Word. Messy or polished, CapMatch handles it.",
			icon: Upload,
		},
		{
			title: "AI Auto-Fill",
			description:
				"Our AI extracts data from your documents. Project and borrower resumes populate automatically.",
			icon: Sparkles,
		},
		{
			title: "Lender-Ready Resumes",
			description:
				"Complete project and borrower profiles. Version history, real-time collaboration, AI validation.",
			icon: FileText,
		},
		{
			title: "Live Offering Memorandum",
			description:
				"Dynamic OM dashboard—not a static PDF. Deal snapshots, market maps, scenario modeling.",
			icon: LayoutDashboard,
		},
		{
			title: "Intelligent Lender Matching",
			description:
				"AI-powered matching by asset, deal type, location. LenderLine™ visualizes your ideal capital partners.",
			icon: Search,
		},
		{
			title: "Personalized Delivery",
			description:
				"Materials formatted for each lender's preferences. PDF, Excel, or live dashboard—we deliver it.",
			icon: Send,
		},
	];

export function HowItWorksSection() {
	const sectionRef = useRef<HTMLElement>(null);
	const { scrollYProgress } = useScroll({
		target: sectionRef,
		offset: ["start start", "end end"],
	});

	const [activeIndex, setActiveIndex] = useState(0);
	const [scrollProgress, setScrollProgress] = useState(0);
	const numSteps = steps.length;

	useMotionValueEvent(scrollYProgress, "change", (latest) => {
		setScrollProgress(latest);
		const raw = latest * (numSteps - 1);
		const index = Math.round(raw);
		const clamped = Math.max(0, Math.min(index, numSteps - 1));
		setActiveIndex(clamped);
	});

	return (
		<section
			id="how-it-works"
			ref={sectionRef}
			className="relative w-full bg-white"
			style={{ height: `${numSteps * 100}vh` }}
		>
			<div className="sticky top-0 h-screen w-full flex items-center overflow-hidden">
				<div className="w-full max-w-[90%] 2xl:max-w-[1600px] mx-auto px-6 sm:px-8 lg:px-12 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-12 lg:gap-16 h-full">

					{/* Left Side: Scrolling Text */}
					<div className="w-full lg:w-1/2 h-full flex flex-col justify-center relative pointer-events-none">
						{/* Static Header */}
						<div className="absolute top-[10%] lg:top-[15%] left-0 w-full z-20">
							<h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
								How It Works
							</h2>
							<p className="text-lg text-gray-500 mb-8">
								From messy documents to funded loan—one vertically integrated platform.
							</p>
						</div>

						{/* Dynamic Scrolling Text */}
						<div className="relative h-[400px] w-full mt-24">
							{steps.map((step, index) => {
								const rawStep = scrollProgress * (numSteps - 1);
								const offset = index - rawStep;

								// Only render nearby items
								if (Math.abs(offset) > 2) return null;

								const y = offset * 180;
								const opacity = Math.max(0, 1 - Math.abs(offset) * 0.7);
								const scale = Math.max(0.8, 1 - Math.abs(offset) * 0.1);

								return (
									<motion.div
										key={index}
										className="absolute top-1/2 left-0 w-full"
										style={{
											y: `calc(-50% + ${y}px)`,
											opacity,
											scale,
										}}
										transition={{ type: "spring", stiffness: 300, damping: 30 }}
									>
										<div className="flex items-center gap-4 mb-4">
											<div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
												<step.icon size={24} className="text-blue-600" strokeWidth={2} />
											</div>
											<h3 className="text-2xl md:text-3xl font-semibold text-gray-900">
												{step.title}
											</h3>
										</div>
										<p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-lg">
											{step.description}
										</p>
									</motion.div>
								);
							})}
						</div>
					</div>

					{/* Right Side: Flicking Images */}
					<div className="hidden lg:flex w-1/2 h-full items-center justify-center relative">
						<div className="relative w-full max-w-2xl h-[500px] flex items-center justify-center">
							{steps.map((step, index) => (
								<motion.div
									key={index}
									initial={false}
									animate={{
										opacity: activeIndex === index ? 1 : 0,
										display: Math.abs(activeIndex - index) <= 1 ? "flex" : "none",
										scale: activeIndex === index ? 1 : 0.95,
									}}
									transition={{ duration: 0.2 }}
									className="absolute inset-0 flex items-center justify-center"
								>
									<div className="w-full h-full rounded-3xl bg-white shadow-2xl border border-gray-100 flex items-center justify-center overflow-hidden">
										<div className="flex flex-col items-center justify-center p-12 text-center space-y-8">
											<div className="w-48 h-48 bg-blue-50 rounded-full flex items-center justify-center">
												<step.icon size={96} className="text-blue-600" strokeWidth={1} />
											</div>
											<div className="space-y-2">
												<div className="inline-block px-4 py-1.5 rounded-full bg-blue-600 text-white text-sm font-medium">
													Step {index + 1}
												</div>
												<div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
													{step.title}
												</div>
											</div>
										</div>
									</div>
								</motion.div>
							))}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}


