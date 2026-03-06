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
		bio: "15 years of experience driving AI-powered capital markets for multifamily and Opportunity Zone investments at CapMatch and OZ Listings. Former growth leadership at eXp Realty ($2B+ annual volume) and Chief Operating Partner at ACARA Management.",
	},
	{
		name: "Param Vora",
		title: "Chief Technology Officer & Chief Operating Officer",
		bio: "Director of AI at The Cool Down (60M+ monthly visits, fastest-growing U.S. media brand in early 2025). Former CTO of Solarcheckr (650% increase in financing approvals, successful acquisition); Cleantech Open alumnus. Chief BD at Urbanests Housing Services for 1Y. 9+ years of ML/AI experience. Leading CapMatch&apos;s technology vision across underwriting, automation, and investor intelligence.",
	},
	{
		name: "Todd Vitzthum",
		title: "Executive Chairman",
		bio: "23 years of experience, executing over $3B in commercial real estate transactions. Drives tech-enabled capital platforms at CapMatch and OZ Listings. Managing Partner at ACARA Management leading multifamily investment strategy and Opportunity Zone deployment.",
	},
	{
		name: "Michael Krueger",
		title: "Chief Legal Officer",
		bio: "Partner at Lucosky Brookman LLP, corporate and securities attorney specializing in capital markets, structured finance, and complex transactions. Ensures CapMatch operates with regulatory rigor, transaction integrity, and governance frameworks suitable for institutional counterparties.",
	},
	{
		name: "Gregory J. Kapust",
		title: "Advisory",
		bio: "Deep experience in finance, governance, and capital allocation, with four successful exits including three exceeding $100M. Active real estate investor, providing disciplined financial oversight and ensuring CapMatch is built to scale responsibly while competing aggressively on outcomes.",
	},
];

const TECHNICAL_STAFF = [
	{
		name: "Cody Field",
		department: "Capital Markets Advisory",
		bio: "20 years as a strategic mortgage banker structuring and brokering commercial, industrial, and multifamily real estate. Served as Vice President at NorthMarq and Senior Analyst at Greystone. Also held the role of Yacht Captain.",
	},
	{
		name: "Aryan Jain",
		department: "Engineering",
		bio: "Former founder and software engineer with a background in AI productivity tools. Built and scaled a venture-backed company from zero to revenue and through a successful exit. Founded SmailBox and UsePRD, a gradCapital-backed startup focused on intelligent automation. Originally developed SmailBox, an AI-driven email client designed for advanced email inbox automation. Successfully pivoted the core technology to UsePRD, an application generating high-fidelity implementation plans for coding agents, and sold the product after seeing early revenue and traction. Selected as one of 50 founders for Founders Inc. Off-Season in San Francisco — a highly selective residency for building emerging technology at their Fort Mason campus.\n\nEducation: IIT Madras, Computer Science & Engineering — B.Tech (2023–2027). Achieved a historic branch change from Metallurgy to Computer Science (top 150 AIR cutoff), placing in the top 0.01% of 1.5 million JEE entrants.",
	},
	{
		name: "Sarthak Karandikar",
		department: "Engineering",
		bio: "Former founder of AI startup Existence, building products including open-source personal assistant Sentient with 700+ GitHub stars and 400+ users. Published 4 research papers at international conferences; holds an Indian patent for an edtech AI product. Experience scaling and monetizing content across social platforms. Contributes across product management, engineering, and content at CapMatch.\n\nEducation: Pune Vidyarthi Griha's College of Engineering and Technology",
	},
	{
		name: "Kabeer Ahmed Merchant",
		department: "Engineering",
		bio: "Former founder of Existence with experience across engineering, product development, community building and research. Built Sentient, an open-source proactive personal assistant (700+ GitHub stars) engineered to operate with the autonomy required to replace traditional human assistants. The project evolved into Sentient Cloud, an international platform serving 200+ users across the US, Germany, Turkey, and other global markets, successfully generating initial revenue. This global reach was driven by an organic ecosystem, scaling a dedicated WhatsApp community to 1,000+ members and amassing over 14 million total views across YouTube (5,000+ subscribers, 10M+ views) and Instagram (1,000+ followers, 4M+ views). Holds a granted Indian patent and has published three research papers resulting from other technical products developed at Existence.\n\nEducation: Artificial Intelligence and Data Science (2022–2026) @ Pune Vidyarthi Griha's College of Engineering and Technology, Pune",
	},
	{
		name: "Vatsal Hariramani",
		department: "Engineering",
		bio: "Former founder with experience in robotics, computer vision, and reliability-focused systems engineering. Previously at MITI Labs and Fortiss Labs (Munich). Founded Syncubator, a venture-backed MedTech startup supported by Emergent Ventures, NIDHI PRAYAS, CPS PRAYAS, and gradCapital. Holds a granted Indian utility patent.\n\nEducation: B.Tech, Computer Science & Engineering, IIT Mandi · TU Munich, Informatics (Semester Abroad)",
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
							Team Leadership
						</motion.h2>
						<motion.p
							initial={{ opacity: 0, y: 12 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.4, delay: 0.06 }}
							className="text-gray-600 text-base max-w-2xl mb-12 text-center mx-auto"
						>
							$6B+ in combined transaction volume and 20+ years of expertise in real estate, lending, and technology.
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
										<p className="text-gray-700 leading-relaxed text-[15px] whitespace-pre-wrap">
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
							Engineering & Advisory
						</motion.h2>
						<motion.p
							initial={{ opacity: 0, y: 12 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.4, delay: 0.06 }}
							className="text-gray-600 text-base max-w-2xl mb-12 text-center mx-auto"
						>
							Our technical and advisory teams bring deep domain expertise and engineering rigor to CapMatch&apos;s platform and client outcomes.
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
										<p className="text-gray-700 leading-relaxed text-[15px] whitespace-pre-wrap">
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
