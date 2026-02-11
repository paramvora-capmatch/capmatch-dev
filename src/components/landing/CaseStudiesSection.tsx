"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Counter } from "@/components/ui/Counter";
import { CASE_STUDIES } from "@/lib/case-studies";

const caseStudies = CASE_STUDIES;

export function CaseStudiesSection() {
	const ref = useRef<HTMLDivElement>(null);
	const isInView = useInView(ref, { once: true, amount: 0.2 });
	const [index, setIndex] = useState(0);
	const total = caseStudies.length;

	const goNext = useCallback(() => {
		setIndex((i) => (i + 1) % total);
	}, [total]);
	const goPrev = useCallback(() => {
		setIndex((i) => (i - 1 + total) % total);
	}, [total]);

	useEffect(() => {
		const t = setInterval(goNext, 6000);
		return () => clearInterval(t);
	}, [goNext]);

	const deal = caseStudies[index];

	return (
		<section
			id="case-studies"
			ref={ref}
			className="min-h-screen pt-20 md:pt-28 pb-1 md:pb-1.5 flex flex-col justify-center"
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
					className="text-center mb-12"
					initial={{ opacity: 0, y: 20 }}
					animate={isInView ? { opacity: 1, y: 0 } : {}}
					transition={{ duration: 0.6 }}
				>
					<h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-3 flex flex-wrap items-center justify-center gap-0.5 md:gap-1 tabular-nums tracking-tight">
						<span className="text-blue-600">$</span>
						<Counter
							value={290}
							direction="up"
							className="text-4xl md:text-5xl lg:text-6xl font-bold text-blue-600"
						/>
						{isInView &&
							[" M+", " in", " Active", " Deal", " Volume"].map((word, i) => (
								<motion.span
									key={word}
									className={`inline-block overflow-hidden tabular-nums mr-1.5 md:mr-2 last:mr-0 ${i === 0 ? "text-blue-600 font-bold" : ""}`}
									initial={{ opacity: 0, y: 12 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{
										duration: 0.35,
										delay: 0.5 + i * 0.08,
										ease: [0.22, 1, 0.36, 1],
									}}
								>
									{word}
								</motion.span>
							))}
						{!isInView && (
							<>
								<span className="text-blue-600 font-bold"> M+</span>
								<span> in Active Deal Volume</span>
							</>
						)}
					</h2>
					<p className="text-xl md:text-2xl text-gray-600">
						Live deals on the platform. Explore our case studies.
					</p>
				</motion.div>

				{/* Carousel */}
				<motion.div
					className="relative rounded-xl overflow-hidden border border-blue-200/50 bg-white shadow-sm flex-1 min-h-0 flex flex-col"
					initial={{ opacity: 0, y: 24 }}
					animate={isInView ? { opacity: 1, y: 0 } : {}}
					transition={{ duration: 0.6, delay: 0.1 }}
				>
					<div className="flex flex-col md:flex-row flex-1 min-h-[50vh]">
						{/* Image / visual side - larger share of the card */}
						<div className="w-full md:w-3/5 min-h-[240px] md:min-h-[40vh] flex-shrink-0 bg-gray-200 flex items-center justify-center rounded-l-xl md:rounded-l-xl overflow-hidden">
							<img
								src={deal.image}
								alt={deal.headline}
								className="w-full h-full object-cover"
							/>
						</div>
						{/* Content side */}
						<div className="w-full md:w-2/5 p-8 flex flex-col justify-center">
							<AnimatePresence mode="wait">
								<motion.div
									key={deal.id}
									initial={{ opacity: 0, x: 12 }}
									animate={{ opacity: 1, x: 0 }}
									exit={{ opacity: 0, x: -12 }}
									transition={{ duration: 0.3 }}
								>
									<p className="text-sm font-medium text-blue-600 mb-1">
										{deal.assetType} · {deal.loanAmount}
									</p>
									<h3 className="text-2xl font-bold text-gray-900 mb-2">
										{deal.headline}
									</h3>
									<p className="text-gray-600 text-sm mb-4">
										{deal.location}
									</p>
									<p className="text-gray-600 mb-6">
										{deal.description}
									</p>

									{deal.slug ? (
										<Link
											href={`/resources/${deal.slug}`}
											className="inline-block text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
										>
											Read case study →
										</Link>
									) : (
										<span className="text-sm font-medium text-gray-400">
											Read case study →
										</span>
									)}
								</motion.div>
							</AnimatePresence>
						</div>
					</div>

					{/* Carousel controls */}
					<div className="absolute bottom-4 right-4 flex items-center gap-2">
						<button
							type="button"
							onClick={goPrev}
							className="p-2 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-gray-600"
							aria-label="Previous case study"
						>
							<ChevronLeft size={20} />
						</button>
						<div className="flex gap-1.5">
							{caseStudies.map((_, i) => (
								<button
									key={i}
									type="button"
									onClick={() => setIndex(i)}
									className={`w-2.5 h-2.5 rounded-full transition-colors ${i === index
											? "bg-blue-600"
											: "bg-gray-300 hover:bg-gray-400"
										}`}
									aria-label={`Go to case study ${i + 1}`}
								/>
							))}
						</div>
						<button
							type="button"
							onClick={goNext}
							className="p-2 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-gray-600"
							aria-label="Next case study"
						>
							<ChevronRight size={20} />
						</button>
					</div>
				</motion.div>
			</div>
		</section>
	);
}
