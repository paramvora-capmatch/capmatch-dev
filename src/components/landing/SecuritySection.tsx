"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock } from "lucide-react";
import Image from "next/image";

// Data for the sections — 3 words evenly spaced at 120° apart
const sections = [
	{
		id: "correct",
		title: "CORRECT",
		shortDescription: "Sanity checks & Human review",
		description:
			"We enforce rigorous correctness checks. Every piece of data is subjected to automated sanity checks, and a human is always in the loop to review and confirm critical details.",
		// Start offset on the circular path (percentage of the circumference)
		startOffset: "0%",
		baseAngle: 0,
	},
	{
		id: "secure",
		title: "SECURE",
		shortDescription: "RBAC, AES256 & Permissions",
		description:
			"Your data privacy is paramount. We use AES-256 encryption, strict Role-Based Access Control (RBAC), and permission sanity checks to ensure total security.",
		startOffset: "33.33%",
		baseAngle: 120,
	},
	{
		id: "verified",
		title: "VERIFIED",
		shortDescription: "Cap Match Verified Data",
		description:
			"Trust in data you can rely on. 'Cap Match Verified' is our certification for data sourced from trusted partners like CoStar and government records.",
		startOffset: "66.66%",
		baseAngle: 240,
	},
];

// Simple left/right positioning for content card.
// If the word is on the right half of the circle, card goes to the right.
// If on the left half, card goes to the left.
function getCardStyle(angle: number): {
	key: string;
	style: React.CSSProperties;
} {
	const a = ((angle % 360) + 360) % 360;
	// Right half: word angle 315°-135° (top and right side)
	const isRight = a >= 315 || a < 135;

	return {
		key: isRight ? "right" : "left",
		style: {
			top: "50%",
			transform: "translateY(-50%)",
			...(isRight
				? { left: "calc(100% + 24px)" }
				: { right: "calc(100% + 24px)" }),
		},
	};
}


const ROTATION_DURATION = 30; // seconds for full rotation
const SVG_SIZE = 600;
const CIRCLE_RADIUS = 240;
const CENTER = SVG_SIZE / 2;

export function SecuritySection() {
	const [hoveredSection, setHoveredSection] = useState<string | null>(null);
	const [currentRotation, setCurrentRotation] = useState(0);
	const animationRef = useRef<number | null>(null);
	const startTimeRef = useRef<number>(Date.now());
	const pausedRotationRef = useRef<number>(0);

	const isPaused = hoveredSection !== null;

	// Track the current rotation angle
	const updateRotation = useCallback(() => {
		if (!isPaused) {
			const elapsed = (Date.now() - startTimeRef.current) / 1000;
			const angle =
				(pausedRotationRef.current +
					(elapsed / ROTATION_DURATION) * 360) %
				360;
			setCurrentRotation(angle);
		}
		animationRef.current = requestAnimationFrame(updateRotation);
	}, [isPaused]);

	useEffect(() => {
		animationRef.current = requestAnimationFrame(updateRotation);
		return () => {
			if (animationRef.current) {
				cancelAnimationFrame(animationRef.current);
			}
		};
	}, [updateRotation]);

	useEffect(() => {
		if (isPaused) {
			pausedRotationRef.current = currentRotation;
		} else {
			startTimeRef.current = Date.now();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isPaused]);

	const getSectionAngle = (baseAngle: number) => {
		return (baseAngle + currentRotation) % 360;
	};

	return (
		<section
			className="relative py-32 overflow-visible border-t border-gray-100 bg-white"
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
			<style jsx global>{`
				@keyframes security-spin {
					from {
						transform: rotate(0deg);
					}
					to {
						transform: rotate(360deg);
					}
				}
			`}</style>


			<div className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-12 text-center">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.6, ease: "easeOut" }}
				>
					<h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-4">
						Enterprise-Grade Security
					</h2>
					<p className="text-xl text-gray-600 max-w-2xl mx-auto font-medium">
						Built with precision, privacy, and absolute data integrity at its core.
					</p>
				</motion.div>
			</div>

			<div className="relative z-10 w-full max-w-7xl mx-auto px-6 h-[700px] flex items-center justify-center">
				<div className="relative flex items-center justify-center w-[700px] h-[700px]">
					{/* The Centerpiece: Lock + Logo */}
					<div className="absolute z-10 w-56 h-56 flex items-center justify-center bg-white rounded-full shadow-2xl border border-blue-50">
						<div className="absolute inset-0 bg-blue-50/50 rounded-full animate-pulse blur-xl" />
						<div className="relative z-20 flex flex-col items-center justify-center">
							<div className="relative flex items-center justify-center">
								<Lock
									strokeWidth={1}
									className="w-36 h-36 text-blue-100/80 absolute"
								/>
								<div className="relative z-10 w-28 h-28 flex items-center justify-center">
									<Image
										src="/CapMatchLogo.png"
										alt="Cap Match"
										width={90}
										height={90}
										className="object-contain"
									/>
								</div>
							</div>
						</div>
					</div>

					{/* SVG Circular Text Ring */}
					<div
						className="absolute"
						style={{
							width: `${SVG_SIZE}px`,
							height: `${SVG_SIZE}px`,
							animation: `security-spin ${ROTATION_DURATION}s linear infinite`,
							animationPlayState: isPaused
								? "paused"
								: "running",
						}}
					>
						<svg
							width={SVG_SIZE}
							height={SVG_SIZE}
							viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
							className="overflow-visible"
						>
							{/* Define the circular path for text to follow */}
							<defs>
								<path
									id="security-text-circle"
									d={`
										M ${CENTER}, ${CENTER - CIRCLE_RADIUS}
										A ${CIRCLE_RADIUS},${CIRCLE_RADIUS} 0 1,1 ${CENTER - 0.01},${CENTER - CIRCLE_RADIUS}
									`}
									fill="none"
								/>
							</defs>

							{/* Faint circle ring visual */}
							<circle
								cx={CENTER}
								cy={CENTER}
								r={CIRCLE_RADIUS}
								fill="none"
								stroke="rgba(191, 219, 254, 0.2)"
								strokeWidth="1"
							/>

							{/* Text along the circle path */}
							{sections.map((section) => (
								<text
									key={section.id}
									className="select-none"
									style={{
										cursor: "pointer",
										transition:
											"fill 0.3s ease, filter 0.3s ease",
										filter:
											hoveredSection === section.id
												? "drop-shadow(0 0 12px rgba(59, 130, 246, 0.4))"
												: "none",
									}}
									fill={
										hoveredSection === section.id
											? "#2563EB"
											: "#374151"
									}
									fontSize="28"
									fontWeight="900"
									letterSpacing="0.25em"
									onMouseEnter={() =>
										setHoveredSection(section.id)
									}
									onMouseLeave={() =>
										setHoveredSection(null)
									}
								>
									<textPath
										href="#security-text-circle"
										startOffset={section.startOffset}
									>
										{section.title}
									</textPath>
								</text>
							))}
						</svg>
					</div>

					{/* Content Cards — positioned radially outward from the word */}
					<AnimatePresence>
						{hoveredSection !== null &&
							(() => {
								const section = sections.find(
									(s) => s.id === hoveredSection
								);
								if (!section) return null;

								const absoluteAngle = getSectionAngle(
									section.baseAngle
								);
								const cardPos =
									getCardStyle(absoluteAngle);

								return (
									<motion.div
										key={`${section.id}-${cardPos.key}`}
										initial={{
											opacity: 0,
											scale: 0.85,
										}}
										animate={{
											opacity: 1,
											scale: 1,
										}}
										exit={{
											opacity: 0,
											scale: 0.85,
										}}
										transition={{
											duration: 0.25,
											ease: "easeOut",
										}}
										className="absolute w-72 z-50 pointer-events-none"
										style={cardPos.style}
									>
										<div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-blue-100/60">
											<div className="w-10 h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mb-4" />
											<div className="font-semibold text-blue-600 mb-2 uppercase text-xs tracking-wider">
												{
													section.shortDescription
												}
											</div>
											<h4 className="text-lg font-bold text-gray-900 mb-2">
												{section.title}
											</h4>
											<p className="text-gray-600 text-sm leading-relaxed">
												{section.description}
											</p>
										</div>
									</motion.div>
								);
							})()}
					</AnimatePresence>
				</div>
			</div>
		</section>
	);
}