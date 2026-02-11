"use client";

import React, { useEffect, useState } from "react";
import { EnhancedHeader } from "@/components/ui/EnhancedHeader";
import { Footer } from "@/components/ui/Footer";
import { motion } from "framer-motion";
import { cn } from "@/utils/cn";

const LEADERSHIP = [
	{
		name: "Dr. Jeff Richmond",
		title: "Chief Executive Officer",
		bio: "Dr. Richmond brings decades of leadership across real estate, capital markets, and organizational scale. He has built and led real estate organizations responsible for $2B+ in annual transaction volume, with a focus on strategic growth, execution discipline, and long-term value creation. At CapMatch, he leads vision, partnerships, and the integration of market realities into a scalable operating company.",
	},
	{
		name: "Todd Vitzthum",
		title: "Executive Chairman",
		bio: "Todd has over 20 years of institutional commercial real estate experience, including senior leadership roles at Greystone, Cushman & Wakefield, and CBRE. He has personally originated, structured, and placed debt across market cycles, asset classes, and capital stacks. CapMatch is the productization of systems he built manually, refined through real deals, real lenders, and real borrower outcomes.",
	},
	{
		name: "Param Vora",
		title: "Chief Technology Officer & Chief Operating Officer",
		bio: "Param leads CapMatch's technology, data, and operational execution. With over a decade of experience in AI/ML, systems architecture, and large-scale platform development, he has built and scaled AI-driven products used at national scale and led teams through high-growth phases and successful exits. At CapMatch, he is responsible for translating institutional lending workflows into a durable, vertically integrated operating system.",
	},
	{
		name: "Michael Krueger",
		title: "Chief Legal Officer",
		bio: "Michael is a partner at Lucosky Brookman LLP and a corporate and securities attorney specializing in capital markets, structured finance, and complex transactions. He ensures CapMatch operates with regulatory rigor, transaction integrity, and governance frameworks suitable for institutional counterparties.",
	},
	{
		name: "Greg Kapust",
		title: "Finance & Governance",
		bio: "Greg brings deep experience in finance, governance, and capital allocation, with four successful exits, including three exceeding $100M. An active real estate investor, he provides disciplined financial oversight and ensures CapMatch is built to scale responsibly while competing aggressively on outcomes.",
	},
];

const TECHNICAL_STAFF = [
	{
		name: "Cody Field",
		department: "Capital Markets Advisory",
		bio: "Strategic and entrepreneurial mortgage banker with demonstrated expertise in structuring and brokering commercial, industrial, and multifamily real estate assets. Draws from an uncommon background as yacht Captain to build consensus and communicate clearly. An insightful partner with excellent problem-solving skills and a talent for building collaborative and inclusive relationships in dynamic, fast-paced working environments.",
	},
	{
		name: "Aryan Jain",
		department: "Engineering",
		bio: "Aryan brings strong systems thinking and a thorough, detail-oriented approach to building robust technical solutions. He excels at breaking down complex problems into clear architectures and has a keen eye for edge cases and long-term maintainability. His combination of technical depth and structured reasoning makes him a key contributor to CapMatch's engineering foundation.",
	},
	{
		name: "Sarthak Karandikar",
		department: "Engineering",
		bio: "Sarthak focuses on applying technology and systematic thinking to complex commercial real estate and platform problems. He has experience across startups and open-source development, with a strong interest in AI and in building tools that improve how the industry operates. He is committed to clear communication and to shipping solutions that create measurable impact.",
	},
	{
		name: "Kabeer Ahmed Merchant",
		department: "Engineering",
		bio: "Kabeer is focused on solving hard, overlooked problems in commercial real estate by rebuilding workflows from first principles and applying technology where it delivers real value. He has deep experience in AI, machine learning, data science, and systems design, with a focus on how complex systems fail and how to rebuild them more reliably. He works closely with investors, developers, and operators to align technology with business outcomes.",
	},
	{
		name: "Vatsal Hariramani",
		department: "Engineering",
		bio: "Vatsal is a builder and entrepreneur focused on complex problems at the intersection of technology and real-world impact. His background spans AI/ML, IoT, automation, and robotics. At CapMatch he contributes to product and engineering with an emphasis on moving from concept to scalable solutions.",
	},
];

export default function AboutPage() {
	const [scrolled, setScrolled] = useState(false);

	useEffect(() => {
		let ticking = false;
		const handleScroll = () => {
			if (!ticking) {
				window.requestAnimationFrame(() => {
					setScrolled(window.scrollY > 10);
					ticking = false;
				});
				ticking = true;
			}
		};
		handleScroll();
		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	return (
		<div
			className={cn(
				"min-h-screen flex flex-col transition-colors duration-300 relative z-10 overflow-hidden"
			)}
			style={{
				backgroundColor: "#fafbfc",
				backgroundImage: `
					radial-gradient(ellipse 100% 60% at 50% 0%, rgba(59, 130, 246, 0.06), transparent 55%),
					radial-gradient(ellipse 80% 50% at 80% 100%, rgba(59, 130, 246, 0.04), transparent 50%),
					repeating-linear-gradient(
						0deg,
						transparent,
						transparent 20px,
						rgba(0, 0, 0, 0.012) 20px,
						rgba(0, 0, 0, 0.012) 21px
					)
				`,
			}}
		>
			<EnhancedHeader scrolled={scrolled} textVisible={true} />

			<main className="flex-grow pt-24 pb-20 relative z-10">
				{/* Hero, centered */}
				<section className="container mx-auto px-4 max-w-3xl py-20 md:py-28">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5 }}
						className="text-center"
					>
						<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight">
							About Us
						</h1>
						<p className="mt-6 text-xl md:text-2xl text-gray-600 font-medium leading-relaxed max-w-2xl mx-auto">
							CapMatch exists because the existing commercial real
							estate lending system produces inefficient outcomes
							, and everyone in the industry knows it.
						</p>
					</motion.div>
				</section>

				{/* Narrative, with title and refined block */}
				<section className="container mx-auto px-4 max-w-3xl py-12 md:py-20">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true, amount: 0.15 }}
						transition={{ duration: 0.5 }}
						className="relative pl-0 md:pl-8 border-l-0 md:border-l-2 border-blue-200/60"
					>
						{/* Section title */}
						<h2 className="text-sm font-semibold text-blue-600 uppercase tracking-[0.2em] mb-6">
							Our Story
						</h2>
						<div className="space-y-10">
							<div className="relative">
								<span
									className="absolute -left-2 md:left-0 top-0 text-4xl font-serif text-blue-200/80 leading-none select-none hidden md:block"
									aria-hidden
								>
									“
								</span>
								<p className="text-gray-700 leading-[1.75] text-[17px] pl-0 md:pl-8 relative">
									Long before CapMatch became a technology
									platform, the underlying business was
									already operating successfully in an analog
									form. Todd Vitzthum had built a repeatable,
									high-performing debt placement operation
									through institutional relationships,
									disciplined underwriting, and hands-on
									execution. The results were real. The
									problem was scale. Every deal relied on
									manual processes, fragmented data, and human
									coordination that capped throughput and
									distorted outcomes; not because the market
									lacked capital, but because the system lacked
									infrastructure.
								</p>
								<p className="text-gray-700 leading-[1.75] text-[17px] pl-0 md:pl-8 relative">
									CapMatch was created to fully disrupt that
									system by vertically integrating the entire CRE
									debt lifecycle: origination, underwriting,
									matching, execution, and capital placement
									into a single, AI-native operating company. This
									is not a SaaS product and not a point solution.
									CapMatch competes on outcomes, not licenses. By
									encoding proven analog workflows into software
									and AI, the platform began processing real
									transactions immediately. Even without a large
									go-to-market push, and largely in stealth,
									CapMatch has already facilitated hundreds of
									millions of dollars in loan volume, validating
									both the model and the need for systemic change.
									<span className="text-4xl font-serif text-blue-200/80 leading-none align-top ml-0.5" aria-hidden>&rdquo;</span>
								</p>
							</div>
						</div>
					</motion.div>
				</section>

				{/* Leadership, cards with accent */}
				<section className="relative py-16 md:py-24">
					{/* Soft band behind section */}
					<div
						className="absolute inset-0 bg-gradient-to-b from-gray-100/40 via-white/30 to-transparent pointer-events-none"
						aria-hidden
					/>
					<div className="container mx-auto px-4 max-w-5xl relative">
						<motion.h2
							initial={{ opacity: 0, y: 16 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.4 }}
							className="text-center text-2xl md:text-3xl font-bold text-gray-900 tracking-tight mb-4"
						>
							Leadership Team
						</motion.h2>
						<motion.p
							initial={{ opacity: 0, y: 12 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.4, delay: 0.06 }}
							className="text-gray-600 text-base max-w-2xl mb-12 text-center mx-auto"
						>
							CapMatch is led by operators who have built,
							financed, executed, and governed complex real
							estate and technology businesses, and who
							understand that infrastructure, not tooling,
							determines outcomes.
						</motion.p>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							{LEADERSHIP.map((person, index) => (
								<motion.article
									key={person.name}
									initial={{ opacity: 0, y: 24 }}
									whileInView={{ opacity: 1, y: 0 }}
									viewport={{ once: true, amount: 0.1 }}
									transition={{
										duration: 0.45,
										delay: index * 0.07,
									}}
									className={cn(
										"group relative p-6 md:p-7 rounded-2xl",
										"bg-white/90 backdrop-blur-sm",
										"border border-gray-200/90 shadow-lg shadow-gray-900/5",
										"hover:shadow-xl hover:shadow-blue-900/5",
										"hover:border-blue-200/70",
										"transition-all duration-300",
										"overflow-hidden"
									)}
								>
									{/* Accent bar */}
									<div
										className={cn(
											"absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl",
											"bg-gradient-to-b from-blue-500 to-blue-400",
											"opacity-80 group-hover:opacity-100 transition-opacity"
										)}
									/>
									<div className="pl-4">
										<h3 className="text-lg font-bold text-gray-900 mb-1">
											{person.name}
										</h3>
										<p className="text-sm font-semibold text-blue-600 mb-4">
											{person.title}
										</p>
										<p className="text-gray-700 leading-relaxed text-[15px]">
											{person.bio}
										</p>
									</div>
								</motion.article>
							))}
						</div>
					</div>
				</section>

				{/* Technical Staff */}
				<section className="relative py-16 md:py-24">
					<div
						className="absolute inset-0 bg-gradient-to-b from-gray-100/40 via-white/30 to-transparent pointer-events-none"
						aria-hidden
					/>
					<div className="container mx-auto px-4 max-w-5xl relative">
						<motion.h2
							initial={{ opacity: 0, y: 16 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.4 }}
							className="text-center text-2xl md:text-3xl font-bold text-gray-900 tracking-tight mb-4"
						>
							Technical Staff
						</motion.h2>
						<motion.p
							initial={{ opacity: 0, y: 12 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.4, delay: 0.06 }}
							className="text-gray-600 text-base max-w-2xl mb-12 text-center mx-auto"
						>
							Our technical and advisory teams bring deep domain expertise and engineering rigor to CapMatch’s platform and client outcomes.
						</motion.p>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							{TECHNICAL_STAFF.map((person, index) => (
								<motion.article
									key={person.name}
									initial={{ opacity: 0, y: 24 }}
									whileInView={{ opacity: 1, y: 0 }}
									viewport={{ once: true, amount: 0.1 }}
									transition={{
										duration: 0.45,
										delay: index * 0.07,
									}}
									className={cn(
										"group relative p-6 md:p-7 rounded-2xl",
										"bg-white/90 backdrop-blur-sm",
										"border border-gray-200/90 shadow-lg shadow-gray-900/5",
										"hover:shadow-xl hover:shadow-blue-900/5",
										"hover:border-blue-200/70",
										"transition-all duration-300",
										"overflow-hidden"
									)}
								>
									<div
										className={cn(
											"absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl",
											"bg-gradient-to-b from-blue-500 to-blue-400",
											"opacity-80 group-hover:opacity-100 transition-opacity"
										)}
									/>
									<div className="pl-4">
										<h3 className="text-lg font-bold text-gray-900 mb-1">
											{person.name}
										</h3>
										<p className="text-sm font-semibold text-blue-600 mb-4">
											{person.department}
										</p>
										<p className="text-gray-700 leading-relaxed text-[15px]">
											{person.bio}
										</p>
									</div>
								</motion.article>
							))}
						</div>
					</div>
				</section>
			</main>

			<Footer />
		</div>
	);
}
