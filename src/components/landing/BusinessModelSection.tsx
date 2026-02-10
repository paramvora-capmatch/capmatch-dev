"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Check, X, Minus } from "lucide-react";

export function BusinessModelSection() {
	const ref = useRef<HTMLDivElement>(null);
	const isInView = useInView(ref, { once: true, amount: 0.2 });

	return (
		<section
			id="business-model"
			ref={ref}
			className="pt-24 bg-blue-50/50 border-y border-gray-100 overflow-hidden h-[750px] md:h-[800px] relative"
		>
			<div className="container mx-auto px-4 max-w-5xl relative z-20">
				<motion.div
					className="text-center"
					initial={{ opacity: 0, y: 24 }}
					animate={isInView ? { opacity: 1, y: 0 } : {}}
					transition={{ duration: 0.6 }}
				>
					<h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-8 tracking-tight">
						Incentives Aligned with Your Closing
					</h2>
					<p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
						CapMatch is not a subscription product. We earn when you
						close—so our incentives are aligned with yours.
					</p>
					<ul className="space-y-6 text-left max-w-2xl mx-auto mb-16">
						{[
							"No monthly SaaS fees or upfront costs",
							"Performance-based: we succeed when your loan closes",
							"Traditional CRE tech charges regardless of outcome",
						].map((item, i) => (
							<motion.li
								key={item}
								className="flex items-center gap-4 text-gray-700 text-lg md:text-xl"
								initial={{ opacity: 0, x: -12 }}
								animate={
									isInView
										? { opacity: 1, x: 0 }
										: { opacity: 0, x: -12 }
								}
								transition={{
									duration: 0.4,
									delay: 0.2 + i * 0.1,
								}}
							>
								<span className="flex-shrink-0 text-sm font-bold text-blue-500/50 tabular-nums">
									{String(i + 1).padStart(2, '0')}
								</span>
								<span className="font-semibold">{item}</span>
							</motion.li>
						))}
					</ul>

					{/* Faded Pricing Section as Background element */}
					<div className="relative mt-16 overflow-hidden rounded-t-[3rem] border-x border-t border-gray-200 bg-white shadow-2xl max-w-5xl mx-auto transform scale-105">
						<div className="p-10 pb-40 relative">
							<div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-left opacity-60">
								{[
									{ name: "Starter", features: ["Market Data", "Lender Access", "OM Builder"] },
									{ name: "Professional", features: ["Full Matching", "Bulk Outreach", "Analytics"] },
									{ name: "Enterprise", features: ["Custom API", "White-labeling", "Priority Support"] },
								].map((plan, i) => (
									<div key={i} className="space-y-8">
										<div>
											<h4 className="text-base font-bold text-gray-400 uppercase tracking-widest mb-3">{plan.name}</h4>
											<div className="flex items-baseline gap-2">
												<span className="text-4xl font-extrabold text-gray-300">
													<Minus className="inline-block" size={32} />
												</span>
												<span className="text-gray-300 text-lg font-medium">/ month</span>
											</div>
										</div>
										<ul className="space-y-4">
											{plan.features.map((feature, j) => (
												<li key={j} className="flex items-center gap-3 text-gray-300">
													<X size={20} className="text-red-400/30" />
													<span className="text-lg line-through decoration-gray-200">{feature}</span>
												</li>
											))}
										</ul>
									</div>
								))}
							</div>

							{/* Gradient Overlay for Fade (reduced depth) */}
							<div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white via-white/40 to-transparent z-10" />
						</div>
					</div>
				</motion.div>
			</div>
		</section>
	);
}
