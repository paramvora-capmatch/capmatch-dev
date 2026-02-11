"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { CASE_STUDIES } from "@/lib/case-studies";
import { ArrowRight } from "lucide-react";

const container = {
	hidden: { opacity: 0 },
	show: {
		opacity: 1,
		transition: { staggerChildren: 0.08 },
	},
};

const item = {
	hidden: { opacity: 0, y: 20 },
	show: { opacity: 1, y: 0 },
};

export function ResourcesPageClient() {
	return (
		<div
			className="relative min-h-[60vh]"
			style={{
				backgroundImage: `
					repeating-linear-gradient(
						45deg,
						transparent,
						transparent 12px,
						rgba(59, 130, 246, 0.03) 12px,
						rgba(59, 130, 246, 0.03) 13px
					),
					repeating-linear-gradient(
						-45deg,
						transparent,
						transparent 12px,
						rgba(59, 130, 246, 0.03) 12px,
						rgba(59, 130, 246, 0.03) 13px
					)
				`,
			}}
		>
			<div className="container mx-auto px-4 max-w-6xl py-16 md:py-24">
				<motion.header
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="text-center mb-16"
				>
					<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight mb-4">
						Resources
					</h1>
					<p className="text-xl text-gray-600 max-w-2xl mx-auto">
						Real deals, live underwriting. See how CapMatch turns
						fragmented docs into a single source of truth and
						accelerates capital formation.
					</p>
				</motion.header>

				<motion.div
					variants={container}
					initial="hidden"
					animate="show"
					className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
				>
					{CASE_STUDIES.map((study) => (
						<motion.div key={study.id} variants={item}>
							<Link
								href={`/resources/${study.slug}`}
								className="group block h-full rounded-2xl overflow-hidden border border-gray-200/80 bg-white shadow-sm hover:shadow-xl hover:border-blue-200/60 transition-all duration-300"
							>
								<div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
									<Image
										src={study.image}
										alt={study.headline}
										fill
										className="object-cover transition-transform duration-500 group-hover:scale-105"
										sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
									/>
									<div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
									<div className="absolute bottom-3 left-3 right-3">
										<span className="inline-block px-2.5 py-1 rounded-md bg-blue-600 text-white text-xs font-medium">
											{study.assetType}
										</span>
									</div>
								</div>
								<div className="p-6">
									<p className="text-sm font-medium text-blue-600 mb-1">
										{study.loanAmount} · {study.location}
									</p>
									<h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
										{study.headline}
									</h2>
									<p className="text-gray-600 text-sm leading-relaxed line-clamp-3 mb-4">
										{study.description}
									</p>
									<span className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 group-hover:gap-2 transition-all">
										Read case study
										<ArrowRight className="h-4 w-4" />
									</span>
								</div>
							</Link>
						</motion.div>
					))}
				</motion.div>
			</div>
		</div>
	);
}
