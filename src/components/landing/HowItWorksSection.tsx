"use client";

import React from "react";
import { motion } from "framer-motion";

import { AnimatedLenderGraph } from "../graph/AnimatedLenderGraph";

const steps: {
	title: string;
	description: string;
	/** YouTube embed video ID (e.g. Suy8VlbZ1yY). Leave empty for placeholder. */
	youtubeEmbedId: string;
	showGraph?: boolean;
}[] = [
		{
			title: "Upload, AI Auto-Fill & Lender-Ready Resumes",
			description:
				"Drop in whatever you have-PDF, Excel, Word. Our AI extracts data and populates project and borrower resumes automatically. Complete profiles with version history, real-time collaboration, and AI validation.",
			youtubeEmbedId: "vtNPigx49gQ",
		},
		{
			title: "CapMatch Platform",
			description:
				"In-app communications, meeting scheduling, support chat, and document version control. Everything you need to manage deals and collaborate with lenders lives inside the platform.",
			youtubeEmbedId: "cC5d4nWtskU",
		},
		{
			title: "Live Offering Memorandum & Underwriting Documentation",
			description:
				"Dynamic OM dashboard-not a static PDF. Deal snapshots, market maps, scenario modeling. Plus full underwriting documentation so lenders have everything they need in one place.",
			youtubeEmbedId: "IK8B8306ILc",
		},
		{
			title: "Intelligent Lender Matching & Personalized Delivery",
			description:
				"AI-powered matching by asset, deal type, and location. LenderLine™ visualizes your ideal capital partners. Materials are then formatted for each lender's preferences-PDF, Excel, or live dashboard.",
			youtubeEmbedId: "", // No video yet
			showGraph: true,
		},
	];

function VideoBlock({ step, index }: { step: (typeof steps)[0]; index: number }) {
	return (
		<div className="w-full lg:w-[70%] min-h-0 flex items-center justify-center px-4">
			<motion.div
				initial={{ opacity: 0, y: 12 }}
				whileInView={{ opacity: 1, y: 0 }}
				viewport={{ once: true, margin: "-80px" }}
				transition={{ duration: 0.4 }}
				className="w-full aspect-video rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-xl"
				style={{
					boxShadow:
						"0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)",
				}}
			>
				{step.showGraph ? (
					<AnimatedLenderGraph />
				) : step.youtubeEmbedId ? (
					<iframe
						className="w-full h-full"
						src={`https://www.youtube.com/embed/${step.youtubeEmbedId}?rel=0&autoplay=1&mute=1&loop=1&playlist=${step.youtubeEmbedId}`}
						title={step.title}
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
						allowFullScreen
					/>
				) : (
					<div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
						Video coming soon
					</div>
				)}
			</motion.div>
		</div>
	);
}

function TextBlock({ step }: { step: (typeof steps)[0] }) {
	return (
		<div className="w-full lg:w-[30%] min-h-0 flex flex-col justify-center px-4 lg:px-6">
			<motion.div
				initial={{ opacity: 0, y: 12 }}
				whileInView={{ opacity: 1, y: 0 }}
				viewport={{ once: true, margin: "-80px" }}
				transition={{ duration: 0.4 }}
				className="w-full max-w-sm"
			>
				<h3 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-4">
					{step.title}
				</h3>
				<p className="text-lg md:text-xl text-gray-600 leading-relaxed pl-0">
					{step.description}
				</p>
			</motion.div>
		</div>
	);
}

export function HowItWorksSection() {
	return (
		<section
			id="how-it-works"
			className="relative w-full bg-white"
			style={{
				backgroundImage: `
					repeating-linear-gradient(
						45deg,
						transparent,
						transparent 10px,
						rgba(209, 213, 219, 0.22) 10px,
						rgba(209, 213, 219, 0.22) 11px
					),
					repeating-linear-gradient(
						-45deg,
						transparent,
						transparent 10px,
						rgba(209, 213, 219, 0.22) 10px,
						rgba(209, 213, 219, 0.22) 11px
					)
				`,
			}}
		>
			{/* Section title - centered */}
			<div className="w-full max-w-[90%] 2xl:max-w-[1600px] mx-auto pt-16 lg:pt-24 px-6 sm:px-8 lg:px-12 pb-2">
				<motion.div
					className="text-center"
					initial={{ opacity: 0, y: 12 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: "-80px" }}
					transition={{ duration: 0.4 }}
				>
					<h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4">
						Operating System
					</h2>
					<p className="text-xl md:text-2xl text-gray-500">
						From messy documents to funded loan - one vertically integrated
						platform.
					</p>
				</motion.div>
			</div>
			{steps.map((step, index) => {
				const videoOnRight = index % 2 === 0;
				return (
					<div
						key={index}
						className={`min-h-[50vh] flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-12 w-full max-w-[90%] 2xl:max-w-[1600px] mx-auto px-6 sm:px-8 lg:px-12 ${index === 0 ? "pt-6 lg:pt-10 pb-16 lg:pb-24" : "py-16 lg:py-24"}`}
					>
						{videoOnRight ? (
							<>
								<TextBlock step={step} />
								<VideoBlock step={step} index={index} />
							</>
						) : (
							<>
								<VideoBlock step={step} index={index} />
								<TextBlock step={step} />
							</>
						)}
					</div>
				);
			})}
		</section>
	);
}

