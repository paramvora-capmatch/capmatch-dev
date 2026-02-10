"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Check } from "lucide-react";

export function BusinessModelSection() {
	const ref = useRef<HTMLDivElement>(null);
	const isInView = useInView(ref, { once: true, amount: 0.2 });

	return (
		<section
			id="business-model"
			ref={ref}
			className="py-20 md:py-28 bg-blue-50/50 border-y border-gray-100"
		>
			<div className="container mx-auto px-4 max-w-4xl">
				<motion.div
					className="text-center"
					initial={{ opacity: 0, y: 24 }}
					animate={isInView ? { opacity: 1, y: 0 } : {}}
					transition={{ duration: 0.6 }}
				>
					<h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
						You Only Pay When You Get Funded
					</h2>
					<p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto">
						CapMatch is not a subscription product. We earn when you
						close—so our incentives are aligned with yours.
					</p>
					<ul className="space-y-4 text-left max-w-xl mx-auto">
						{[
							"No monthly SaaS fees or upfront costs",
							"Performance-based: we succeed when your loan closes",
							"Traditional CRE tech charges regardless of outcome",
						].map((item, i) => (
							<motion.li
								key={item}
								className="flex items-center gap-3 text-gray-700"
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
								<span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
									<Check size={14} className="text-white" />
								</span>
								<span>{item}</span>
							</motion.li>
						))}
					</ul>
				</motion.div>
			</div>
		</section>
	);
}
