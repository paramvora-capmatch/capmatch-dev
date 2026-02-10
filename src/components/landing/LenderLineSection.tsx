"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { LogIn } from "lucide-react";
import { AnimatedLenderGraph } from "@/components/graph/AnimatedLenderGraph";
import { Button } from "@/components/ui/Button";

export function LenderLineSection() {
	return (
		<section
			id="lenderline-section"
			className="relative min-h-screen py-20 md:py-28 flex flex-col justify-center overflow-hidden"
			style={{
				backgroundImage: `
					repeating-linear-gradient(
						45deg,
						transparent,
						transparent 10px,
						rgba(209, 213, 219, 0.097) 10px,
						rgba(209, 213, 219, 0.097) 11px
					),
					repeating-linear-gradient(
						-45deg,
						transparent,
						transparent 10px,
						rgba(209, 213, 219, 0.097) 10px,
						rgba(209, 213, 219, 0.097) 11px
					)
				`,
			}}
		>
			<div className="container mx-auto px-4 max-w-6xl flex-1 flex flex-col justify-center">
				<motion.div
					className="text-center mb-10"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
				>
					<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 tracking-tight">
						LenderLine™
					</h1>
					<p className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto mb-2">
						AI-powered matching by asset, deal type, and location.
					</p>
					<p className="text-lg text-gray-500 max-w-2xl mx-auto mb-8">
						Visualize your ideal capital partners. Materials are formatted for
						each lender&apos;s preferences-PDF, Excel, or live dashboard.
					</p>
					<Link href="/login?from=lenderline">
						<Button
							variant="primary"
							size="lg"
							leftIcon={<LogIn size={20} />}
							className="bg-blue-500 hover:bg-blue-600 shadow-lg !text-white font-medium"
						>
							Access LenderLine
						</Button>
					</Link>
				</motion.div>

				<motion.div
					className="rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-xl p-4 md:p-6 min-h-[400px] flex items-center justify-center"
					initial={{ opacity: 0, y: 24 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.2 }}
				>
					<AnimatedLenderGraph />
				</motion.div>
			</div>
		</section>
	);
}
