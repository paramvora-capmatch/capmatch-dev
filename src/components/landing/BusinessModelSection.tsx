"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";

export function BusinessModelSection() {
	const ref = useRef<HTMLDivElement>(null);
	const isInView = useInView(ref, { once: true, amount: 0.2 });

	return (
		<section
			id="business-model"
			ref={ref}
			className="pt-24 pb-24 bg-blue-50/50 border-y border-gray-100 overflow-hidden relative"
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
						close-so our incentives are aligned with yours.
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
				</motion.div>
			</div>
		</section>
	);
}
