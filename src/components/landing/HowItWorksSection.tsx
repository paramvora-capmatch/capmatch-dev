"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
	UsersRound,
	Upload,
	Sparkles,
	Search,
} from "lucide-react";
import { cn } from "@/utils/cn";

const steps = [
	{
		tag: "/ Step 1",
		title: "Assemble Your War Room",
		bullets: [
			"Don't work in a silo. Invite analysts, advisors, and partners to the deal before you start building.",
			"Set granular permissions so your team can help validate data and refine the narrative from day one.",
		],
		icon: UsersRound,
		layout: "left" as const,
	},
	{
		tag: "/ Step 2",
		title: "Upload Raw Documents",
		bullets: [
			"Drop in whatever you have—Rent Rolls, T-12s, Appraisals (PDF or Excel).",
			"CapMatch accepts messy data and prepares it for processing immediately.",
		],
		icon: Upload,
		layout: "right" as const,
	},
	{
		tag: "/ Step 3",
		title: "AI Auto-Fill & Live OM",
		bullets: [
			"Watch the system work. Our AI extracts data to populate the Borrower Resume and generates a dynamic \"Live Offering Memorandum\"—a fully interactive dashboard, not a static PDF.",
		],
		icon: Sparkles,
		layout: "left" as const,
	},
	{
		tag: "/ Step 4",
		title: "Intelligent Matching",
		bullets: [
			"Target with precision. Once your data is verified, our LenderLine™ engine matches your deal against thousands of active capital mandates to find the partners ready to fund.",
		],
		icon: Search,
		layout: "right" as const,
	},
];

function StepBlock({
	step,
	index,
	isInView,
}: {
	step: (typeof steps)[0];
	index: number;
	isInView: boolean;
}) {
	const Icon = step.icon;
	const isLeft = step.layout === "left";

	return (
		<motion.div
			className={cn(
				"flex flex-col lg:flex-row gap-10 lg:gap-16 items-center py-12 lg:py-16",
				index > 0 && "border-t border-gray-100"
			)}
			initial={{ opacity: 0, y: 32 }}
			animate={isInView ? { opacity: 1, y: 0 } : {}}
			transition={{ duration: 0.6, delay: index * 0.08 }}
		>
			<div
				className={cn(
					"w-full lg:w-1/2 flex flex-col justify-center order-2 lg:order-none",
					!isLeft && "lg:order-2"
				)}
			>
				<span className="text-sm font-medium text-blue-600 mb-2">
					{step.tag}
				</span>
				<h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
					{step.title}
				</h3>
				<ul className="space-y-2">
					{step.bullets.map((b) => (
						<li
							key={b}
							className="flex items-start gap-2 text-gray-600"
						>
							<span className="text-blue-500 mt-1">✓</span>
							<span>{b}</span>
						</li>
					))}
				</ul>
			</div>
			<div
				className={cn(
					"w-full lg:w-1/2 flex justify-center order-1 lg:order-none",
					!isLeft && "lg:order-1"
				)}
			>
				{/* Placeholder for product visual / screenshot */}
				<div className="w-full max-w-xl aspect-video rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center">
					<Icon size={48} className="text-gray-400" />
				</div>
			</div>
		</motion.div>
	);
}

export function HowItWorksSection() {
	const ref = useRef<HTMLDivElement>(null);
	const isInView = useInView(ref, { once: true, amount: 0.1 });

	return (
		<section
			id="how-it-works"
			ref={ref}
			className="py-20 md:py-28 bg-white"
		>
			<div className="container mx-auto px-4 max-w-7xl">
				<motion.div
					className="text-center mb-16"
					initial={{ opacity: 0, y: 20 }}
					animate={isInView ? { opacity: 1, y: 0 } : {}}
					transition={{ duration: 0.6 }}
				>
					<h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
						How It Works
					</h2>
					<p className="text-lg text-gray-600 max-w-2xl mx-auto">
						From messy documents to funded loan—one vertically
						integrated platform.
					</p>
				</motion.div>
				<div className="max-w-5xl mx-auto">
					{steps.map((step, index) => (
						<StepBlock
							key={step.tag}
							step={step}
							index={index}
							isInView={isInView}
						/>
					))}
				</div>
			</div>
		</section>
	);
}
