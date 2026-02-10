// src/app/page.tsx
"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, useScroll, useTransform } from "framer-motion";
import { EnhancedHeader } from "../components/ui/EnhancedHeader";
import { Footer } from "../components/ui/Footer";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";
import {
	BusinessModelSection,
	HowItWorksSection,
	UnderTheHoodSection,
	WhoItsForSection,
	CaseStudiesSection,
	ClosingSection,
} from "@/components/landing";

export default function HomePage() {
	const router = useRouter();

	const [scrolled, setScrolled] = useState(false);
	const [textAnimation, setTextAnimation] = useState({
		part1Visible: false,
		part2Visible: false,
		part3Visible: false,
		part4Visible: false,
	});

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

	useEffect(() => {
		const t1 = setTimeout(
			() => setTextAnimation((p) => ({ ...p, part1Visible: true })),
			300
		);
		const t2 = setTimeout(
			() => setTextAnimation((p) => ({ ...p, part2Visible: true })),
			800
		);
		const t3 = setTimeout(
			() => setTextAnimation((p) => ({ ...p, part3Visible: true })),
			1300
		);
		const t4 = setTimeout(
			() => setTextAnimation((p) => ({ ...p, part4Visible: true })),
			1700
		);
		return () => {
			clearTimeout(t1);
			clearTimeout(t2);
			clearTimeout(t3);
			clearTimeout(t4);
		};
	}, []);

	const handleScrollToHowItWorks = useCallback(() => {
		document
			.getElementById("how-it-works")
			?.scrollIntoView({ behavior: "smooth" });
	}, []);

	const handleAccessDealRoom = useCallback(() => {
		router.push("/login");
	}, [router]);

	const platformPreviewRef = useRef<HTMLElement>(null);
	const { scrollYProgress } = useScroll({
		target: platformPreviewRef,
		offset: ["start end", "center center", "end start"],
	});
	// Smoother scale: longer plateau at full size, gentler in/out
	const previewScale = useTransform(
		scrollYProgress,
		[0, 0.2, 0.4, 0.6, 0.8, 1],
		[0.55, 0.78, 1, 1, 0.78, 0.55]
	);
	const previewOpacity = useTransform(
		scrollYProgress,
		[0, 0.15, 0.4, 0.6, 0.85, 1],
		[0.7, 1, 1, 1, 1, 0.7]
	);

	return (
		<div
			className={cn(
				"min-h-screen flex flex-col transition-colors duration-300 relative z-10"
			)}
			style={{
				backgroundColor: "#ffffff",
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
			<EnhancedHeader scrolled={scrolled} textVisible={true} />

			<main className="flex-grow transition-colors duration-300 relative z-10">
				{/* Hero */}
				<section
					className="relative overflow-hidden transition-colors duration-300 pt-24 pb-24"
					style={{
						minHeight: "100vh",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						backgroundColor: "transparent",
					}}
				>
					{/* Dimmed background video — loop, no controls, non-interactive */}
					<div
						className="absolute inset-0 z-0"
						aria-hidden
					>
						<video
							autoPlay
							loop
							muted
							playsInline
							disablePictureInPicture
							disableRemotePlayback
							tabIndex={-1}
							className="absolute inset-0 w-full h-full object-cover pointer-events-none"
							style={{ filter: "brightness(0.45)" }}
						>
							<source
								src="/CapMatchHeroBackgroundV1.mp4"
								type="video/mp4"
							/>
						</video>
						<div
							className="absolute inset-0 bg-black/30 pointer-events-none"
							aria-hidden
						/>
					</div>
					<motion.div
						className="container mx-auto px-4 max-w-7xl text-center relative z-20"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.8 }}
					>
						<motion.div className="mb-8">
							<div className="overflow-hidden">
								<motion.div
									initial={{ opacity: 0, y: 20 }}
									animate={{
										opacity: textAnimation.part1Visible
											? 1
											: 0,
										y: textAnimation.part1Visible ? 0 : 20,
									}}
									transition={{ duration: 0.6 }}
									className="text-5xl md:text-6xl lg:text-7xl leading-tight text-white"
								>
									CRE Funding
								</motion.div>
							</div>
							<div className="overflow-hidden mt-2">
								<motion.div
									initial={{ opacity: 0, y: 20 }}
									animate={{
										opacity: textAnimation.part2Visible
											? 1
											: 0,
										y: textAnimation.part2Visible ? 0 : 20,
									}}
									transition={{ duration: 0.6 }}
									className="text-5xl md:text-6xl lg:text-7xl leading-tight text-white"
								>
									From{" "}
									<span className="text-blue-300">Months</span>{" "}
									to{" "}
									<span className="text-blue-300">Minutes</span>
								</motion.div>
							</div>
							<div className="overflow-hidden mt-4">
								<motion.div
									initial={{ opacity: 0, y: 20 }}
									animate={{
										opacity: textAnimation.part3Visible
											? 1
											: 0,
										y: textAnimation.part3Visible ? 0 : 20,
									}}
									transition={{ duration: 0.6 }}
									className="text-xl md:text-2xl text-gray-200 font-medium"
								>
									The Operating System for Commercial Real
									Estate Financing
								</motion.div>
							</div>
							<div className="overflow-hidden mt-6">
								<motion.div
									initial={{ opacity: 0, y: 20 }}
									animate={{
										opacity: textAnimation.part4Visible
											? 1
											: 0,
										y: textAnimation.part4Visible ? 0 : 20,
									}}
									transition={{ duration: 0.6 }}
									className="text-lg md:text-xl max-w-3xl mx-auto text-gray-300"
								>
									CapMatch is a fully integrated, AI-enabled
									brokerage—from document intake to loan
									closing. We handle everything in between.
								</motion.div>
							</div>
						</motion.div>
						<motion.div
							initial={{ opacity: 0 }}
							animate={{
								opacity: textAnimation.part4Visible ? 1 : 0,
							}}
							transition={{ duration: 0.6, delay: 0.3 }}
						>
							<div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 justify-center">
								<Button
									variant="primary"
									size="lg"
									className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-8"
									style={{
										boxShadow:
											"0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
									}}
									onClick={handleScrollToHowItWorks}
								>
									See How It Works
								</Button>
								<Button
									variant="outline"
									size="lg"
									onClick={handleAccessDealRoom}
									className="rounded-full border-white/70 !text-white hover:bg-white/10 hover:border-white bg-transparent"
									style={{
										boxShadow:
											"0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1)",
									}}
								>
									Access Deal Room
								</Button>
							</div>
						</motion.div>
					</motion.div>
				</section>

				{/* Platform preview — top half visible below hero; expands to full viewport on scroll, then back */}
				<section
					ref={platformPreviewRef}
					className="relative -mt-[38vh]"
					style={{ height: "200vh" }}
				>
					<div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden">
						<motion.div
							className="w-screen h-screen flex items-center justify-center origin-center will-change-transform"
							style={{
								scale: previewScale,
								opacity: previewOpacity,
							}}
						>
							<div className="w-full h-full min-w-full min-h-full rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center shadow-lg">
								<span className="text-gray-500 text-sm">
									[ Platform preview video or auto-fill
									animation placeholder ]
								</span>
							</div>
						</motion.div>
					</div>
				</section>

				<HowItWorksSection />
				<UnderTheHoodSection />
				<BusinessModelSection />
				<WhoItsForSection />
				<CaseStudiesSection />
				<ClosingSection />
			</main>

			<Footer />
		</div>
	);
}
