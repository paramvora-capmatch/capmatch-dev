// src/app/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { EnhancedHeader } from "../components/ui/EnhancedHeader";
import { Footer } from "../components/ui/Footer";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";
import {
	BusinessModelSection,
	HowItWorksSection,
	WhoItsForSection,
	CaseStudiesSection,
	SecuritySection,
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
					className={cn(
						"relative overflow-hidden transition-all duration-700 ease-in-out pt-64 pb-20",
						scrolled ? "rounded-b-[50px] mx-6 md:mx-12" : ""
					)}
					style={{
						minHeight: "100vh",
						display: "flex",
						alignItems: "flex-start",
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
						>
							<source
								src="/CapMatchHeroBackgroundV1.mp4"
								type="video/mp4"
							/>
						</video>
						<div
							className="absolute inset-0 bg-gradient-to-b from-white/60 via-white/80 to-white pointer-events-none"
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
									className="text-5xl md:text-6xl lg:text-7xl leading-tight text-gray-900"
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
									className="text-5xl md:text-6xl lg:text-7xl leading-tight text-gray-900"
								>
									From{" "}
									<span className="text-blue-600">Months</span>{" "}
									to{" "}
									<span className="text-blue-600">Minutes</span>
								</motion.div>
							</div>
							<div className="overflow-hidden mt-6">
								<motion.div
									initial={{ opacity: 0, y: 20 }}
									animate={{
										opacity: textAnimation.part3Visible
											? 1
											: 0,
										y: textAnimation.part3Visible ? 0 : 20,
									}}
									transition={{ duration: 0.6 }}
									className="text-lg md:text-xl max-w-3xl mx-auto text-gray-600"
								>
									CapMatch is the Operating System for
									Commercial Real Estate Financing—from
									document intake to loan closing. We handle
									everything in between.
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
									className="rounded-full border-gray-300 !text-gray-900 hover:bg-gray-100 hover:border-gray-400 bg-transparent"
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

				{/* Platform preview — Static, wide, no scroll animation */}
				<section className="relative z-[25] pt-20 pb-20 px-4">
					<div className="container mx-auto max-w-[80%]">
						<div className="aspect-video w-full rounded-xl shadow-2xl overflow-hidden bg-black">
							<iframe
								className="w-full h-full"
								src="https://www.youtube.com/embed/Suy8VlbZ1yY?rel=0&autoplay=1&mute=1"
								title="CapMatch Demo"
								allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
								allowFullScreen
							/>
						</div>
					</div>
				</section>

				<HowItWorksSection />
				<BusinessModelSection />
				<WhoItsForSection />
				<CaseStudiesSection />
				<SecuritySection />
			</main>

			<Footer />
		</div>
	);
}
