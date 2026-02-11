"use client";

import React, { useEffect, useState } from "react";
import { EnhancedHeader } from "@/components/ui/EnhancedHeader";
import { Footer } from "@/components/ui/Footer";
import { LenderLineSection } from "@/components/landing/LenderLineSection";
import { cn } from "@/utils/cn";

export default function BorrowersPage() {
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
				<LenderLineSection />
			</main>

			<Footer />
		</div>
	);
}
