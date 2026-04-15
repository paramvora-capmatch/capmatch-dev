"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
	CheckCircle2,
	Sparkles,
} from "lucide-react";
import {
	type AutofillContext,
	type AutofillPhase,
	type AutofillProgressMetadata,
} from "@/types/jobs";

interface AutofillOrchestratorProps {
	isActive: boolean;
	context: AutofillContext;
	phase: AutofillPhase;
	metadata: AutofillProgressMetadata;
}

const PHASES: Array<{
	id: AutofillPhase;
	label: string;
	subtext: string;
}> = [
	{
		id: "initializing",
		label: "Preparing autofill...",
		subtext: "Connecting to the processing pipeline and getting everything ready.",
	},
	{
		id: "doc_scanning",
		label: "Scanning documents...",
		subtext: "Reading uploaded files, OCR output, and document structure.",
	},
	{
		id: "doc_extracting",
		label: "Extracting document data...",
		subtext: "Mapping each subsection to the most relevant document evidence.",
	},
	{
		id: "kb_querying",
		label: "Querying knowledge base...",
		subtext: "Pulling market, economic, and local context from external sources.",
	},
	{
		id: "ai_merging",
		label: "Reconciling data with AI...",
		subtext: "Combining document evidence with knowledge-base signals and sanity checks.",
	},
	{
		id: "saving",
		label: "Writing results...",
		subtext: "Saving the reconciled payload into your resume.",
	},
	{
		id: "completed",
		label: "Autofill complete",
		subtext: "Your resume has been refreshed with the latest autofill results.",
	},
];

const BLUE_500 = "#3b82f6";
const BLUE_300 = "#93c5fd";
const BLUE_100 = "#dbeafe";
const BLUE_50 = "#eff6ff";

const EXTRACTION_CELLS = [
	{ id: "cell-1", x: 14, y: 14, delay: 0 },
	{ id: "cell-2", x: 24, y: 14, delay: 0.1 },
	{ id: "cell-3", x: 34, y: 14, delay: 0.2 },
	{ id: "cell-4", x: 14, y: 24, delay: 0.3 },
	{ id: "cell-5", x: 24, y: 24, delay: 0.4 },
	{ id: "cell-6", x: 34, y: 24, delay: 0.5 },
	{ id: "cell-7", x: 14, y: 34, delay: 0.6 },
	{ id: "cell-8", x: 24, y: 34, delay: 0.7 },
	{ id: "cell-9", x: 34, y: 34, delay: 0.8 },
];

const NETWORK_LINES = [
	{ id: "north", x2: 28, y2: 10, delay: 0 },
	{ id: "east", x2: 46, y2: 28, delay: 0.2 },
	{ id: "south", x2: 28, y2: 46, delay: 0.4 },
	{ id: "west", x2: 10, y2: 28, delay: 0.6 },
];

const NETWORK_NODES = [
	{ id: "north-node", cx: 28, cy: 10, delay: 0 },
	{ id: "east-node", cx: 46, cy: 28, delay: 0.2 },
	{ id: "south-node", cx: 28, cy: 46, delay: 0.4 },
	{ id: "west-node", cx: 10, cy: 28, delay: 0.6 },
];

const LEFT_PARTICLES = [
	{ id: "left-1", cx: 11, cy: 18, delay: 0 },
	{ id: "left-2", cx: 13, cy: 28, delay: 0.2 },
	{ id: "left-3", cx: 11, cy: 38, delay: 0.4 },
];

const RIGHT_PARTICLES = [
	{ id: "right-1", cx: 45, cy: 18, delay: 0.1 },
	{ id: "right-2", cx: 43, cy: 28, delay: 0.3 },
	{ id: "right-3", cx: 45, cy: 38, delay: 0.5 },
];

function InitializingAnimation() {
	return (
		<motion.svg
			viewBox="0 0 56 56"
			className="h-14 w-14"
			fill="none"
			aria-hidden="true"
		>
			<circle cx="28" cy="28" r="24" fill={BLUE_50} />
			<motion.circle
				cx="28"
				cy="28"
				r="19"
				stroke={BLUE_100}
				strokeWidth="2.5"
				strokeDasharray="18 10"
				animate={{ strokeDashoffset: [0, -56] }}
				transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
			/>
			<motion.circle
				cx="28"
				cy="28"
				r="14"
				stroke={BLUE_300}
				strokeWidth="2.5"
				strokeDasharray="10 8"
				animate={{ strokeDashoffset: [0, 36] }}
				transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
			/>
			<motion.circle
				cx="28"
				cy="28"
				r="9"
				stroke={BLUE_500}
				strokeWidth="2.5"
				strokeDasharray="8 6"
				animate={{ strokeDashoffset: [0, -20] }}
				transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
			/>
			<motion.circle
				cx="28"
				cy="28"
				r="4.5"
				fill={BLUE_500}
				animate={{
					r: [4, 5.5, 4],
					opacity: [0.7, 1, 0.7],
				}}
				transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
			/>
		</motion.svg>
	);
}

function DocumentScanningAnimation() {
	return (
		<motion.svg
			viewBox="0 0 56 56"
			className="h-14 w-14"
			fill="none"
			aria-hidden="true"
		>
			<circle cx="28" cy="28" r="24" fill={BLUE_50} />
			<path
				d="M17 10h16l8 8v21a7 7 0 0 1-7 7H17a7 7 0 0 1-7-7V17a7 7 0 0 1 7-7Z"
				fill="white"
				stroke={BLUE_100}
				strokeWidth="2"
			/>
			<path d="M33 10v8h8" stroke={BLUE_300} strokeWidth="2" strokeLinecap="round" />
			<rect x="17" y="23" width="18" height="2.5" rx="1.25" fill={BLUE_100} />
			<rect x="17" y="28" width="13" height="2.5" rx="1.25" fill={BLUE_100} />
			<rect x="17" y="33" width="16" height="2.5" rx="1.25" fill={BLUE_100} />
			<motion.rect
				x="14"
				y="18"
				width="28"
				height="4.5"
				rx="2.25"
				fill={BLUE_300}
				opacity="0.35"
				animate={{ y: [18, 34, 18], opacity: [0, 0.45, 0] }}
				transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
			/>
			<motion.rect
				x="14"
				y="20"
				width="28"
				height="1.75"
				rx="0.875"
				fill={BLUE_500}
				animate={{ y: [20, 36, 20] }}
				transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
			/>
		</motion.svg>
	);
}

function DocumentExtractingAnimation() {
	return (
		<motion.svg
			viewBox="0 0 56 56"
			className="h-14 w-14"
			fill="none"
			aria-hidden="true"
		>
			<circle cx="28" cy="28" r="24" fill={BLUE_50} />
			<rect x="11" y="11" width="34" height="34" rx="11" fill="white" stroke={BLUE_100} strokeWidth="2" />
			{EXTRACTION_CELLS.map((cell, index) => (
				<motion.rect
					key={cell.id}
					x={cell.x}
					y={cell.y}
					width="8"
					height="8"
					rx="2.5"
					fill={index % 3 === 1 ? BLUE_300 : BLUE_500}
					animate={{
						opacity: [0.25, 1, 0.35],
						fill: [BLUE_100, index % 2 === 0 ? BLUE_500 : BLUE_300, BLUE_300],
					}}
					transition={{
						duration: 1.8,
						delay: cell.delay,
						repeat: Infinity,
						ease: "easeInOut",
					}}
				/>
			))}
		</motion.svg>
	);
}

function KnowledgeBaseAnimation() {
	return (
		<motion.svg
			viewBox="0 0 56 56"
			className="h-14 w-14"
			fill="none"
			aria-hidden="true"
		>
			<circle cx="28" cy="28" r="24" fill={BLUE_50} />
			<motion.circle
				cx="28"
				cy="28"
				r="18"
				stroke={BLUE_100}
				strokeWidth="2"
				strokeDasharray="6 6"
				animate={{ strokeDashoffset: [0, -24] }}
				transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
			/>
			{NETWORK_LINES.map((line) => (
				<motion.line
					key={line.id}
					x1="28"
					y1="28"
					x2={line.x2}
					y2={line.y2}
					stroke={BLUE_300}
					strokeWidth="2"
					strokeLinecap="round"
					animate={{ opacity: [0.25, 0.95, 0.25] }}
					transition={{
						duration: 1.8,
						delay: line.delay,
						repeat: Infinity,
						ease: "easeInOut",
					}}
				/>
			))}
			{NETWORK_NODES.map((node) => (
				<motion.circle
					key={node.id}
					cx={node.cx}
					cy={node.cy}
					r="3.5"
					fill={BLUE_500}
					animate={{
						r: [3, 4.1, 3],
						opacity: [0.7, 1, 0.7],
					}}
					transition={{
						duration: 1.8,
						delay: node.delay,
						repeat: Infinity,
						ease: "easeInOut",
					}}
				/>
			))}
			<motion.circle
				cx="28"
				cy="28"
				r="5"
				fill={BLUE_500}
				animate={{
					r: [4.5, 5.5, 4.5],
					opacity: [0.75, 1, 0.75],
				}}
				transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
			/>
		</motion.svg>
	);
}

function AiMergingAnimation() {
	return (
		<motion.svg
			viewBox="0 0 56 56"
			className="h-14 w-14"
			fill="none"
			aria-hidden="true"
		>
			<circle cx="28" cy="28" r="24" fill={BLUE_50} />
			<path
				d="M10 18c8 0 10 10 18 10"
				stroke={BLUE_100}
				strokeWidth="2"
				strokeLinecap="round"
			/>
			<path
				d="M46 18c-8 0-10 10-18 10"
				stroke={BLUE_100}
				strokeWidth="2"
				strokeLinecap="round"
			/>
			<path
				d="M10 38c8 0 10-10 18-10"
				stroke={BLUE_100}
				strokeWidth="2"
				strokeLinecap="round"
			/>
			<path
				d="M46 38c-8 0-10-10-18-10"
				stroke={BLUE_100}
				strokeWidth="2"
				strokeLinecap="round"
			/>
			{LEFT_PARTICLES.map((particle) => (
				<motion.circle
					key={particle.id}
					cx={particle.cx}
					cy={particle.cy}
					r="2.5"
					fill={BLUE_300}
					animate={{
						cx: [particle.cx, 25, particle.cx],
						opacity: [0, 1, 0],
					}}
					transition={{
						duration: 2.2,
						delay: particle.delay,
						repeat: Infinity,
						ease: "easeInOut",
					}}
				/>
			))}
			{RIGHT_PARTICLES.map((particle) => (
				<motion.circle
					key={particle.id}
					cx={particle.cx}
					cy={particle.cy}
					r="2.5"
					fill={BLUE_500}
					animate={{
						cx: [particle.cx, 31, particle.cx],
						opacity: [0, 1, 0],
					}}
					transition={{
						duration: 2.2,
						delay: particle.delay,
						repeat: Infinity,
						ease: "easeInOut",
					}}
				/>
			))}
			<motion.path
				d="M28 20l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8Z"
				fill={BLUE_500}
				animate={{
					opacity: [0.7, 1, 0.7],
					scale: [0.92, 1.06, 0.92],
				}}
				transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
				style={{ transformOrigin: "28px 28px" }}
			/>
		</motion.svg>
	);
}

function SavingAnimation() {
	return (
		<motion.svg
			viewBox="0 0 56 56"
			className="h-14 w-14"
			fill="none"
			aria-hidden="true"
		>
			<circle cx="28" cy="28" r="24" fill={BLUE_50} />
			<motion.circle
				cx="28"
				cy="28"
				r="18"
				stroke={BLUE_100}
				strokeWidth="3"
				fill="none"
				strokeDasharray="18 10"
				animate={{ strokeDashoffset: [0, -56] }}
				transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
			/>
			<motion.circle
				cx="28"
				cy="28"
				r="14"
				stroke={BLUE_300}
				strokeWidth="2"
				fill="white"
				animate={{
					opacity: [0.6, 1, 0.6],
				}}
				transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
			/>
			<motion.path
				d="M20 28l5 5 11-11"
				stroke={BLUE_500}
				strokeWidth="3.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				animate={{
					pathLength: [0, 1, 1, 0],
					opacity: [0.3, 1, 1, 0.3],
				}}
				transition={{
					duration: 2.2,
					times: [0, 0.45, 0.8, 1],
					repeat: Infinity,
					ease: "easeInOut",
				}}
			/>
		</motion.svg>
	);
}

function PhaseAnimation({ phase }: { phase: AutofillPhase }) {
	let animation: React.ReactNode;

	switch (phase) {
		case "doc_scanning":
			animation = <DocumentScanningAnimation />;
			break;
		case "doc_extracting":
			animation = <DocumentExtractingAnimation />;
			break;
		case "kb_querying":
			animation = <KnowledgeBaseAnimation />;
			break;
		case "ai_merging":
			animation = <AiMergingAnimation />;
			break;
		case "saving":
			animation = <SavingAnimation />;
			break;
		case "initializing":
		default:
			animation = <InitializingAnimation />;
			break;
	}

	return (
		<AnimatePresence mode="wait">
			<motion.div
				key={phase}
				className="absolute inset-0 flex items-center justify-center"
				initial={{ opacity: 0, scale: 0.94 }}
				animate={{ opacity: 1, scale: 1 }}
				exit={{ opacity: 0, scale: 1.04 }}
				transition={{ duration: 0.2 }}
			>
				{animation}
			</motion.div>
		</AnimatePresence>
	);
}

function buildDetailLine(
	context: AutofillContext,
	phase: AutofillPhase,
	metadata: AutofillProgressMetadata
) {
	const contextLabel =
		context === "borrower" ? "Borrower resume" : "Project resume";

	if (phase === "doc_scanning" && typeof metadata.total_docs === "number") {
		return `${metadata.total_docs} document${metadata.total_docs === 1 ? "" : "s"} queued for processing`;
	}
	if (
		phase === "doc_extracting" &&
		typeof metadata.total_subsections === "number"
	) {
		return `${metadata.total_subsections} subsection${metadata.total_subsections === 1 ? "" : "s"} being mapped`;
	}
	if (phase === "kb_querying" && Array.isArray(metadata.sources)) {
		return `${metadata.sources.length} data source${metadata.sources.length === 1 ? "" : "s"} being queried`;
	}
	if (
		phase === "ai_merging" &&
		(typeof metadata.doc_fields === "number" ||
			typeof metadata.kb_fields === "number")
	) {
		return `${metadata.doc_fields ?? 0} document fields + ${metadata.kb_fields ?? 0} knowledge-base fields`;
	}
	if (typeof metadata.total_docs === "number") {
		return `${contextLabel} autofill is in progress`;
	}
	return `${contextLabel} autofill is running`;
}

export function AutofillOrchestrator({
	isActive,
	context,
	phase,
	metadata,
}: AutofillOrchestratorProps) {
	const currentIndex = Math.max(
		0,
		PHASES.findIndex((item) => item.id === phase)
	);
	const activePhase = PHASES[currentIndex] ?? PHASES[0];
	const dotPhases = PHASES.filter((item) => item.id !== "completed");
	const detailLine = buildDetailLine(context, phase, metadata);
	const isComplete = phase === "completed";

	return (
		<AnimatePresence>
			{isActive ? (
				<motion.div
					className="fixed inset-0 z-[160] flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.2 }}
				>
					<motion.div
						className="w-full max-w-md rounded-2xl border border-blue-100 bg-white p-6 shadow-2xl shadow-black/15"
						initial={{ opacity: 0, y: 8, scale: 0.98 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 8, scale: 0.98 }}
						transition={{ duration: 0.18 }}
					>
						<div className="flex items-start gap-4">
							<div className="relative mt-0.5 flex h-14 w-14 shrink-0 items-center justify-center">
								{isComplete ? (
									<motion.div
										className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"
										initial={{ scale: 0.8, opacity: 0 }}
										animate={{ scale: 1, opacity: 1 }}
									>
										<CheckCircle2 className="h-7 w-7" />
									</motion.div>
								) : (
									<PhaseAnimation phase={phase} />
								)}
							</div>

							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-600">
									<Sparkles className="h-3.5 w-3.5" />
									{context === "borrower"
										? "Borrower resume autofill"
										: "Project resume autofill"}
								</div>
								<h3 className="mt-2 text-xl font-semibold text-slate-900">
									{activePhase.label}
								</h3>
								<p className="mt-1 text-sm leading-6 text-slate-600">
									{activePhase.subtext}
								</p>
								<p className="mt-2 text-sm text-slate-500">
									{detailLine}
								</p>
							</div>
						</div>

						<div className="mt-6">
							<div className="mb-3 flex items-center justify-between text-xs font-medium text-slate-500">
								<span>Progress</span>
								<span>
									{Math.min(currentIndex + 1, dotPhases.length)} of{" "}
									{dotPhases.length}
								</span>
							</div>
							<div className="flex items-center gap-2">
								{dotPhases.map((item) => {
									const itemIndex = PHASES.findIndex(
										(candidate) => candidate.id === item.id
									);
									const isDone = itemIndex < currentIndex;
									const isCurrent = item.id === phase;
									return (
										<motion.div
											key={item.id}
											className="flex-1"
											animate={{
												opacity: isDone || isCurrent ? 1 : 0.45,
											}}
										>
											<div className="h-2 rounded-full bg-slate-100">
												<motion.div
													className="h-2 rounded-full bg-blue-500"
													initial={false}
													animate={{
														width: isDone
															? "100%"
															: isCurrent
																? "55%"
																: "0%",
													}}
													transition={{ duration: 0.25 }}
												/>
											</div>
										</motion.div>
									);
								})}
							</div>
						</div>

						<div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-slate-600">
							Autofilling can take around 10 minutes. Please don&apos;t close this window while your documents are being processed.
						</div>
					</motion.div>
				</motion.div>
			) : null}
		</AnimatePresence>
	);
}
