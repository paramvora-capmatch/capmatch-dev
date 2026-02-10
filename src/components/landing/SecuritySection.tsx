"use client";

import React from "react";
import { motion } from "framer-motion";
import { Lock, ShieldCheck, UserCheck, Shield } from "lucide-react";
import Image from "next/image";
import { InfiniteSlider } from "@/components/ui/InfiniteSlider";

const securityFeatures = [
	{
		id: "correct",
		title: "CORRECT",
		shortDescription: "Sanity checks & Human review",
		description:
			"We enforce rigorous correctness checks. Every piece of data is subjected to automated sanity checks, and a human is always in the loop to review and confirm critical details.",
		icon: <UserCheck className="w-6 h-6 text-blue-600" />,
		gradient: "from-blue-500/10 to-indigo-500/10",
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
		icon: <Shield className="w-6 h-6 text-blue-600" />,
		gradient: "from-blue-600/10 to-blue-400/10",
		borderColor: "border-blue-200/50",
	},
];

const partnerLogos = [
	{ src: "/Landing-Page/SecuritySectionLogos/image.png", name: "CoStar" },
	{ src: "/Landing-Page/SecuritySectionLogos/FHFA-image (5)-new.png", name: "FHFA" },
	{ src: "/Landing-Page/SecuritySectionLogos/image (3).png", name: "Census" },
	{ src: "/Landing-Page/SecuritySectionLogos/BLS - image (4) -new.png", name: "BLS" },
	{ src: "/Landing-Page/SecuritySectionLogos/fema-1-new.png", name: "FEMA" },
	{ src: "/Landing-Page/SecuritySectionLogos/US Census image(2) - new.png", name: "Census Bureau" },
	{ src: "/Landing-Page/SecuritySectionLogos/Yardi-new.png", name: "Yardi" },
];

export function SecuritySection() {
	return (
		<section
			className="relative py-32 overflow-hidden border-t border-gray-100 bg-white"
			style={{
				backgroundImage: `
					repeating-linear-gradient(
						45deg,
						transparent,
						transparent 10px,
						rgba(209, 213, 219, 0.1) 10px,
						rgba(209, 213, 219, 0.1) 11px
					),
					repeating-linear-gradient(
						-45deg,
						transparent,
						transparent 10px,
						rgba(209, 213, 219, 0.1) 10px,
						rgba(209, 213, 219, 0.1) 11px
					)
				`,
			}}
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
				<div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10 items-stretch mb-20">
					{securityFeatures.map((feature, idx) => (
						<div key={feature.id} className="h-full">
							<SecurityCard feature={feature} delay={0.1 * (idx + 1)} />
						</div>
					))}
				</div>

				{/* Partner Logos Infinite Slider */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.6, delay: 0.4 }}
					className="pt-16 border-t border-gray-100/50"
				>
					<div className="relative">
						{/* Gradient Mask for fading edges */}
						<div
							className="absolute inset-0 z-10 pointer-events-none"
							style={{
								background: 'linear-gradient(to right, white, transparent 15%, transparent 85%, white)'
							}}
						/>
						<InfiniteSlider gap={100} speed={40} className="py-12">
							{partnerLogos.map((logo, idx) => (
								<div
									key={idx}
									className="relative grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-500 flex items-center justify-center h-24 lg:h-32 w-24 lg:w-32"
								>
									<Image
										src={logo.src}
										alt={logo.name}
										fill
										className="object-contain p-4"
									/>
								</div>
							))}
						</InfiniteSlider>
					</div>
				</motion.div>
			</div>
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
			className={`group relative h-full overflow-hidden bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-sm border ${feature.borderColor} hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}
		>
			{/* Subtle Gradient Background */}
			<div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

			<div className="relative z-10">
				<div className="flex items-start justify-between mb-6">
					<div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100 group-hover:scale-110 transition-transform duration-300">
						{feature.icon}
					</div>
					<div className="px-3 py-1 bg-gray-50 rounded-full text-[10px] font-bold tracking-widest text-gray-400 uppercase">
						Active Protection
					</div>
				</div>

				<h4 className="text-xl font-bold text-gray-900 mb-2 tracking-tight group-hover:text-blue-600 transition-colors duration-300">
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
