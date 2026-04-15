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
const ORBITAL_DOTS = [
	{
		id: "orbital-1",
		orbit: 34,
		size: 6,
		duration: 4.2,
		delay: 0,
		color: BLUE_500,
		direction: 1,
	},
	{
		id: "orbital-2",
		orbit: 34,
		size: 4,
		duration: 3.6,
		delay: 0.35,
		color: BLUE_300,
		direction: -1,
	},
	{
		id: "orbital-3",
		orbit: 52,
		size: 5,
		duration: 5.2,
		delay: 0.15,
		color: BLUE_500,
		direction: -1,
	},
	{
		id: "orbital-4",
		orbit: 52,
		size: 3.5,
		duration: 4.5,
		delay: 0.55,
		color: BLUE_300,
		direction: 1,
	},
	{
		id: "orbital-5",
		orbit: 68,
		size: 4.5,
		duration: 6.2,
		delay: 0.2,
		color: BLUE_500,
		direction: 1,
	},
	{
		id: "orbital-6",
		orbit: 68,
		size: 3,
		duration: 5.6,
		delay: 0.7,
		color: BLUE_300,
		direction: -1,
	},
	{
		id: "orbital-7",
		orbit: 84,
		size: 4,
		duration: 7,
		delay: 0.3,
		color: BLUE_500,
		direction: -1,
	},
	{
		id: "orbital-8",
		orbit: 84,
		size: 2.5,
		duration: 6.4,
		delay: 0.8,
		color: BLUE_300,
		direction: 1,
	},
];

const SCAN_LINES = [
	{ id: "scan-line-1", y: 74, width: 68, delay: 0 },
	{ id: "scan-line-2", y: 92, width: 56, delay: 0.18 },
	{ id: "scan-line-3", y: 110, width: 72, delay: 0.34 },
	{ id: "scan-line-4", y: 128, width: 48, delay: 0.5 },
];

const SCAN_PARTICLES = [
	{ id: "scan-particle-1", x: 78, y: 86, delay: 0.1 },
	{ id: "scan-particle-2", x: 96, y: 114, delay: 0.35 },
	{ id: "scan-particle-3", x: 118, y: 100, delay: 0.6 },
	{ id: "scan-particle-4", x: 128, y: 126, delay: 0.85 },
	{ id: "scan-particle-5", x: 88, y: 132, delay: 1.1 },
];

const EXTRACTION_CELLS = Array.from({ length: 25 }, (_, index) => {
	const row = Math.floor(index / 5);
	const col = index % 5;
	const x = 60 + col * 17;
	const y = 60 + row * 17;
	const isPrimary = (row + col) % 2 === 0;

	return {
		id: `cell-${index + 1}`,
		x,
		y,
		cx: x + 7,
		cy: y + 7,
		delay: (row + col) * 0.12,
		activeColor: isPrimary ? BLUE_500 : BLUE_300,
		settledColor: isPrimary ? BLUE_300 : BLUE_100,
	};
});

const EXTRACTION_MESH_LINES = [
	{ id: "mesh-h-1", x1: 67, y1: 84, x2: 133, y2: 84, delay: 0.1 },
	{ id: "mesh-h-2", x1: 67, y1: 101, x2: 133, y2: 101, delay: 0.25 },
	{ id: "mesh-h-3", x1: 67, y1: 118, x2: 133, y2: 118, delay: 0.4 },
	{ id: "mesh-v-1", x1: 84, y1: 67, x2: 84, y2: 133, delay: 0.18 },
	{ id: "mesh-v-2", x1: 101, y1: 67, x2: 101, y2: 133, delay: 0.33 },
	{ id: "mesh-v-3", x1: 118, y1: 67, x2: 118, y2: 133, delay: 0.48 },
];

const KB_NODES = Array.from({ length: 8 }, (_, index) => {
	const angle = (Math.PI * 2 * index) / 8 - Math.PI / 2;
	const cx = 100 + 64 * Math.cos(angle);
	const cy = 100 + 64 * Math.sin(angle);

	return {
		id: `kb-node-${index + 1}`,
		cx,
		cy,
		midX: (cx + 100) / 2,
		midY: (cy + 100) / 2,
		delay: index * 0.18,
	};
});

const KB_RING_CONNECTIONS = KB_NODES.map((node, index) => {
	const nextNode = KB_NODES[(index + 1) % KB_NODES.length];
	return {
		id: `kb-ring-${index + 1}`,
		x1: node.cx,
		y1: node.cy,
		x2: nextNode.cx,
		y2: nextNode.cy,
		delay: index * 0.15,
	};
});

const AI_TRAILS_LEFT = [
	{ id: "ai-left-trail-1", d: "M22 58C50 52 74 72 100 100", delay: 0 },
	{ id: "ai-left-trail-2", d: "M18 82C48 78 76 86 100 100", delay: 0.18 },
	{ id: "ai-left-trail-3", d: "M18 118C50 122 78 112 100 100", delay: 0.36 },
	{ id: "ai-left-trail-4", d: "M22 142C54 148 80 126 100 100", delay: 0.54 },
];

const AI_TRAILS_RIGHT = [
	{ id: "ai-right-trail-1", d: "M178 58C150 52 126 72 100 100", delay: 0.1 },
	{ id: "ai-right-trail-2", d: "M182 82C152 78 124 86 100 100", delay: 0.28 },
	{ id: "ai-right-trail-3", d: "M182 118C150 122 122 112 100 100", delay: 0.46 },
	{ id: "ai-right-trail-4", d: "M178 142C146 148 120 126 100 100", delay: 0.64 },
];

const AI_LEFT_STREAMS = [
	{ id: "ai-left-stream-1", x: [22, 48, 76, 100], y: [58, 60, 78, 100], delay: 0 },
	{ id: "ai-left-stream-2", x: [16, 42, 72, 100], y: [78, 84, 90, 100], delay: 0.18 },
	{ id: "ai-left-stream-3", x: [14, 40, 70, 100], y: [100, 98, 100, 100], delay: 0.36 },
	{ id: "ai-left-stream-4", x: [18, 42, 72, 100], y: [122, 118, 112, 100], delay: 0.54 },
	{ id: "ai-left-stream-5", x: [24, 50, 78, 100], y: [142, 138, 120, 100], delay: 0.72 },
];

const AI_RIGHT_STREAMS = [
	{ id: "ai-right-stream-1", x: [178, 152, 124, 100], y: [58, 60, 78, 100], delay: 0.12 },
	{ id: "ai-right-stream-2", x: [184, 158, 128, 100], y: [78, 84, 90, 100], delay: 0.3 },
	{ id: "ai-right-stream-3", x: [186, 160, 130, 100], y: [100, 98, 100, 100], delay: 0.48 },
	{ id: "ai-right-stream-4", x: [182, 158, 128, 100], y: [122, 118, 112, 100], delay: 0.66 },
	{ id: "ai-right-stream-5", x: [176, 150, 122, 100], y: [142, 138, 120, 100], delay: 0.84 },
];

const SAVE_BLOCKS = Array.from({ length: 8 }, (_, index) => {
	const row = Math.floor(index / 4);
	const col = index % 4;
	return {
		id: `save-block-${index + 1}`,
		x: 57 + col * 22,
		finalY: 146 - row * 12,
		delay: index * 0.16,
		color: index % 2 === 0 ? BLUE_500 : BLUE_300,
	};
});

function AnimationCanvas({ children }: { children: React.ReactNode }) {
	return (
		<motion.svg
			viewBox="0 0 200 200"
			className="h-full w-full"
			fill="none"
			aria-hidden="true"
		>
			{children}
		</motion.svg>
	);
}

function AnimationBackdrop() {
	return (
		<>
			<circle cx="100" cy="100" r="94" fill={BLUE_50} />
			<circle cx="100" cy="100" r="84" fill="white" opacity="0.82" />
			<circle cx="100" cy="100" r="78" stroke={BLUE_100} strokeWidth="1.5" opacity="0.8" />
		</>
	);
}

function InitializingAnimation() {
	return (
		<AnimationCanvas>
			<AnimationBackdrop />
			{[0, 1.2, 2.4].map((delay) => (
				<motion.circle
					key={`pulse-${delay}`}
					cx="100"
					cy="100"
					r="26"
					stroke={BLUE_300}
					strokeWidth="2"
					opacity="0"
					animate={{
						r: [26, 88],
						opacity: [0, 0.22, 0],
					}}
					transition={{
						duration: 4,
						delay,
						repeat: Infinity,
						ease: "easeOut",
					}}
				/>
			))}
			<motion.g
				style={{ transformOrigin: "100px 100px" }}
				animate={{ rotate: 360 }}
				transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
			>
				<circle
					cx="100"
					cy="100"
					r="84"
					stroke={BLUE_100}
					strokeWidth="2"
					strokeDasharray="18 12"
				/>
			</motion.g>
			<motion.g
				style={{ transformOrigin: "100px 100px" }}
				animate={{ rotate: -360 }}
				transition={{ duration: 8.5, repeat: Infinity, ease: "linear" }}
			>
				<circle
					cx="100"
					cy="100"
					r="68"
					stroke={BLUE_300}
					strokeWidth="2.5"
					strokeDasharray="16 10"
				/>
			</motion.g>
			<motion.g
				style={{ transformOrigin: "100px 100px" }}
				animate={{ rotate: 360 }}
				transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
			>
				<circle
					cx="100"
					cy="100"
					r="52"
					stroke={BLUE_500}
					strokeWidth="2.5"
					strokeDasharray="12 8"
					opacity="0.8"
				/>
			</motion.g>
			<motion.g
				style={{ transformOrigin: "100px 100px" }}
				animate={{ rotate: -360 }}
				transition={{ duration: 5.8, repeat: Infinity, ease: "linear" }}
			>
				<circle
					cx="100"
					cy="100"
					r="36"
					stroke={BLUE_300}
					strokeWidth="2.5"
					strokeDasharray="10 8"
				/>
			</motion.g>
			{ORBITAL_DOTS.map((dot) => (
				<motion.g
					key={dot.id}
					style={{ transformOrigin: "100px 100px" }}
					animate={{ rotate: dot.direction * 360 }}
					transition={{
						duration: dot.duration,
						delay: dot.delay,
						repeat: Infinity,
						ease: "linear",
					}}
				>
					<circle cx="100" cy={100 - dot.orbit} r={dot.size} fill={dot.color} />
				</motion.g>
			))}
			<motion.circle
				cx="100"
				cy="100"
				r="28"
				fill={BLUE_100}
				style={{ transformOrigin: "100px 100px" }}
				animate={{
					scale: [1, 1.08, 1],
					opacity: [0.35, 0.6, 0.35],
				}}
				transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
			/>
			<motion.circle
				cx="100"
				cy="100"
				r="19"
				fill={BLUE_300}
				animate={{
					fill: [BLUE_300, BLUE_500, BLUE_300],
					opacity: [0.85, 1, 0.85],
				}}
				transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
			/>
			<motion.circle
				cx="100"
				cy="100"
				r="9"
				fill="white"
				animate={{
					r: [8, 11, 8],
					opacity: [0.75, 1, 0.75],
				}}
				transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
			/>
		</AnimationCanvas>
	);
}

function DocumentScanningAnimation() {
	return (
		<AnimationCanvas>
			<AnimationBackdrop />
			<motion.g
				style={{ transformOrigin: "100px 102px" }}
				animate={{ y: [4, -2, 4], rotate: [-3, -1, -3] }}
				transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut" }}
			>
				<rect
					x="34"
					y="48"
					width="92"
					height="116"
					rx="20"
					fill="white"
					stroke={BLUE_100}
					strokeWidth="2"
					opacity="0.5"
				/>
			</motion.g>
			<motion.g
				style={{ transformOrigin: "100px 100px" }}
				animate={{ y: [0, 3, 0], rotate: [-2, 1, -2] }}
				transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
			>
				<rect
					x="46"
					y="42"
					width="96"
					height="120"
					rx="21"
					fill="white"
					stroke={BLUE_100}
					strokeWidth="2"
					opacity="0.72"
				/>
			</motion.g>
			<motion.g
				style={{ transformOrigin: "106px 96px" }}
				animate={{ y: [0, -3, 0], rotate: [0.5, -0.8, 0.5] }}
				transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
			>
				<rect
					x="58"
					y="34"
					width="96"
					height="126"
					rx="22"
					fill="white"
					stroke={BLUE_300}
					strokeWidth="2.5"
				/>
				<path
					d="M132 34v22h22"
					stroke={BLUE_300}
					strokeWidth="2.5"
					strokeLinecap="round"
				/>
				{SCAN_LINES.map((line) => (
					<motion.rect
						key={line.id}
						x="76"
						y={line.y}
						width={line.width}
						height="8"
						rx="4"
						fill={BLUE_100}
						animate={{
							fill: [BLUE_100, BLUE_300, BLUE_100],
							opacity: [0.55, 1, 0.55],
						}}
						transition={{
							duration: 3.2,
							delay: line.delay,
							repeat: Infinity,
							ease: "easeInOut",
						}}
					/>
				))}
				<motion.rect
					x="64"
					y="52"
					width="90"
					height="18"
					rx="9"
					fill={BLUE_300}
					opacity="0"
					animate={{ y: [52, 140, 52], opacity: [0, 0.26, 0] }}
					transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
				/>
				<motion.rect
					x="64"
					y="60"
					width="90"
					height="4"
					rx="2"
					fill={BLUE_500}
					animate={{ y: [60, 148, 60] }}
					transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
				/>
			</motion.g>
			{SCAN_PARTICLES.map((particle) => (
				<motion.circle
					key={particle.id}
					cx={particle.x}
					cy={particle.y}
					r="3.5"
					fill={BLUE_300}
					animate={{
						cy: [particle.y, particle.y - 26, particle.y - 34],
						opacity: [0, 0.9, 0],
						scale: [0.85, 1.1, 0.85],
					}}
					transition={{
						duration: 2.8,
						delay: particle.delay,
						repeat: Infinity,
						ease: "easeOut",
					}}
				/>
			))}
			<motion.g
				style={{ transformOrigin: "100px 100px" }}
				animate={{ rotate: 360 }}
				transition={{ duration: 6.8, repeat: Infinity, ease: "linear" }}
			>
				<circle
					cx="154"
					cy="56"
					r="14"
					fill="white"
					stroke={BLUE_500}
					strokeWidth="3"
				/>
				<line
					x1="164"
					y1="66"
					x2="178"
					y2="80"
					stroke={BLUE_500}
					strokeWidth="4"
					strokeLinecap="round"
				/>
			</motion.g>
		</AnimationCanvas>
	);
}

function DocumentExtractingAnimation() {
	return (
		<AnimationCanvas>
			<AnimationBackdrop />
			<circle cx="100" cy="100" r="88" stroke={BLUE_100} strokeWidth="8" fill="none" />
			<motion.circle
				cx="100"
				cy="100"
				r="88"
				stroke={BLUE_300}
				strokeWidth="8"
				fill="none"
				strokeLinecap="round"
				transform="rotate(-90 100 100)"
				animate={{
					pathLength: [0.08, 1, 1, 0.08],
					opacity: [0.25, 1, 1, 0.25],
				}}
				transition={{
					duration: 3.2,
					times: [0, 0.55, 0.82, 1],
					repeat: Infinity,
					ease: "easeInOut",
				}}
			/>
			<rect
				x="46"
				y="46"
				width="108"
				height="108"
				rx="28"
				fill="white"
				stroke={BLUE_100}
				strokeWidth="2.5"
			/>
			{EXTRACTION_MESH_LINES.map((line) => (
				<motion.line
					key={line.id}
					x1={line.x1}
					y1={line.y1}
					x2={line.x2}
					y2={line.y2}
					stroke={BLUE_100}
					strokeWidth="2"
					strokeLinecap="round"
					animate={{ opacity: [0.1, 0.45, 0.14] }}
					transition={{
						duration: 2.4,
						delay: line.delay,
						repeat: Infinity,
						ease: "easeInOut",
					}}
				/>
			))}
			{EXTRACTION_CELLS.map((cell) => (
				<motion.rect
					key={cell.id}
					x={cell.x}
					y={cell.y}
					width="14"
					height="14"
					rx="4.5"
					fill={cell.activeColor}
					style={{ transformOrigin: `${cell.cx}px ${cell.cy}px` }}
					animate={{
						scale: [0.82, 1.14, 1],
						opacity: [0.32, 1, 0.86],
						fill: [BLUE_50, cell.activeColor, cell.settledColor],
					}}
					transition={{
						duration: 2.7,
						delay: cell.delay,
						repeat: Infinity,
						repeatDelay: 0.25,
						ease: "easeInOut",
					}}
				/>
			))}
			<motion.circle
				cx="100"
				cy="100"
				r="18"
				fill="white"
				animate={{ opacity: [0.55, 0.9, 0.55] }}
				transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
			/>
		</AnimationCanvas>
	);
}

function KnowledgeBaseAnimation() {
	return (
		<AnimationCanvas>
			<AnimationBackdrop />
			<motion.circle
				cx="100"
				cy="100"
				r="88"
				stroke={BLUE_100}
				strokeWidth="2"
				fill="none"
				strokeDasharray="16 12"
				animate={{ strokeDashoffset: [0, -84] }}
				transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
			/>
			<motion.circle
				cx="100"
				cy="100"
				r="74"
				stroke={BLUE_300}
				strokeWidth="1.5"
				fill="none"
				strokeDasharray="8 12"
				animate={{ strokeDashoffset: [0, 56] }}
				transition={{ duration: 6.8, repeat: Infinity, ease: "linear" }}
			/>
			{KB_RING_CONNECTIONS.map((line) => (
				<motion.line
					key={line.id}
					x1={line.x1}
					y1={line.y1}
					x2={line.x2}
					y2={line.y2}
					stroke={BLUE_100}
					strokeWidth="1.6"
					strokeLinecap="round"
					animate={{ opacity: [0.12, 0.38, 0.12] }}
					transition={{
						duration: 3.4,
						delay: line.delay,
						repeat: Infinity,
						ease: "easeInOut",
					}}
				/>
			))}
			{KB_NODES.map((node) => (
				<motion.line
					key={`${node.id}-hub-line`}
					x1={node.cx}
					y1={node.cy}
					x2="100"
					y2="100"
					stroke={BLUE_300}
					strokeWidth="2"
					strokeLinecap="round"
					animate={{ opacity: [0.18, 0.62, 0.18] }}
					transition={{
						duration: 2.8,
						delay: node.delay,
						repeat: Infinity,
						ease: "easeInOut",
					}}
				/>
			))}
			{KB_NODES.map((node) => (
				<React.Fragment key={node.id}>
					<motion.circle
						cx={node.cx}
						cy={node.cy}
						r="8"
						fill="white"
						stroke={BLUE_300}
						strokeWidth="2.5"
						animate={{
							scale: [1, 1.12, 1],
							opacity: [0.75, 1, 0.75],
						}}
						transition={{
							duration: 2.6,
							delay: node.delay,
							repeat: Infinity,
							ease: "easeInOut",
						}}
						style={{ transformOrigin: `${node.cx}px ${node.cy}px` }}
					/>
					<motion.circle
						cx={node.cx}
						cy={node.cy}
						r="3.5"
						fill={BLUE_500}
						animate={{
							r: [3, 5, 3],
							opacity: [0.65, 1, 0.65],
						}}
						transition={{
							duration: 2.6,
							delay: node.delay,
							repeat: Infinity,
							ease: "easeInOut",
						}}
					/>
					<motion.circle
						cx={node.cx}
						cy={node.cy}
						r="3"
						fill={BLUE_500}
						animate={{
							cx: [node.cx, node.midX, 100, node.cx],
							cy: [node.cy, node.midY, 100, node.cy],
							opacity: [0, 0.75, 1, 0],
						}}
						transition={{
							duration: 4.1,
							delay: node.delay,
							repeat: Infinity,
							ease: "easeInOut",
						}}
					/>
				</React.Fragment>
			))}
			<motion.circle
				cx="100"
				cy="100"
				r="22"
				fill={BLUE_100}
				style={{ transformOrigin: "100px 100px" }}
				animate={{
					scale: [1, 1.08, 1],
					opacity: [0.4, 0.7, 0.4],
				}}
				transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
			/>
			<motion.circle
				cx="100"
				cy="100"
				r="13"
				fill={BLUE_500}
				animate={{
					r: [11, 14, 11],
					opacity: [0.85, 1, 0.85],
				}}
				transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
			/>
		</AnimationCanvas>
	);
}

function AiMergingAnimation() {
	return (
		<AnimationCanvas>
			<AnimationBackdrop />
			{[0, 0.8, 1.6].map((delay) => (
				<motion.circle
					key={`merge-wave-${delay}`}
					cx="100"
					cy="100"
					r="18"
					stroke={BLUE_300}
					strokeWidth="2"
					opacity="0"
					animate={{
						r: [18, 82],
						opacity: [0, 0.24, 0],
					}}
					transition={{
						duration: 3.6,
						delay,
						repeat: Infinity,
						ease: "easeOut",
					}}
				/>
			))}
			<motion.circle
				cx="100"
				cy="100"
				r="88"
				stroke={BLUE_100}
				strokeWidth="4"
				fill="none"
				strokeLinecap="round"
				transform="rotate(-90 100 100)"
				animate={{
					pathLength: [0.12, 1, 1, 0.12],
					opacity: [0.12, 0.55, 0.55, 0.12],
				}}
				transition={{
					duration: 3.8,
					times: [0, 0.52, 0.82, 1],
					repeat: Infinity,
					ease: "easeInOut",
				}}
			/>
			{AI_TRAILS_LEFT.map((trail) => (
				<motion.path
					key={trail.id}
					d={trail.d}
					stroke={BLUE_100}
					strokeWidth="2.5"
					strokeLinecap="round"
					animate={{ opacity: [0.08, 0.36, 0.08] }}
					transition={{
						duration: 3.4,
						delay: trail.delay,
						repeat: Infinity,
						ease: "easeInOut",
					}}
				/>
			))}
			{AI_TRAILS_RIGHT.map((trail) => (
				<motion.path
					key={trail.id}
					d={trail.d}
					stroke={BLUE_100}
					strokeWidth="2.5"
					strokeLinecap="round"
					animate={{ opacity: [0.08, 0.36, 0.08] }}
					transition={{
						duration: 3.4,
						delay: trail.delay,
						repeat: Infinity,
						ease: "easeInOut",
					}}
				/>
			))}
			{AI_LEFT_STREAMS.map((stream) => (
				<motion.circle
					key={stream.id}
					cx={stream.x[0]}
					cy={stream.y[0]}
					r="4"
					fill={BLUE_300}
					animate={{
						cx: stream.x,
						cy: stream.y,
						opacity: [0, 0.45, 0.95, 0],
					}}
					transition={{
						duration: 3.5,
						delay: stream.delay,
						times: [0, 0.35, 0.78, 1],
						repeat: Infinity,
						ease: "easeInOut",
					}}
				/>
			))}
			{AI_RIGHT_STREAMS.map((stream) => (
				<motion.circle
					key={stream.id}
					cx={stream.x[0]}
					cy={stream.y[0]}
					r="4"
					fill={BLUE_500}
					animate={{
						cx: stream.x,
						cy: stream.y,
						opacity: [0, 0.45, 0.95, 0],
					}}
					transition={{
						duration: 3.5,
						delay: stream.delay,
						times: [0, 0.35, 0.78, 1],
						repeat: Infinity,
						ease: "easeInOut",
					}}
				/>
			))}
			<motion.g
				style={{ transformOrigin: "100px 100px" }}
				animate={{ rotate: [0, 180, 360], scale: [0.94, 1.08, 0.94] }}
				transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
			>
				<path
					d="M100 72l10 20 22 3-16 15 4 22-20-11-20 11 4-22-16-15 22-3Z"
					fill={BLUE_500}
				/>
				<circle cx="100" cy="100" r="7.5" fill="white" opacity="0.9" />
			</motion.g>
		</AnimationCanvas>
	);
}

function SavingAnimation() {
	return (
		<AnimationCanvas>
			<AnimationBackdrop />
			<circle cx="100" cy="100" r="78" stroke={BLUE_100} strokeWidth="8" fill="none" />
			<motion.circle
				cx="100"
				cy="100"
				r="78"
				stroke={BLUE_500}
				strokeWidth="8"
				fill="none"
				strokeLinecap="round"
				transform="rotate(-90 100 100)"
				animate={{
					pathLength: [0.05, 1, 1, 0.05],
					opacity: [0.2, 1, 1, 0.2],
				}}
				transition={{
					duration: 3.1,
					times: [0, 0.52, 0.82, 1],
					repeat: Infinity,
					ease: "easeInOut",
				}}
			/>
			<circle cx="100" cy="100" r="54" fill="white" stroke={BLUE_100} strokeWidth="2.5" />
			<rect
				x="52"
				y="138"
				width="96"
				height="20"
				rx="10"
				fill={BLUE_50}
				stroke={BLUE_100}
				strokeWidth="2"
			/>
			{SAVE_BLOCKS.map((block) => (
				<motion.rect
					key={block.id}
					x={block.x}
					y="40"
					width="16"
					height="10"
					rx="4"
					fill={block.color}
					animate={{
						y: [40, block.finalY - 14, block.finalY],
						opacity: [0, 1, 0.92],
						scale: [0.82, 1.08, 1],
					}}
					transition={{
						duration: 3,
						delay: block.delay,
						times: [0, 0.55, 1],
						repeat: Infinity,
						ease: "easeInOut",
					}}
				/>
			))}
			<motion.path
				d="M78 102l16 16 28-28"
				stroke={BLUE_500}
				strokeWidth="7"
				strokeLinecap="round"
				strokeLinejoin="round"
				animate={{
					pathLength: [0, 1, 1, 0],
					opacity: [0.2, 1, 1, 0.2],
				}}
				transition={{
					duration: 3.1,
					times: [0, 0.45, 0.82, 1],
					repeat: Infinity,
					ease: "easeInOut",
				}}
			/>
			<motion.rect
				x="-70"
				y="42"
				width="50"
				height="120"
				fill="white"
				opacity="0"
				transform="rotate(18 100 100)"
				animate={{ x: [-70, 205], opacity: [0, 0.28, 0] }}
				transition={{
					duration: 3.1,
					times: [0, 0.58, 1],
					repeat: Infinity,
					ease: "easeInOut",
				}}
			/>
		</AnimationCanvas>
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
				initial={{ opacity: 0, scale: 0.96, y: 6 }}
				animate={{ opacity: 1, scale: 1 }}
				exit={{ opacity: 0, scale: 1.04, y: -6 }}
				transition={{ duration: 0.28, ease: "easeOut" }}
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
						className="w-full max-w-lg rounded-[28px] border border-blue-100 bg-white px-6 py-7 shadow-2xl shadow-black/15 sm:px-8"
						initial={{ opacity: 0, y: 8, scale: 0.98 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 8, scale: 0.98 }}
						transition={{ duration: 0.18 }}
					>
						<div className="flex flex-col items-center text-center">
							<div className="relative flex h-[200px] w-[200px] items-center justify-center overflow-hidden rounded-[40px] bg-blue-50/45 ring-1 ring-blue-100/80">
								{isComplete ? (
									<div className="flex h-full w-full items-center justify-center">
										<motion.div
											className="flex h-28 w-28 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-[0_20px_60px_rgba(16,185,129,0.16)]"
										initial={{ scale: 0.8, opacity: 0 }}
										animate={{ scale: 1, opacity: 1 }}
									>
											<CheckCircle2 className="h-14 w-14" />
										</motion.div>
									</div>
								) : (
									<PhaseAnimation phase={phase} />
								)}
							</div>

							<div className="mt-5 min-w-0">
								<div className="flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-600">
									<Sparkles className="h-3.5 w-3.5" />
									{context === "borrower"
										? "Borrower resume autofill"
										: "Project resume autofill"}
								</div>
								<h3 className="mt-4 text-[28px] font-semibold tracking-tight text-slate-900">
									{activePhase.label}
								</h3>
								<p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
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
