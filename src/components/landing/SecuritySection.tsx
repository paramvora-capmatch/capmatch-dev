"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Lock, ShieldCheck, UserCheck, BadgeCheck } from "lucide-react";

type PartnerLogo = { src: string; name: string; scale: number };

const securityFeatures = [
	{
		id: "correct",
		title: "CORRECT",
		shortDescription: "Sanity checks & Human review",
		description:
			"We enforce rigorous correctness checks. Every piece of data is subjected to automated sanity checks, and a human is always in the loop to review and confirm critical details.",
		icon: <UserCheck className="w-6 h-6 text-blue-600" />,
		gradient: "from-blue-500/10 to-cyan-500/10",
		borderColor: "border-blue-200/50",
	},
	{
		id: "secure",
		title: "SECURE",
		shortDescription: "SOC2, RBAC & AES256",
		description:
			"Your data privacy is paramount. We use AES-256 encryption, strict Role-Based Access Control (RBAC), and SOC2-compliant permission sanity checks to ensure total security.",
		icon: <ShieldCheck className="w-6 h-6 text-blue-600" />,
		gradient: "from-blue-500/10 to-cyan-500/10",
		borderColor: "border-blue-200/50",
	},
	{
		id: "verified",
		title: "VERIFIED",
		shortDescription: "CapMatch Verified Data",
		description:
			"Trust in data you can rely on. 'CapMatch Verified' is our certification for data sourced from trusted partners and government records.",
		icon: <BadgeCheck className="w-6 h-6 text-blue-600" />,
		gradient: "from-blue-500/10 to-cyan-500/10",
		borderColor: "border-blue-200/50",
	},
];

export function SecuritySection() {
	const [partnerLogos, setPartnerLogos] = useState<PartnerLogo[]>([]);

	useEffect(() => {
		fetch("/api/security-logos")
			.then((res) => res.json())
			.then((data) => {
				if (Array.isArray(data.logos)) setPartnerLogos(data.logos);
			})
			.catch((err) => console.error("Failed to load security logos:", err));
	}, []);

	return (
		<section
			className="relative pt-24 pb-8 overflow-hidden"
		>
			<div className="relative z-10 w-full max-w-7xl mx-auto px-6 mb-20 text-center">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.6, ease: "easeOut" }}
				>
					<h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-4">
						Enterprise-Grade Security
					</h2>
					<p className="text-xl text-gray-600 max-w-2xl mx-auto font-medium">
						Built with precision, privacy, and absolute data integrity at its core.
					</p>
				</motion.div>
			</div>

			<div className="relative z-10 w-full max-w-7xl mx-auto px-6">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10 items-stretch mb-6">
					{securityFeatures.map((feature, idx) => (
						<div key={feature.id} className="h-full">
							<SecurityCard feature={feature} delay={0.1 * (idx + 1)} />
						</div>
					))}
				</div>
			</div>

			{/* Partner Logos Marquee - same design as Active Deal Volume, full viewport width */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				whileInView={{ opacity: 1, y: 0 }}
				viewport={{ once: true }}
				transition={{ duration: 0.6, delay: 0.4 }}
				className="pt-6 border-t border-gray-100/50 mt-6"
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
				<h3 className="text-center text-xl md:text-2xl font-bold text-gray-800 tracking-tight mb-4 sm:mb-6">
					Trusted Data Sources
				</h3>
				<div className="relative flex overflow-hidden group pt-4 sm:pt-6 md:pt-10">
					{/* Gradient Masks - fade to transparent so cross-hatch shows */}
					<div className="absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-white to-transparent pointer-events-none" />
					<div className="absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-white to-transparent pointer-events-none" />
					{/* Marquee Track - same as LenderMarquee */}
					<motion.div
						className="flex items-center gap-12 pr-12"
						animate={{
							x: partnerLogos.length > 0 ? [0, -100 * partnerLogos.length * 2] : 0,
						}}
						transition={{
							repeat: Infinity,
							duration: Math.max(25, partnerLogos.length * 6),
							ease: "linear",
						}}
					>
						{[...partnerLogos, ...partnerLogos, ...partnerLogos, ...partnerLogos].map((logo, index) => (
							<div
								key={`${logo.name}-${index}`}
								className="relative h-24 w-52 sm:h-28 sm:w-60 flex-shrink-0 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-500 transform hover:scale-110 hover:-translate-y-4 hover:z-50 cursor-pointer filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.15)]"
							>
								<img
									src={logo.src}
									alt={logo.name}
									className="h-full w-full object-contain mix-blend-multiply"
								/>
							</div>
						))}
					</motion.div>
				</div>
			</motion.div>
		</section >
	);
}

function SecurityCard({ feature, delay }: { feature: typeof securityFeatures[0]; delay: number }) {
	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.95, y: 20 }}
			whileInView={{ opacity: 1, scale: 1, y: 0 }}
			viewport={{ once: true }}
			transition={{ duration: 0.5, delay, ease: "easeOut" }}
			className={`group relative h-full overflow-hidden bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-xl border ${feature.borderColor}`}
		>
			{/* Subtle Gradient Background - always visible (blue tint) */}
			<div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-100`} />

			<div className="relative z-10">
				<div className="flex items-start mb-6">
					<div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100">
						{feature.icon}
					</div>
				</div>

				<h4 className="text-xl font-bold text-blue-600 mb-2 tracking-tight">
					{feature.title}
				</h4>

				<div className="text-blue-600/80 font-semibold text-xs mb-4 uppercase tracking-wider">
					{feature.shortDescription}
				</div>

				<p className="text-gray-600 text-[15px] leading-relaxed font-medium">
					{feature.description}
				</p>
			</div>
		</motion.div>
	);
}
