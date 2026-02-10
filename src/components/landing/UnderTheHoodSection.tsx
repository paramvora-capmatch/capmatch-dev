"use client";

import React, { useRef } from "react";
import { motion } from "framer-motion";
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

export function UnderTheHoodSection() {
	const ref = useRef<HTMLDivElement>(null);

	return (
		<section id="under-the-hood" className="py-16 md:py-20 bg-gray-50">
			<div className="container mx-auto px-4 max-w-7xl">
				<div
					ref={ref}
					className="relative flex min-h-[28rem] flex-col lg:flex-row gap-10 overflow-y-auto rounded-xl bg-gray-100/80 p-8 md:p-10"
				>
					{/* Sticky left: heading + subheading */}
					<div className="lg:sticky lg:top-8 lg:self-start lg:max-w-md shrink-0">
						<h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
							What&apos;s Under the Hood
						</h2>
						<p className="text-lg text-gray-600">
							One platform. Document intake to loan closing.
						</p>
					</div>
					{/* Right: scrolling cards */}
					<div className="flex-1 space-y-6 lg:space-y-8">
						{featureCards.map((card, i) => (
							<motion.div
								key={card.title}
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true, margin: "-20px" }}
								transition={{ duration: 0.4, delay: i * 0.05 }}
								className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
							>
								<h3 className="text-lg font-semibold text-gray-900 mb-4">
									{card.title}
								</h3>
								<div className="flex flex-wrap gap-2">
									{card.features.map((f) => {
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
						<div className="h-8" />
					</div>
				</div>
			</div>
		</section>
	);
}
