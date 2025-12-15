// src/components/ui/Footer.tsx
"use client";

import React from "react";
import Link from "next/link";
import { Linkedin, Twitter, Facebook } from "lucide-react";
import { cn } from "@/utils/cn";

export const Footer: React.FC = () => {
	const currentYear = new Date().getFullYear();

	return (
		<footer className="py-6 transition-colors duration-300 bg-gray-50 text-gray-900">
			<div className="container mx-auto px-4 max-w-7xl">
				<div className="flex flex-col md:flex-row justify-between items-center">
					{/* Logo and tagline */}
					<div className="mb-4 md:mb-0 text-center md:text-left">
						<h2 className="text-xl font-bold mb-1 text-gray-900">
							CapMatch
						</h2>
						<p className="text-sm text-gray-600">
							AI-Powered. Borrower-Controlled. Commercial Lending,
							Simplified.
						</p>
						<p
							className="text-sm md:text-base mt-1 text-gray-500"
							style={{ fontSize: "clamp(14px, 0.875rem, 16px)" }}
						>
							Join thousands of borrowers who have found the
							perfect financing solution through our platform.
						</p>
					</div>

					{/* Navigation links and social icons */}
					<div className="flex flex-wrap justify-center md:justify-end">
						<div className="flex space-x-4 mr-6">
							<Link
								href="/terms"
								className="text-sm transition-colors text-gray-600 hover:text-gray-900"
							>
								Terms
							</Link>
							<Link
								href="/privacy"
								className="text-sm transition-colors text-gray-600 hover:text-gray-900"
							>
								Privacy
							</Link>
							<Link
								href="/contact"
								className="text-sm transition-colors text-gray-600 hover:text-gray-900"
							>
								Contact
							</Link>
						</div>

						<div className="flex space-x-4 mt-3 md:mt-0">
							<a
								href="https://linkedin.com"
								target="_blank"
								rel="noopener noreferrer"
								className="transition-colors text-gray-600 hover:text-blue-600"
							>
								<Linkedin size={18} />
							</a>
							<a
								href="https://twitter.com"
								target="_blank"
								rel="noopener noreferrer"
								className="transition-colors text-gray-600 hover:text-blue-600"
							>
								<Twitter size={18} />
							</a>
							<a
								href="https://facebook.com"
								target="_blank"
								rel="noopener noreferrer"
								className="transition-colors text-gray-600 hover:text-blue-600"
							>
								<Facebook size={18} />
							</a>
						</div>
					</div>
				</div>

				{/* Copyright line */}
				<div
					className="text-sm text-center mt-4 text-gray-400"
					style={{ fontSize: "clamp(14px, 0.875rem, 16px)" }}
				>
					© {currentYear} CapMatch. All rights reserved.
				</div>
			</div>
		</footer>
	);
};
