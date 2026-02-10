"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import {
	Sparkles,
	MessageSquare,
	LayoutDashboard,
	FileStack,
	Search,
	Users,
	Video,
	Calendar,
	Shield,
	Brain,
	ArrowUpRight,
	type LucideIcon,
} from "lucide-react";

const featureCards = [
	{
		title: "AI & Intelligence",
		features: [
			{ label: "AI Auto-Fill", icon: Sparkles },
			{ label: "AI Chat & Q&A", icon: MessageSquare },
			{ label: "AI Insights", icon: Brain },
			{ label: "Deep Project Intelligence", icon: Brain },
		],
	},
	{
		title: "Deal Packaging",
		features: [
			{ label: "Project Resume", icon: FileStack },
			{ label: "Borrower Resume", icon: FileStack },
			{ label: "Offering Memorandum", icon: LayoutDashboard },
			{ label: "Document Management", icon: FileStack },
			{ label: "PDF / Excel Export", icon: FileStack },
		],
	},
	{
		title: "Lender Connectivity",
		features: [
			{ label: "LenderLine Matching", icon: Search },
			{ label: "Personalized Delivery", icon: FileStack },
			{ label: "Underwriting Vault", icon: Shield },
		],
	},
	{
		title: "Collaboration",
		features: [
			{ label: "Real-Time Sync", icon: Users },
			{ label: "Built-In Chat", icon: MessageSquare },
			{ label: "Video Conferencing", icon: Video },
			{ label: "Calendar Integration", icon: Calendar },
			{ label: "Team Management", icon: Users },
		],
	},
];

const allFeatures = featureCards.flatMap((c) =>
	c.features.map((f) => ({ label: f.label, icon: f.icon as LucideIcon }))
);

const ROW_HEIGHT_PX = 56;
const ROW_GAP_PX = 24;

export function UnderTheHoodSection() {
	const sectionRef = useRef<HTMLElement>(null);
	const [viewportHeight, setViewportHeight] = React.useState(800);

	React.useEffect(() => {
		setViewportHeight(window.innerHeight);
	}, []);

	const { scrollYProgress } = useScroll({
		target: sectionRef,
		offset: ["start start", "end end"],
	});

	// Each row is minHeight + mb-6 (24px), so total = n * (ROW_HEIGHT_PX + ROW_GAP_PX)
	const contentHeight =
		allFeatures.length * (ROW_HEIGHT_PX + ROW_GAP_PX);
	const maxTranslate = -Math.max(0, contentHeight - viewportHeight + 80);
	const translateY = useTransform(scrollYProgress, [0, 1], [0, maxTranslate]);

	return (
		<section
			id="under-the-hood"
			ref={sectionRef}
			className="relative w-full bg-gray-50"
			style={{ height: "320vh" }}
		>
			<div className="sticky top-0 h-screen w-full flex items-center overflow-hidden">
				<div className="w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-12 lg:gap-20">
					{/* Left: fixed title, subtitle, CTA */}
					<div className="max-w-md shrink-0">
						<h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
							What&apos;s Under the Hood
						</h2>
						<p className="text-lg text-gray-600 mb-8">
							One platform. Document intake to loan closing.
						</p>
						<Link
							href="#how-it-works"
							className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
						>
							Learn More
							<ArrowUpRight size={16} className="shrink-0" />
						</Link>
					</div>

					{/* Right: clean list — icon + label, no cards */}
					<div className="flex-1 lg:max-w-md h-full min-h-[400px] lg:min-h-0 flex items-center overflow-hidden py-10">
						<motion.div
							style={{
								translateY,
								height: contentHeight + 48,
								width: "100%",
								paddingTop: 24,
							}}
							className="flex flex-col mx-auto"
						>
							{allFeatures.map((f) => {
								const Icon = f.icon;
								return (
									<div
										key={f.label}
										className="flex items-center gap-4 shrink-0 mb-6"
										style={{ minHeight: ROW_HEIGHT_PX }}
									>
										<Icon
											size={22}
											className="text-gray-500 shrink-0"
											strokeWidth={1.5}
										/>
										<span className="text-base text-gray-600">
											{f.label}
										</span>
									</div>
								);
							})}
						</motion.div>
					</div>
				</div>
			</div>
		</section>
	);
}
