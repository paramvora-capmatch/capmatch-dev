"use client";

import React, { useRef } from "react";
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

	const [activeIndex, setActiveIndex] = React.useState(0);
	const numSteps = steps.length;

	useMotionValueEvent(scrollYProgress, "change", (latest) => {
		const raw = latest * numSteps;
		const index = Math.min(
			Math.floor(raw),
			numSteps - 1
		);
		const clamped = Math.max(0, index);
		setActiveIndex(clamped);
	});

	return (
		<section
			id="how-it-works"
			ref={sectionRef}
			className="relative w-full bg-white -mt-[12vh]"
			style={{ height: `${numSteps * 100}vh` }}
		>
			<div className="sticky top-0 h-screen w-full flex items-center">
				<div className="w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-12 lg:gap-16">
					<div className="max-w-2xl">
						<h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
							How It Works
						</h2>
						<p className="text-lg text-gray-600 mb-12">
							From messy documents to funded loan—one vertically integrated
							platform.
						</p>
						<div className="relative min-h-[200px]">
							{steps.map((step, index) => (
								<motion.div
									key={step.title}
									initial={false}
									animate={{
										opacity: activeIndex === index ? 1 : 0,
										y: activeIndex === index ? 0 : 8,
									}}
									transition={{ duration: 0.25 }}
									className={
										activeIndex === index
											? "absolute left-0 right-0 top-0"
											: "pointer-events-none invisible absolute left-0 right-0 top-0"
									}
								>
									<h3 className="text-xl md:text-2xl font-semibold text-gray-900 mb-3">
										{step.title}
									</h3>
									<p className="text-base md:text-lg text-gray-600 max-w-lg">
										{step.description}
									</p>
								</motion.div>
							))}
						</div>
						<div className="flex gap-1.5 mt-8">
							{steps.map((_, i) => (
								<div
									key={i}
									className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
										i === activeIndex
											? "bg-blue-500"
											: i < activeIndex
												? "bg-blue-300"
												: "bg-gray-200"
									}`}
								/>
							))}
						</div>
					</div>
					{/* Placeholder icon on the right */}
					<div className="hidden lg:flex shrink-0 items-center justify-center">
						<motion.div
							key={activeIndex}
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ duration: 0.25 }}
							className="w-60 h-60 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center shadow-sm"
						>
							{(() => {
								const Icon = steps[activeIndex]?.icon ?? Upload;
								return (
									<Icon
										size={80}
										className="text-blue-500/80"
										strokeWidth={1.5}
									/>
								);
							})()}
						</motion.div>
					</div>
				</div>
			</div>
		</section>
	);
}
