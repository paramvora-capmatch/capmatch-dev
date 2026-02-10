"use client";

import React from "react";
import { motion } from "framer-motion";
import { Lock, CheckCircle2 } from "lucide-react";
import { DottedGlowBackground } from "@/components/ui/dotted-glow-background";

import { InfiniteSlider } from "@/components/ui/InfiniteSlider";
import Image from "next/image";

const bullets = [
	{
		title: "Correct",
		description:
			"We make you check every detail. A human is always in the loop—you review and confirm each step so nothing ships wrong.",
	},
	{
		title: "Secure",
		description:
			"We never train on your data. Your deal information is protected with AES encryption and role-based access control (RBAC) so only the right people see the right data.",
	},
	{
		title: "Verified",
		description:
			"We pull data from trusted sources—CoStar, Yardi, and U.S. government sources—so your underwriting and market data are verified and reliable.",
	},
];

const securityLogos = [
	"/Landing-Page/SecuritySectionLogos/image (1).png",
	"/Landing-Page/SecuritySectionLogos/image (2).png",
	"/Landing-Page/SecuritySectionLogos/image (3).png",
	"/Landing-Page/SecuritySectionLogos/image (4).png",
	"/Landing-Page/SecuritySectionLogos/image (5).png",
	"/Landing-Page/SecuritySectionLogos/image.png",
];

export function SecuritySection() {
	return (
		<section
			className="relative py-24 overflow-hidden border-t border-gray-100"
			style={{
				backgroundImage: `
					repeating-linear-gradient(
						45deg,
						transparent,
						transparent 10px,
						rgba(209, 213, 219, 0.22) 10px,
						rgba(209, 213, 219, 0.22) 11px
					),
					repeating-linear-gradient(
						-45deg,
						transparent,
						transparent 10px,
						rgba(209, 213, 219, 0.22) 10px,
						rgba(209, 213, 219, 0.22) 11px
					)
				`,
			}}
		>
			{/* Dotted glow background with radial mask */}
			<div
				className="absolute inset-0 pointer-events-none"
				style={{
					maskImage:
						"radial-gradient(circle at 50% 30%, black 0%, transparent 50%)",
					WebkitMaskImage:
						"radial-gradient(circle at 50% 30%, black 0%, transparent 50%)",
				}}
			>
				<DottedGlowBackground
					className="w-full h-full opacity-60"
					opacity={1}
					gap={12}
					radius={1.5}
					colorLightVar="--color-blue-900"
					glowColorLightVar="--color-blue-700"
					backgroundOpacity={0}
					speedMin={0.2}
					speedMax={1.0}
					speedScale={1}
				/>
			</div>

			<div className="relative z-10 w-full max-w-[90%] 2xl:max-w-[1000px] mx-auto px-6 sm:px-8 lg:px-12 py-16 lg:py-24">
				{/* Centered Lock icon */}
				<motion.div
					className="flex justify-center mb-10"
					initial={{ opacity: 0, y: 12 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5 }}
				>
					<div className="relative">
						<Lock size={80} className="text-blue-600" strokeWidth={1.5} />
						<div className="absolute inset-0 -z-10 w-32 h-32 mx-auto mt-2 bg-blue-100/50 rounded-full blur-2xl" />
					</div>
				</motion.div>

				{/* Title */}
				<motion.h2
					className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 text-center mb-4"
					initial={{ opacity: 0, y: 12 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5, delay: 0.1 }}
				>
					Correct, Secure, Verified
				</motion.h2>

				{/* Bullets */}
				<div className="mt-14 space-y-10">
					{bullets.map((item, i) => (
						<motion.div
							key={item.title}
							className="flex gap-5 text-left"
							initial={{ opacity: 0, x: -16 }}
							whileInView={{ opacity: 1, x: 0 }}
							viewport={{ once: true, margin: "-40px" }}
							transition={{ duration: 0.5, delay: 0.1 + i * 0.1 }}
						>
							<span className="flex-shrink-0 mt-1 text-blue-600">
								<CheckCircle2 size={28} strokeWidth={2} />
							</span>
							<div>
								<h3 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">
									{item.title}
								</h3>
								<p className="text-lg text-gray-600 leading-relaxed">
									{item.description}
								</p>
							</div>
						</motion.div>
					))}
				</div>

				{/* Logo Slider */}
				<motion.div
					className="mt-20 pt-10 border-t border-gray-100"
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.8, delay: 0.4 }}
				>
					<InfiniteSlider gap={60} speed={40}>
						{securityLogos.map((logo, index) => (
							<div
								key={index}
								className="flex items-center justify-center px-4"
							>
								<div className="relative h-12 w-32 grayscale hover:grayscale-0 transition-all duration-300 opacity-60 hover:opacity-100">
									<Image
										src={logo}
										alt={`Security Partner ${index + 1}`}
										fill
										className="object-contain"
									/>
								</div>
							</div>
						))}
					</InfiniteSlider>
				</motion.div>
			</div>
		</section>
	);
}
