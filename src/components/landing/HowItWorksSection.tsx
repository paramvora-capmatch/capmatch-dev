"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  Steps data                                                         */
/* ------------------------------------------------------------------ */

const steps: {
	title: string;
	shortTitle: string;
	description: string;
	youtubeEmbedId: string;
	localVideoSrc?: string;
}[] = [
	{
		title: "One Vault. One Truth.",
		shortTitle: "One Vault",
		description:
			"Upload your entire deal package - rent rolls, T12s, appraisals - into a secure, centralized vault. No more email attachments. No more version chaos. Everyone works from the same verified files.",
		youtubeEmbedId: "",
		localVideoSrc: "/Landing-Page/HowItWorksClips/Clip2.mp4",
	},
	{
		title: "Control Who Sees What",
		shortTitle: "Permissions",
		description:
			"Invite analysts, advisors, or external partners to your deal - without giving up control. Set granular permissions at the project and document level, ensuring every team member, advisor or lender accesses only what they need. Your deal, your rules.",
		youtubeEmbedId: "",
		localVideoSrc: "/Landing-Page/HowItWorksClips/Clip1.mp4",
	},
	{
		title: "Edit In-Browser. Roll Back Instantly.",
		shortTitle: "Edit & Version",
		description:
			"Open and edit documents directly in CapMatch with our built-in office suite. Every change is tracked automatically, and full version history means you can roll back in one click. The integrity of your deal stays protected and you're saved from email attachment purgatory.",
		youtubeEmbedId: "",
		localVideoSrc: "/Landing-Page/HowItWorksClips/Clip3.mp4",
	},
	{
		title: "From Documents to Data - Automatically.",
		shortTitle: "AutoFill",
		description:
			"Stop retyping what's already in your files. AutoFill extracts data directly from uploaded documents and cites its sources - hover over any field to see exactly where the value came from. Our system will flag discrepancies, resolve conflicts, and help you lock fields to signal verified, finalized data.",
		youtubeEmbedId: "",
		localVideoSrc: "/Landing-Page/HowItWorksClips/Clip4.mp4",
	},
	{
		title: "AI Speed. Human Oversight.",
		shortTitle: "AI Agent",
		description:
			"Let AI draft the financial picture from your P&L and help resolve data conflicts in real time. You stay in control - refine narratives, adjust bios, and verify every output. It's a hybrid workflow built for accuracy at scale.",
		youtubeEmbedId: "",
		localVideoSrc: "/Landing-Page/HowItWorksClips/Clip5.mp4",
	},
	{
		title: "Keep the Conversation Next to the Deal.",
		shortTitle: "Communication",
		description:
			"Keep everyone in the loop with an in-built notification system. Tag team members and documents in contextual chat. Schedule video meetings without leaving the platform. Every call generates searchable transcripts and summaries automatically - so nothing slips through the cracks.",
		youtubeEmbedId: "",
		localVideoSrc: "/Landing-Page/HowItWorksClips/Clip6.mp4",
	},
	{
		title: "A Living OM. Not a Static PDF.",
		shortTitle: "Living OM",
		description:
			"Your Offering Memorandum generates automatically and stays current. Lenders can toggle financial scenarios, explore architectural plans, and interrogate the deal directly with Talk to OM - asking complex questions and generating custom projections from your verified data.",
		youtubeEmbedId: "",
		localVideoSrc: "/Landing-Page/HowItWorksClips/Clip7.mp4",
	},
	{
		title: "Generate. Review. Finalize.",
		shortTitle: "Underwriting",
		description:
			"Produce lender-ready underwriting documents in minutes, not days. Every version is tracked, every change is logged. When it's time to close, your documentation is airtight and audit-ready.",
		youtubeEmbedId: "",
		localVideoSrc: "/Landing-Page/HowItWorksClips/Clip8.mp4",
	},
];

const FALLBACK_SLIDE_MS = 15000;

/* ------------------------------------------------------------------ */
/*  Slide video                                                        */
/* ------------------------------------------------------------------ */

function SlideVideo({
	step,
	isActive,
	onProgress,
	onComplete,
}: {
	step: (typeof steps)[0];
	isActive: boolean;
	onProgress?: (pct: number) => void;
	onComplete?: () => void;
}) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [progress, setProgress] = useState(0);

	const handleTimeUpdate = useCallback(() => {
		const video = videoRef.current;
		if (video && video.duration && video.duration > 0) {
			const pct = (video.currentTime / video.duration) * 100;
			setProgress(pct);
			onProgress?.(pct);
		}
	}, [onProgress]);

	const handleEnded = useCallback(() => {
		onComplete?.();
	}, [onComplete]);

	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;
		if (isActive) {
			video.currentTime = 0;
			setProgress(0);
			onProgress?.(0);
			video.play().catch(() => {});
		} else {
			video.pause();
		}
	}, [isActive, onProgress]);

	useEffect(() => {
		if (isActive && onComplete && (step.youtubeEmbedId || (!step.youtubeEmbedId && !step.localVideoSrc))) {
			const t = setTimeout(onComplete, FALLBACK_SLIDE_MS);
			return () => clearTimeout(t);
		}
	}, [step.youtubeEmbedId, step.localVideoSrc, isActive, onComplete]);

	if (step.youtubeEmbedId) {
		return (
			<iframe
				className="w-full aspect-video rounded-2xl"
				src={`https://www.youtube.com/embed/${step.youtubeEmbedId}?rel=0&autoplay=1&mute=1&loop=1&playlist=${step.youtubeEmbedId}`}
				title={step.title}
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
				allowFullScreen
			/>
		);
	}

	if (step.localVideoSrc) {
		return (
			<div className="w-full rounded-2xl overflow-hidden border border-gray-200">
				<video
					ref={videoRef}
					className="w-full aspect-video object-cover"
					src={step.localVideoSrc}
					title={step.title}
					playsInline
					muted
					onTimeUpdate={handleTimeUpdate}
					onEnded={handleEnded}
				/>
				<div className="w-full h-[3px] bg-gray-200">
					<div
						className="h-full bg-blue-500 transition-[width] duration-150 ease-linear"
						style={{ width: `${progress}%` }}
					/>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full aspect-video flex items-center justify-center bg-gray-100 text-gray-500 text-sm rounded-2xl">
			Video placeholder
		</div>
	);
}

/* ------------------------------------------------------------------ */
/*  Timeline                                                           */
/* ------------------------------------------------------------------ */

function Timeline({
	activeIndex,
	onSelect,
	progressPct,
}: {
	activeIndex: number;
	onSelect: (i: number) => void;
	progressPct: number;
}) {
	const total = steps.length;

	return (
		<div className="w-full px-4 sm:px-6 lg:px-0">
			{/* The rail + dots (desktop) */}
			<div className="relative hidden lg:block">
				{/* Background rail */}
				<div className="absolute top-[11px] left-0 right-0 h-[3px] bg-gray-200 rounded-full" />
				{/* Filled rail up to active dot */}
				<div
					className="absolute top-[11px] left-0 h-[3px] bg-blue-500 rounded-full transition-all duration-500 ease-out"
					style={{
						width: `${(activeIndex / (total - 1)) * 100}%`,
					}}
				/>
				{/* Active segment fill (between current and next dot, or last-to-first when on final) */}
				{activeIndex < total - 1 && (
					<div
						className="absolute top-[11px] h-[3px] bg-blue-300 rounded-full transition-[width] duration-150 ease-linear"
						style={{
							left: `${(activeIndex / (total - 1)) * 100}%`,
							width: `${(progressPct / 100) * (1 / (total - 1)) * 100}%`,
						}}
					/>
				)}
				{activeIndex === total - 1 && progressPct > 0 && (
					<div
						className="absolute top-[11px] h-[3px] bg-blue-300 rounded-full transition-all duration-150 ease-linear"
						style={{
							right: 0,
							width: `${(progressPct / 100) * (1 / (total - 1)) * 100}%`,
							transformOrigin: "right center",
						}}
					/>
				)}
				{/* Dots + labels */}
				<div className="relative flex justify-between">
					{steps.map((step, i) => {
						const isActive = i === activeIndex;
						const isPast = i < activeIndex;
						return (
							<button
								key={i}
								onClick={() => onSelect(i)}
								className="flex flex-col items-center group cursor-pointer bg-transparent border-none p-0"
								style={{ width: `${100 / total}%` }}
							>
								<div
									className={`
										w-[22px] h-[22px] rounded-full border-2 transition-all duration-300 flex-shrink-0
										${isActive ? "bg-blue-500 border-blue-500 scale-125 shadow-lg shadow-blue-200" : ""}
										${isPast ? "bg-blue-500 border-blue-500" : ""}
										${!isActive && !isPast ? "bg-white border-gray-300 group-hover:border-blue-400 group-hover:scale-110" : ""}
									`}
								/>
								<span
									className={`
										mt-3 text-base lg:text-lg font-medium leading-snug text-center transition-colors duration-300 max-w-[110px] lg:max-w-[150px]
										${isActive ? "text-gray-900 font-bold" : "text-gray-500 group-hover:text-gray-700"}
									`}
								>
									{step.title}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* Mobile: compact counter + arrow buttons */}
			<div className="flex lg:hidden items-center justify-between gap-4">
				<button
					onClick={() => onSelect((activeIndex - 1 + total) % total)}
					className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 shadow-sm flex-shrink-0"
					aria-label="Previous step"
				>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
				</button>

				{/* Mini progress dots */}
				<div className="flex items-center gap-1.5 flex-wrap justify-center">
					{steps.map((_, i) => (
						<button
							key={i}
							onClick={() => onSelect(i)}
							className={`
								rounded-full transition-all duration-300 border-none p-0 cursor-pointer
								${i === activeIndex ? "w-6 h-2 bg-blue-500" : "w-2 h-2 bg-gray-300 hover:bg-gray-400"}
							`}
							aria-label={`Go to step ${i + 1}`}
						/>
					))}
				</div>

				<button
					onClick={() => onSelect((activeIndex + 1) % total)}
					className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 shadow-sm flex-shrink-0"
					aria-label="Next step"
				>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
				</button>
			</div>
		</div>
	);
}

/* ------------------------------------------------------------------ */
/*  Slide transition variants                                          */
/* ------------------------------------------------------------------ */

const slideVariants = {
	enter: (direction: number) => ({
		x: direction > 0 ? 80 : -80,
		opacity: 0,
	}),
	center: {
		x: 0,
		opacity: 1,
	},
	exit: (direction: number) => ({
		x: direction > 0 ? -80 : 80,
		opacity: 0,
	}),
};

/* ------------------------------------------------------------------ */
/*  Main section                                                       */
/* ------------------------------------------------------------------ */

export function HowItWorksSection() {
	const [activeIndex, setActiveIndex] = useState(0);
	const [direction, setDirection] = useState(1);
	const [progressPct, setProgressPct] = useState(0);
	const sectionRef = useRef<HTMLElement>(null);
	const [isInView, setIsInView] = useState(false);

	const total = steps.length;

	const goTo = useCallback(
		(index: number, dir?: number) => {
			setDirection(dir ?? (index > activeIndex ? 1 : -1));
			setActiveIndex(index);
			setProgressPct(0);
		},
		[activeIndex]
	);

	const handleVideoComplete = useCallback(() => {
		setDirection(1);
		setActiveIndex((prev) => (prev + 1) % total);
		setProgressPct(0);
	}, [total]);

	/* Intersection observer - only run carousel when section is visible */
	useEffect(() => {
		const section = sectionRef.current;
		if (!section) return;
		const observer = new IntersectionObserver(
			([entry]) => setIsInView(entry.isIntersecting),
			{ threshold: 0.15 }
		);
		observer.observe(section);
		return () => observer.disconnect();
	}, []);

	const step = steps[activeIndex];

	return (
		<section
			id="how-it-works"
			ref={sectionRef}
			className="relative w-full"
		>
			<div className="w-full max-w-[90%] 2xl:max-w-[1600px] mx-auto pt-20 lg:pt-28 px-6 sm:px-8 lg:px-12 pb-20 lg:pb-28">
				{/* Section header */}
				<motion.div
					className="text-center mb-10 lg:mb-14"
					initial={{ opacity: 0, y: 12 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: "-80px" }}
					transition={{ duration: 0.4 }}
				>
					<h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4">
						Operating System
					</h2>
					<p className="text-xl md:text-2xl text-gray-500">
						CapMatch isn&apos;t software. It&apos;s infrastructure - built to move
						capital, and paid on performance.
					</p>
				</motion.div>

				{/* Carousel card */}
				<div className="relative w-full mb-10 lg:mb-14">
					<div
						className="w-full rounded-3xl bg-white overflow-hidden border-2 border-black"
						style={{
							boxShadow:
								"0 25px 32px -5px rgba(0, 0, 0, 0.22), 0 10px 12px -6px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(0, 0, 0, 0.15)",
							minHeight: "420px",
						}}
					>
						<AnimatePresence mode="wait" custom={direction}>
							<motion.div
								key={activeIndex}
								custom={direction}
								variants={slideVariants}
								initial="enter"
								animate="center"
								exit="exit"
								transition={{
									duration: 0.5,
									ease: [0.22, 1, 0.36, 1],
								}}
								className="flex flex-col lg:flex-row w-full"
							>
								{/* Text side */}
								<div className="w-full lg:w-[35%] flex flex-col justify-center p-8 lg:p-12 relative">
									{/* Blue accent bar */}
									<div className="absolute left-0 top-8 bottom-8 w-[3px] rounded-full bg-gradient-to-b from-blue-400 via-blue-500 to-blue-400 opacity-60 hidden lg:block" />
									<div className="lg:pl-4">
										<h3 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-4">
											{step.title}
										</h3>
										<p className="text-base md:text-lg text-gray-600 leading-relaxed">
											{step.description}
										</p>
									</div>
								</div>
								{/* Video side */}
								<div className="w-full lg:w-[65%] p-4 lg:p-6 flex items-center">
									<SlideVideo
									step={step}
									isActive={isInView}
									onProgress={setProgressPct}
									onComplete={handleVideoComplete}
								/>
								</div>
							</motion.div>
						</AnimatePresence>
					</div>
				</div>

				{/* Timeline */}
				<Timeline
					activeIndex={activeIndex}
					onSelect={(i) => goTo(i)}
					progressPct={progressPct}
				/>
			</div>
		</section>
	);
}
