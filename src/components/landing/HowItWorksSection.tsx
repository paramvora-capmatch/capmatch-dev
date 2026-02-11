"use client";

import React from "react";
import { motion } from "framer-motion";

const steps: {
	title: string;
	description: string;
	/** YouTube embed video ID (e.g. Suy8VlbZ1yY). Leave empty for placeholder. */
	youtubeEmbedId: string;
	/** Local video path (e.g. /Landing-Page/HowItWorksClips/Clip1.mp4). Used when youtubeEmbedId is empty. */
	localVideoSrc?: string;
}[] = [
		// 1. Secure Doc Storage
		{
			title: "One Vault. One Truth.",
			description:
				"Upload your entire deal package - rent rolls, T12s, appraisals - into a secure, centralized vault. No more email attachments. No more version chaos. Everyone works from the same verified files.",
			youtubeEmbedId: "",
			localVideoSrc: "/Landing-Page/HowItWorksClips/Clip2.mp4",
		},
		// 2. RBAC
		{
			title: "Control Who Sees What",
			description:
				"Invite analysts, advisors, or external partners to your deal - without giving up control. Set granular permissions at the project and document level, ensuring every team member, advisor or lender accesses only what they need. Your deal, your rules.",
			youtubeEmbedId: "",
			localVideoSrc: "/Landing-Page/HowItWorksClips/Clip1.mp4",
		},
		// 3. Document Editing & Version Control
		{
			title: "Edit In-Browser. Roll Back Instantly.",
			description:
				"Open and edit documents directly in CapMatch with our built-in office suite. Every change is tracked automatically, and full version history means you can roll back in one click. The integrity of your deal stays protected and you're saved from email attachment purgatory.",
			youtubeEmbedId: "",
			localVideoSrc: "/Landing-Page/HowItWorksClips/Clip3.mp4",
		},
		// 4. Resume Autofill
		{
			title: "From Documents to Data - Automatically.",
			description:
				"Stop retyping what's already in your files. AutoFill extracts data directly from uploaded documents and cites its sources - hover over any field to see exactly where the value came from. Our system will flag discrepancies, resolve conflicts, and help you lock fields to signal verified, finalized data.",
			youtubeEmbedId: "",
			localVideoSrc: "/Landing-Page/HowItWorksClips/Clip4.mp4",
		},
		// 5. AskAI for Resume (AI agent for underwriting)
		{
			title: "AI Speed. Human Oversight.",
			description:
				"Let AI draft the financial picture from your P&L and help resolve data conflicts in real time. You stay in control - refine narratives, adjust bios, and verify every output. It's a hybrid workflow built for accuracy at scale.",
			youtubeEmbedId: "",
			localVideoSrc: "/Landing-Page/HowItWorksClips/Clip5.mp4",
		},
		// 6. Communication
		{
			title: "Keep the Conversation Next to the Deal.",
			description:
				"Keep everyone in the loop with an in-built notification system. Tag team members and documents in contextual chat. Schedule video meetings without leaving the platform. Every call generates searchable transcripts and summaries automatically - so nothing slips through the cracks.",
			youtubeEmbedId: "",
			localVideoSrc: "/Landing-Page/HowItWorksClips/Clip6.mp4",
		},
		// 7. OM
		{
			title: "A Living OM. Not a Static PDF.",
			description:
				"Your Offering Memorandum generates automatically and stays current. Lenders can toggle financial scenarios, explore architectural plans, and interrogate the deal directly with Talk to OM - asking complex questions and generating custom projections from your verified data.",
			youtubeEmbedId: "",
			localVideoSrc: "/Landing-Page/HowItWorksClips/Clip7.mp4",
		},
		// 8. Underwriting Docs
		{
			title: "Generate. Review. Finalize.",
			description:
				"Produce lender-ready underwriting documents in minutes, not days. Every version is tracked, every change is logged. When it's time to close, your documentation is airtight and audit-ready.",
			youtubeEmbedId: "",
			localVideoSrc: "/Landing-Page/HowItWorksClips/Clip8.mp4",
		},
	];

function VideoBlock({ step, index }: { step: (typeof steps)[0]; index: number }) {
	return (
		<div className="w-full lg:w-[70%] min-h-0 flex items-center justify-center px-4">
			<motion.div
				initial={{ opacity: 0, y: 56, scale: 0.92 }}
				whileInView={{ opacity: 1, y: 0, scale: 1 }}
				viewport={{ once: false, amount: 0.2, margin: "-80px" }}
				transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
				className="w-full aspect-video rounded-3xl overflow-hidden border-2 border-black bg-white shadow-xl"
				style={{
					boxShadow:
						"0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.1)",
				}}
			>
				{step.youtubeEmbedId ? (
					<iframe
						className="w-full h-full"
						src={`https://www.youtube.com/embed/${step.youtubeEmbedId}?rel=0&autoplay=1&mute=1&loop=1&playlist=${step.youtubeEmbedId}`}
						title={step.title}
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
						allowFullScreen
					/>
				) : step.localVideoSrc ? (
					<video
						className="w-full h-full object-cover"
						src={step.localVideoSrc}
						title={step.title}
						playsInline
						muted
						loop
						autoPlay
						controls
					/>
				) : (
					<div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
						Video placeholder
					</div>
				)}
			</motion.div>
		</div>
	);
}

function TextBlock({
	step,
	isLeft,
}: {
	step: (typeof steps)[0];
	isLeft: boolean;
}) {
	return (
		<div className="w-full lg:w-[30%] min-h-0 flex flex-col justify-center px-4 lg:px-6">
			<motion.div
				initial={{ opacity: 0, y: 56, scale: 0.92 }}
				whileInView={{ opacity: 1, y: 0, scale: 1 }}
				viewport={{ once: false, amount: 0.2, margin: "-80px" }}
				transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
				className="w-full max-w-sm bg-white rounded-3xl shadow-lg p-6 lg:p-8 relative overflow-hidden"
				style={{
					boxShadow:
						"0 4px 24px -4px rgba(0, 0, 0, 0.12), 0 1.5px 6px -1.5px rgba(0, 0, 0, 0.08)",
				}}
			>
				{/* Blue accent bar on the connector-facing edge */}
				<div
					className={`absolute ${isLeft ? "right-0" : "left-0"} top-6 bottom-6 w-[3px] rounded-full bg-gradient-to-b from-blue-400 via-blue-500 to-blue-400 opacity-60`}
				/>
				<h3 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-3">
					{step.title}
				</h3>
				<p className="text-base md:text-lg text-gray-600 leading-relaxed">
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
					<React.Fragment key={index}>
						<div
							className={`min-h-[50vh] flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-12 w-full max-w-[90%] 2xl:max-w-[1600px] mx-auto px-6 sm:px-8 lg:px-12 ${index === 0 ? "pt-6 lg:pt-10" : "pt-8 lg:pt-12"} ${index < steps.length - 1 ? "pb-8 lg:pb-12" : "pb-16 lg:pb-24"}`}
						>
							{videoOnRight ? (
								<>
									<TextBlock step={step} isLeft />
									<VideoBlock step={step} index={index} />
								</>
							) : (
								<>
									<VideoBlock step={step} index={index} />
									<TextBlock step={step} isLeft={false} />
								</>
							)}
						</div>
					</React.Fragment>
				);
			})}
		</section>
	);
}

