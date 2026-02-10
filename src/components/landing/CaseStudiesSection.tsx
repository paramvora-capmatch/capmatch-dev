"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

const placeholderDeals = [
	{
		id: "1",
		headline: "Case study one",
		assetType: "Multifamily",
		loanAmount: "$XXM",
		location: "City, State",
		description: "Brief description of the deal and outcome.",
		imagePlaceholder: true,
	},
	{
		id: "2",
		headline: "Case study two",
		assetType: "Office",
		loanAmount: "$XXM",
		location: "City, State",
		description: "Brief description of the deal and outcome.",
		imagePlaceholder: true,
	},
	{
		id: "3",
		headline: "Case study three",
		assetType: "Industrial",
		loanAmount: "$XXM",
		location: "City, State",
		description: "Brief description of the deal and outcome.",
		imagePlaceholder: true,
	},
];

export function CaseStudiesSection() {
	const ref = useRef<HTMLDivElement>(null);
	const isInView = useInView(ref, { once: true, amount: 0.2 });
	const [index, setIndex] = useState(0);
	const total = placeholderDeals.length;

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

	const deal = placeholderDeals[index];

	return (
		<section
			id="case-studies"
			ref={ref}
			className="min-h-screen py-20 md:py-28 bg-white flex flex-col justify-center"
		>
			<div className="container mx-auto px-4 max-w-6xl flex-1 flex flex-col justify-center">
				<motion.div
					className="text-center mb-12"
					initial={{ opacity: 0, y: 20 }}
					animate={isInView ? { opacity: 1, y: 0 } : {}}
					transition={{ duration: 0.6 }}
				>
					<h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
						$291M in Active Deal Volume
					</h2>
					<p className="text-lg text-gray-600">
						Live deals on the platform. Case studies coming soon.
					</p>
				</motion.div>

				{/* Carousel */}
				<motion.div
					className="relative rounded-xl overflow-hidden border border-gray-200 shadow-lg bg-gray-50 flex-1 min-h-0 flex flex-col"
					initial={{ opacity: 0, y: 24 }}
					animate={isInView ? { opacity: 1, y: 0 } : {}}
					transition={{ duration: 0.6, delay: 0.1 }}
				>
					<div className="flex flex-col md:flex-row flex-1 min-h-[50vh]">
						{/* Image / visual side - larger share of the card */}
						<div className="w-full md:w-3/5 min-h-[240px] md:min-h-[40vh] flex-shrink-0 bg-gray-200 flex items-center justify-center rounded-l-xl md:rounded-l-xl">
							<span className="text-gray-500 text-sm px-4 text-center">
								[ Case study image placeholder ]
							</span>
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
									<button
										type="button"
										className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
									>
										Read case study →
									</button>
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
							{placeholderDeals.map((_, i) => (
								<button
									key={i}
									type="button"
									onClick={() => setIndex(i)}
									className={`w-2.5 h-2.5 rounded-full transition-colors ${
										i === index
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
