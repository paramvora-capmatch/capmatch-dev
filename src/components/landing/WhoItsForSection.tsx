"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Building2, Landmark } from "lucide-react";
import { DottedGlowBackground } from "@/components/ui/dotted-glow-background";

const developersPoints = [
	"Stop spending months packaging your deal",
	"Upload documents; AI handles formatting and extraction",
	"Get matched with the right lenders and close faster",
	"Pay only when you get funded",
];

const lendersPoints = [
	"Structured data and consistent formatting",
	"Underwriting vault with staged document checklists",
	"Real-time collaboration with borrowers",
	"Fewer unqualified submissions",
];

export function WhoItsForSection() {
	const ref = useRef<HTMLDivElement>(null);
	const isInView = useInView(ref, { once: true, amount: 0.2 });

	return (
		<section
			id="who-its-for"
			ref={ref}
			className="relative py-20 md:py-28 bg-white overflow-hidden"
		>
			{/* Section-wide background with radial mask */}
			<div
				className="absolute inset-0 pointer-events-none"
				style={{
					maskImage: "radial-gradient(circle at 50% 50%, black 0%, transparent 50%)",
					WebkitMaskImage: "radial-gradient(circle at 50% 50%, black 0%, transparent 50%)",
				}}
			>
				<DottedGlowBackground
					className="w-full h-full opacity-30"
					opacity={0.4}
					gap={12}
					radius={1.2}
					colorLightVar="--color-blue-900"
					glowColorLightVar="--color-blue-700"
					backgroundOpacity={0}
					speedMin={0.2}
					speedMax={1.0}
					speedScale={1}
				/>
			</div>

			<div className="container mx-auto px-4 max-w-7xl">
				<motion.div
					className="text-center mb-14"
					initial={{ opacity: 0, y: 20 }}
					animate={isInView ? { opacity: 1, y: 0 } : {}}
					transition={{ duration: 0.6 }}
				>
					<h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
						Who It&apos;s For
					</h2>
					<p className="text-lg text-gray-600 max-w-2xl mx-auto">
						Built for both sides of commercial real estate financing.
					</p>
				</motion.div>
				<div className="relative max-w-6xl mx-auto">
					<div className="grid md:grid-cols-2 gap-0 relative">
						{/* Developers - left */}
						<motion.div
							className="p-8 md:p-12 md:pr-16"
							initial={{ opacity: 0, x: -24 }}
							animate={isInView ? { opacity: 1, x: 0 } : {}}
							transition={{ duration: 0.5, delay: 0.1 }}
						>
							<div className="flex items-center gap-4 mb-8">
								<span className="p-3 rounded-xl bg-blue-50 text-blue-600">
									<Building2 size={32} />
								</span>
								<h3 className="text-2xl md:text-3xl font-bold text-gray-900">
									Developers
								</h3>
							</div>

							<ul className="space-y-6">
								{developersPoints.map((p) => (
									<li
										key={p}
										className="flex items-start gap-4 text-lg md:text-xl text-gray-700 font-medium leading-relaxed"
									>
										<span className="text-blue-500 mt-2 flex-shrink-0 w-2 h-2 rounded-full bg-blue-500" />
										{p}
									</li>
								))}
							</ul>
						</motion.div>

						{/* Vertical Divider Line (Desktop Only) */}
						<div className="hidden md:block absolute left-1/2 top-12 bottom-12 w-[1px] bg-gray-200 -translate-x-1/2" />

						{/* Lenders - right */}
						<motion.div
							className="p-8 md:p-12 md:pl-16 border-t md:border-t-0 border-gray-100"
							initial={{ opacity: 0, x: 24 }}
							animate={isInView ? { opacity: 1, x: 0 } : {}}
							transition={{ duration: 0.5, delay: 0.15 }}
						>
							<div className="flex items-center gap-4 mb-8">
								<span className="p-3 rounded-xl bg-blue-50 text-blue-600">
									<Landmark size={32} />
								</span>
								<h3 className="text-2xl md:text-3xl font-bold text-gray-900">
									Lenders
								</h3>
							</div>

							<ul className="space-y-6">
								{lendersPoints.map((p) => (
									<li
										key={p}
										className="flex items-start gap-4 text-lg md:text-xl text-gray-700 font-medium leading-relaxed"
									>
										<span className="text-blue-500 mt-2 flex-shrink-0 w-2 h-2 rounded-full bg-blue-500" />
										{p}
									</li>
								))}
							</ul>
						</motion.div>
					</div>
				</div>
			</div>
		</section>
	);
}
