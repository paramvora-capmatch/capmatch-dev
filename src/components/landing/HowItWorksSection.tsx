"use client";

import React from "react";
import {
	Upload,
	Sparkles,
	FileText,
	LayoutDashboard,
	Search,
	Send,
} from "lucide-react";
import { StickyScroll } from "@/components/ui/sticky-scroll-reveal";

const howItWorksContent = [
	{
		title: "Upload Your Documents",
		description:
			"Drop in whatever you have—PDF, Excel, Word. Messy or polished, CapMatch handles it.",
		content: (
			<div className="flex h-full w-full items-center justify-center p-4">
				<Upload size={64} className="text-white/80" />
			</div>
		),
	},
	{
		title: "AI Auto-Fill",
		description:
			"Our AI extracts data from your documents. Project and borrower resumes populate automatically.",
		content: (
			<div className="flex h-full w-full items-center justify-center p-4">
				<Sparkles size={64} className="text-white/80" />
			</div>
		),
	},
	{
		title: "Lender-Ready Resumes",
		description:
			"Complete project and borrower profiles. Version history, real-time collaboration, AI validation.",
		content: (
			<div className="flex h-full w-full items-center justify-center p-4">
				<FileText size={64} className="text-white/80" />
			</div>
		),
	},
	{
		title: "Live Offering Memorandum",
		description:
			"Dynamic OM dashboard—not a static PDF. Deal snapshots, market maps, scenario modeling.",
		content: (
			<div className="flex h-full w-full items-center justify-center p-4">
				<LayoutDashboard size={64} className="text-white/80" />
			</div>
		),
	},
	{
		title: "Intelligent Lender Matching",
		description:
			"AI-powered matching by asset, deal type, location. LenderLine™ visualizes your ideal capital partners.",
		content: (
			<div className="flex h-full w-full items-center justify-center p-4">
				<Search size={64} className="text-white/80" />
			</div>
		),
	},
	{
		title: "Personalized Delivery",
		description:
			"Materials formatted for each lender's preferences. PDF, Excel, or live dashboard—we deliver it.",
		content: (
			<div className="flex h-full w-full items-center justify-center p-4">
				<Send size={64} className="text-white/80" />
			</div>
		),
	},
];

export function HowItWorksSection() {
	return (
		<section id="how-it-works" className="py-16 md:py-20 bg-white">
			<div className="container mx-auto px-4 max-w-7xl">
				<div className="text-center mb-12">
					<h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
						How It Works
					</h2>
					<p className="text-lg text-gray-600 max-w-2xl mx-auto">
						From messy documents to funded loan—one vertically integrated
						platform.
					</p>
				</div>
				<StickyScroll content={howItWorksContent} />
			</div>
		</section>
	);
}
