"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Building2, Landmark } from "lucide-react";

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
			className="py-20 md:py-28 bg-white"
		>
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
				<div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
					{/* Developers — left */}
					<motion.div
						className="bg-gray-50 rounded-xl border border-gray-200 p-8 shadow-sm"
						initial={{ opacity: 0, x: -24 }}
						animate={isInView ? { opacity: 1, x: 0 } : {}}
						transition={{ duration: 0.5, delay: 0.1 }}
					>
						<div className="flex items-center gap-3 mb-4">
							<span className="p-2 rounded-lg bg-blue-100">
								<Building2 size={24} className="text-blue-600" />
							</span>
							<h3 className="text-xl font-bold text-gray-900">
								Developers
							</h3>
						</div>
						<p className="text-gray-600 mb-5">
							You have a real estate project that needs financing.
							CapMatch handles everything from document intake to loan
							closing.
						</p>
						<ul className="space-y-2">
							{developersPoints.map((p) => (
								<li
									key={p}
									className="flex items-start gap-2 text-sm text-gray-700"
								>
									<span className="text-blue-500 mt-0.5">•</span>
									{p}
								</li>
							))}
						</ul>
					</motion.div>
					{/* Lenders — right */}
					<motion.div
						className="bg-gray-50 rounded-xl border border-gray-200 p-8 shadow-sm"
						initial={{ opacity: 0, x: 24 }}
						animate={isInView ? { opacity: 1, x: 0 } : {}}
						transition={{ duration: 0.5, delay: 0.15 }}
					>
						<div className="flex items-center gap-3 mb-4">
							<span className="p-2 rounded-lg bg-blue-100">
								<Landmark size={24} className="text-blue-600" />
							</span>
							<h3 className="text-xl font-bold text-gray-900">
								Lenders
							</h3>
						</div>
						<p className="text-gray-600 mb-5">
							Receive pre-vetted, professionally formatted deal
							packages. Review projects through an interactive OM
							dashboard.
						</p>
						<ul className="space-y-2">
							{lendersPoints.map((p) => (
								<li
									key={p}
									className="flex items-start gap-2 text-sm text-gray-700"
								>
									<span className="text-blue-500 mt-0.5">•</span>
									{p}
								</li>
							))}
						</ul>
					</motion.div>
				</div>
			</div>
		</section>
	);
}
