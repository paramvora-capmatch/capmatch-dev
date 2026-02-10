"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Button } from "@/components/ui/Button";

export function ClosingSection() {
	const ref = useRef<HTMLDivElement>(null);
	const isInView = useInView(ref, { once: true, amount: 0.3 });

	return (
		<section
			id="closing"
			ref={ref}
			className="py-20 md:py-28 bg-gray-50 border-t border-gray-100"
		>
			<div className="container mx-auto px-4 max-w-3xl text-center">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={isInView ? { opacity: 1, y: 0 } : {}}
					transition={{ duration: 0.6 }}
				>
					<h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
						The Operating System for Commercial Real Estate
						Financing
					</h2>
					<p className="text-lg text-gray-600 mb-10">
						From document intake to loan closing—fully integrated,
						AI-enabled, and built for sponsors and lenders.
					</p>
					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						<Button
							variant="primary"
							size="lg"
							className="rounded-full px-8 bg-blue-500 hover:bg-blue-600"
							onClick={() =>
								typeof window !== "undefined" &&
								window.location.assign("/login")
							}
						>
							Access Deal Room
						</Button>
						<Button
							variant="outline"
							size="lg"
							className="rounded-full px-8 border-gray-300 text-gray-700 hover:bg-gray-100"
							onClick={() => {
								// Placeholder: could link to contact or Calendly
								typeof window !== "undefined" &&
									window.location.assign("/contact");
							}}
						>
							Get in Touch
						</Button>
					</div>
				</motion.div>
			</div>
		</section>
	);
}
