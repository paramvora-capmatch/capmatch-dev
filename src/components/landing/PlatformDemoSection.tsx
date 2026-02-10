"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Play } from "lucide-react";

export function PlatformDemoSection() {
	const ref = useRef<HTMLDivElement>(null);
	const isInView = useInView(ref, { once: true, amount: 0.2 });

	return (
		<section
			id="platform-demo"
			ref={ref}
			className="py-20 md:py-28 bg-gray-50"
		>
			<div className="container mx-auto px-4 max-w-4xl">
				<motion.div
					className="text-center"
					initial={{ opacity: 0, y: 20 }}
					animate={isInView ? { opacity: 1, y: 0 } : {}}
					transition={{ duration: 0.6 }}
				>
					<h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
						See CapMatch in Action
					</h2>
					<p className="text-lg text-gray-600 mb-10 max-w-xl mx-auto">
						Platform walkthrough and auto-fill demo—coming soon.
					</p>
					{/* Placeholder: video or interactive demo */}
					<div className="aspect-video max-w-4xl mx-auto rounded-xl bg-gray-200 border-2 border-dashed border-gray-300 flex items-center justify-center">
						<div className="flex flex-col items-center gap-3 text-gray-500">
							<div className="w-16 h-16 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center shadow-sm">
								<Play size={28} className="text-gray-400 ml-1" />
							</div>
							<span className="text-sm font-medium">
								Video or interactive demo placeholder
							</span>
						</div>
					</div>
				</motion.div>
			</div>
		</section>
	);
}
