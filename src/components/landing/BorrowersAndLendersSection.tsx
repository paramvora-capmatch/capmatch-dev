"use client";

import React from "react";
import { motion } from "framer-motion";
import { AnimatedLenderGraph } from "@/components/graph/AnimatedLenderGraph";

const borrowerPoints: { title: string; description: string }[] = [
	{
		title: "Direct access to the right lenders",
		description:
			"Not a spray-and-pray marketplace - your deal is matched to lenders who actually want it.",
	},
	{
		title: "Institutional-grade deal presentation",
		description:
			"Your story, numbers, and risks structured the way lenders underwrite - not buried in PDFs.",
	},
	{
		title: "Faster certainty of execution",
		description:
			"Less back-and-forth, fewer dead ends, quicker paths to real term sheets.",
	},
];

const lenderPoints: { title: string; description: string }[] = [
	{
		title: "Curated, mandate-matched deal flow",
		description:
			"Only deals that fit your box - pre-screened, relevant, and investment-ready.",
	},
	{
		title: "Standardized, comparable underwriting",
		description:
			"Every deal follows the structure you need, so you can compare apples to apples instantly.",
	},
	{
		title: "Faster deployment of capital",
		description:
			"Cleaner inputs, clearer risks, and fewer friction points between interest and close.",
	},
];

export function BorrowersAndLendersSection() {
	return (
		<section
			id="borrowers-and-lenders"
			className="relative w-full min-h-screen flex flex-col pb-24"
		>
			{/* Title + byline - full width at top */}
			<div className="w-full text-center pt-20 md:pt-24 pb-3 md:pb-4 px-4">
				<motion.div
					initial={{ opacity: 0, y: 12 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: "-40px" }}
					transition={{ duration: 0.5 }}
				>
					<h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight mb-4">
						Built for Borrowers & Lenders
					</h2>
					<p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
						Like Uber for CRE - connect borrowers and lenders directly, on demand.
					</p>
				</motion.div>
			</div>

			{/* Three columns: Borrowers card | graph | Lenders card. flex-nowrap + shrink-0 so desktop stays in one row. */}
			<div className="flex flex-col lg:flex-row flex-nowrap lg:items-center gap-6 lg:gap-8 flex-1 w-full max-w-7xl mx-auto px-4 md:px-6">
			{/* Left column - Borrowers card */}
			<div className="w-full lg:w-1/4 flex-shrink-0 min-h-[200px] lg:min-h-0 flex flex-col justify-center pt-6 lg:pt-8 pb-8 lg:pb-16 lg:pl-0">
				<motion.div
					initial={{ opacity: 0, y: 24, scale: 0.96 }}
					whileInView={{ opacity: 1, y: 0, scale: 1 }}
					viewport={{ once: true, margin: "-50px" }}
					transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
					className="w-full max-w-sm bg-white rounded-3xl shadow-lg p-6 lg:p-8 relative overflow-hidden"
					style={{
						boxShadow:
							"0 4px 24px -4px rgba(0, 0, 0, 0.12), 0 1.5px 6px -1.5px rgba(0, 0, 0, 0.08)",
					}}
				>
					<div className="absolute right-0 top-6 bottom-6 w-[3px] rounded-full bg-gradient-to-b from-blue-400 via-blue-500 to-blue-400 opacity-60" />
					<h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6">
						Borrowers
					</h2>
					<ul className="space-y-5">
						{borrowerPoints.map((item, i) => (
							<li key={i}>
								<p className="font-semibold text-gray-900 text-sm md:text-base">
									{item.title}
								</p>
								<p className="text-gray-600 text-sm md:text-base mt-0.5 leading-relaxed">
									{item.description}
								</p>
							</li>
						))}
					</ul>
				</motion.div>
			</div>

			{/* Middle column - graph + horizontal chips */}
			<div className="w-full lg:flex-1 flex flex-col justify-center px-0 lg:px-2 pt-4 lg:pt-6 pb-8 lg:pb-12 min-h-[420px] lg:min-h-[60vh] min-w-0 flex-shrink">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: "-50px" }}
					transition={{ duration: 0.5 }}
					className="w-full max-w-4xl mx-auto"
				>
					<div className="w-full flex flex-col min-h-[55vh] md:min-h-[60vh]">
						<AnimatedLenderGraph chipLayout="horizontal" />
					</div>
				</motion.div>
			</div>

			{/* Right column - Lenders card — extra bottom padding on mobile so card content isn't cut off */}
			<div className="w-full lg:w-1/4 flex-shrink-0 min-h-[200px] lg:min-h-0 flex flex-col justify-center pt-6 lg:pt-8 pb-12 lg:pb-16 lg:pr-0 mb-8 lg:mb-0">
				<motion.div
					initial={{ opacity: 0, y: 24, scale: 0.96 }}
					whileInView={{ opacity: 1, y: 0, scale: 1 }}
					viewport={{ once: true, margin: "-50px" }}
					transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
					className="w-full max-w-sm ml-auto bg-white rounded-3xl shadow-lg p-6 lg:p-8 relative overflow-hidden"
					style={{
						boxShadow:
							"0 4px 24px -4px rgba(0, 0, 0, 0.12), 0 1.5px 6px -1.5px rgba(0, 0, 0, 0.08)",
					}}
				>
					<div className="absolute left-0 top-6 bottom-6 w-[3px] rounded-full bg-gradient-to-b from-blue-400 via-blue-500 to-blue-400 opacity-60" />
					<h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6">
						Lenders
					</h2>
					<ul className="space-y-5">
						{lenderPoints.map((item, i) => (
							<li key={i}>
								<p className="font-semibold text-gray-900 text-sm md:text-base">
									{item.title}
								</p>
								<p className="text-gray-600 text-sm md:text-base mt-0.5 leading-relaxed">
									{item.description}
								</p>
							</li>
						))}
					</ul>
				</motion.div>
			</div>
			</div>
		</section>
	);
}
