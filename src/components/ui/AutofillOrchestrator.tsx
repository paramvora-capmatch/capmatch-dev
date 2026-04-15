"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
	CheckCircle2,
	Loader2,
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
									<>
										<motion.div
											className="absolute inset-0 rounded-full border-4 border-blue-100"
											animate={{ scale: [1, 1.04, 1] }}
											transition={{ duration: 2, repeat: Infinity }}
										/>
										<motion.div
											className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-blue-300"
											animate={{ rotate: 360 }}
											transition={{
												duration: 1.2,
												repeat: Infinity,
												ease: "linear",
											}}
										/>
										<motion.div
											className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600"
											animate={{ scale: [1, 1.05, 1] }}
											transition={{ duration: 1.8, repeat: Infinity }}
										>
											<Loader2 className="h-5 w-5 animate-spin" />
										</motion.div>
									</>
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
