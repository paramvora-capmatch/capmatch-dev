"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Linkedin, Twitter } from "lucide-react";

export const Footer: React.FC = () => {
	const currentYear = new Date().getFullYear();

	return (
		<footer className="bg-gray-100 border-t border-gray-200 text-gray-900">
			<div className="container mx-auto px-4 max-w-7xl py-12 md:py-16">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
					{/* Brand */}
					<div className="lg:col-span-1">
						<Link href="/" className="flex items-center mb-4">
							<Image
								src="/CapMatch-FullREs-Logo.png"
								alt="CapMatch"
								width={240}
								height={72}
								className="h-10 w-auto"
							/>
						</Link>
						<p className="text-sm text-gray-600 mb-4 max-w-xs">
							The Operating System for Commercial Real Estate
							Financing
						</p>
						<div className="flex gap-4">
							<a
								href="https://linkedin.com"
								target="_blank"
								rel="noopener noreferrer"
								className="text-gray-500 hover:text-blue-600 transition-colors"
								aria-label="LinkedIn"
							>
								<Linkedin size={20} />
							</a>
							<a
								href="https://twitter.com"
								target="_blank"
								rel="noopener noreferrer"
								className="text-gray-500 hover:text-blue-600 transition-colors"
								aria-label="Twitter"
							>
								<Twitter size={20} />
							</a>
						</div>
					</div>

					{/* Platform */}
					<div>
						<h3 className="font-semibold text-gray-900 mb-4">
							Platform
						</h3>
						<nav className="flex flex-col gap-3">
							<Link
								href="/#case-studies"
								className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
							>
								Case Studies
							</Link>
							<Link
								href="/#how-it-works"
								className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
							>
								Operating System
							</Link>
							<Link
								href="/#refi-radar"
								className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
							>
								Refi Radar
							</Link>
							<Link
								href="/#borrowers-and-lenders"
								className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
							>
								For Borrowers
							</Link>
							<Link
								href="/#borrowers-and-lenders"
								className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
							>
								For Lenders
							</Link>
						</nav>
					</div>

					{/* Company */}
					<div>
						<h3 className="font-semibold text-gray-900 mb-4">
							Company
						</h3>
						<nav className="flex flex-col gap-3">
							<Link
								href="/about"
								className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
							>
								About
							</Link>
							<Link
								href="/resources"
								className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
							>
								Resources
							</Link>
						</nav>
					</div>

					{/* Legal */}
					<div>
						<h3 className="font-semibold text-gray-900 mb-4">
							Legal
						</h3>
						<nav className="flex flex-col gap-3">
							<Link
								href="/terms"
								className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
							>
								Terms of Service
							</Link>
							<Link
								href="/privacy"
								className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
							>
								Privacy Policy
							</Link>
						</nav>
					</div>
				</div>

				<div className="mt-12 pt-8 border-t border-gray-200 text-center">
					<p className="text-sm text-gray-500">
						© {currentYear} CapMatch. All rights reserved.
					</p>
				</div>
			</div>
		</footer>
	);
};
