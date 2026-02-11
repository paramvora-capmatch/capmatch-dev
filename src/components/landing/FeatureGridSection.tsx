"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
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
} from "lucide-react";

const featureGroups = [
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

export function FeatureGridSection() {
	const ref = useRef<HTMLDivElement>(null);
	const isInView = useInView(ref, { once: true, amount: 0.1 });

	return (
		<section
			id="features"
			ref={ref}
			className="py-20 md:py-28 bg-gray-50"
		>
			<div className="container mx-auto px-4 max-w-7xl">
				<motion.div
					className="text-center mb-14"
					initial={{ opacity: 0, y: 20 }}
					animate={isInView ? { opacity: 1, y: 0 } : {}}
					transition={{ duration: 0.6 }}
				>
					<h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
						What&apos;s Under the Hood
					</h2>
					<p className="text-lg text-gray-600 max-w-2xl mx-auto">
						One platform. Document intake to loan closing.
					</p>
				</motion.div>
				<div className="grid gap-10 md:grid-cols-2">
					{featureGroups.map((group, gi) => (
						<motion.div
							key={group.title}
							className="bg-white rounded-xl border border-gray-200 p-6 shadow-md"
							initial={{ opacity: 0, y: 20 }}
							animate={
								isInView
									? { opacity: 1, y: 0 }
									: { opacity: 0, y: 20 }
							}
							transition={{
								duration: 0.5,
								delay: gi * 0.1,
							}}
						>
							<h3 className="text-lg font-semibold text-gray-900 mb-4">
								{group.title}
							</h3>
							<div className="flex flex-wrap gap-2">
								{group.features.map((f) => {
									const Icon = f.icon;
									return (
										<span
											key={f.label}
											className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-sm border border-gray-200"
										>
											<Icon size={14} className="text-blue-500" />
											{f.label}
										</span>
									);
								})}
							</div>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
