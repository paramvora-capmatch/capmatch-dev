import React from "react";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "SoGood Apartments | Case Study | CapMatch",
	description:
		"Construction financing case study: SoGood Apartments, Dallas TX — 116-unit mixed-use Opportunity Zone development with Hoque Global and ACARA.",
};

export default function SoGoodCaseStudyPage() {
	return (
		<article className="container mx-auto px-4 max-w-4xl">
			{/* Hero */}
			<header className="mb-12">
				<p className="text-sm font-medium text-blue-600 mb-2">
					Case Study · Mixed-Use · Opportunity Zone
				</p>
				<h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
					SoGood Apartments
				</h1>
				<p className="text-xl text-gray-600 mb-8">
					2300 Hickory St · Dallas, TX 75215
				</p>

                {/* Lenders & Partners Badges */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="h-10 relative w-28 grayscale opacity-90 hover:grayscale-0 hover:opacity-100 transition-all duration-300">
                        <img
                            src="/SoGood-CaseStudy/lenders/northmarq.svg"
                            alt="Northmarq"
                            className="h-full w-full object-contain object-left"
                        />
                    </div>
                </div>
			</header>

			<div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden bg-gray-100 mb-12">
				<Image
					src="/SoGood-CaseStudy/MainImage.webp"
					alt="SoGood Apartments"
					fill
					className="object-cover"
					sizes="(max-width: 896px) 100vw, 896px"
					priority
				/>
			</div>

			{/* Executive Summary */}
			<section className="mb-12">
				<h2 className="text-2xl font-bold text-gray-900 mb-4">
					Executive Summary
				</h2>
				<p className="text-gray-700 leading-relaxed mb-4">
					Northmarq and Acara were exclusively retained by Hoque Global
					(&quot;Sponsor&quot;) to arrange construction financing for
					SoGood Apartments in Dallas, Texas. The subject is a
					mixed-use development with retail, office, Innovation
					Center, and 116 multifamily units located within an
					Opportunity Zone, part of the larger SoGood master-planned
					development. Groundbreaking was anticipated in Q3 2025, with
					completion expected by Q3 2027.
				</p>
				<p className="text-gray-700 leading-relaxed mb-4">
					The property includes 84 studio units (avg. 385 SF), 24
					one-bedroom units (avg. 759 SF), and 8 two-bedroom units
					(avg. 1,120 SF). The building has first-floor retail,
					second-floor office, and an Innovation Center across floors
					1–2. <strong>GSV Holdings LLC</strong> signed a 10-year lease
					for 30,000 SF at the Innovation Center. Amenities include a
					fitness center, shared workspace and lounge, outdoor
					terrace, and swimming pool, with 180 parking spaces for
					residents.
				</p>
				<p className="text-gray-700 leading-relaxed">
					Given the Opportunity Zone designation, investors could
					optimize returns while contributing to economic development
					through tax deferral and elimination of capital gains tax.
					The sponsorship sought an <strong>$18M</strong> construction
					loan with extension options, underwriting to 60% LTC and a
					7.6% untrended yield on cost.
				</p>
			</section>

			{/* Deal Highlights */}
			<section className="mb-12">
				<h2 className="text-2xl font-bold text-gray-900 mb-4">
					Deal Highlights
				</h2>
				<ul className="space-y-3 text-gray-700">
					<li className="flex gap-2">
						<span className="text-blue-600 font-medium">·</span>
						<strong>Location:</strong> Near the $3.7B Kay Bailey
						Hutchison Convention Center overhaul (2.5M SF expansion
						with integrated commercial and retail).
					</li>
					<li className="flex gap-2">
						<span className="text-blue-600 font-medium">·</span>
						<strong>Pre-leased:</strong> 30,000 SF Innovation Center
						pre-leased for 10 years to GSV Holdings LLC.
					</li>
					<li className="flex gap-2">
						<span className="text-blue-600 font-medium">·</span>
						<strong>Sponsor:</strong> Hoque Global with ACARA as
						equity partner; vertically integrated from site selection
						to management.
					</li>
					<li className="flex gap-2">
						<span className="text-blue-600 font-medium">·</span>
						<strong>Market:</strong> Dallas–Fort Worth leads in
						population and job growth; strong multifamily absorption
						and resilient asset class through rate volatility.
					</li>
					<li className="flex gap-2">
						<span className="text-blue-600 font-medium">·</span>
						<strong>Demographics:</strong> 75%+ renter-occupied within
						3 miles; 33% population growth since 2010 with ~9%
						projected through 2029.
					</li>
				</ul>
			</section>

			{/* Loan Summary */}
			<section className="mb-12">
				<h2 className="text-2xl font-bold text-gray-900 mb-4">
					Loan Summary
				</h2>
				<div className="overflow-x-auto">
					<table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
						<tbody className="divide-y divide-gray-200">
							<tr className="bg-gray-50">
								<td className="px-4 py-3 font-medium text-gray-700">
									Senior loan amount
								</td>
								<td className="px-4 py-3 text-gray-900">
									$18,000,000
								</td>
							</tr>
							<tr>
								<td className="px-4 py-3 text-gray-700">
									Loan per unit
								</td>
								<td className="px-4 py-3">$155,000</td>
							</tr>
							<tr className="bg-gray-50">
								<td className="px-4 py-3 text-gray-700">
									Term
								</td>
								<td className="px-4 py-3">
									2-year senior construction, then permanent
								</td>
							</tr>
							<tr>
								<td className="px-4 py-3 text-gray-700">
									Senior loan to cost
								</td>
								<td className="px-4 py-3">60%</td>
							</tr>
							<tr className="bg-gray-50">
								<td className="px-4 py-3 text-gray-700">
									Year 1 untrended NOI
								</td>
								<td className="px-4 py-3">$2,268,000</td>
							</tr>
							<tr>
								<td className="px-4 py-3 text-gray-700">
									Yield on cost (untrended)
								</td>
								<td className="px-4 py-3">7.6%</td>
							</tr>
							<tr className="bg-gray-50">
								<td className="px-4 py-3 text-gray-700">
									Debt yield (Year 1 NOI)
								</td>
								<td className="px-4 py-3">12.6%</td>
							</tr>
						</tbody>
					</table>
				</div>
			</section>

			{/* Property Overview */}
			<section className="mb-12">
				<h2 className="text-2xl font-bold text-gray-900 mb-4">
					Property Overview
				</h2>
				<p className="text-gray-700 leading-relaxed mb-4">
					SoGood is a master-planned urban community near the Farmers
					Market, Deep Ellum, the Cedars, and Fair Park, south of
					I-30. Hoque Global is reshaping Dallas&apos;s southern
					sector with an innovation center, hundreds of residential
					units, dining, and commercial space to create a major
					innovation district and drive job creation.
				</p>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
					<div className="border border-gray-200 rounded-lg p-4">
						<p className="text-gray-500 mb-1">Total units</p>
						<p className="font-semibold text-gray-900">116</p>
					</div>
					<div className="border border-gray-200 rounded-lg p-4">
						<p className="text-gray-500 mb-1">Residential NRSF</p>
						<p className="font-semibold text-gray-900">59,520 SF</p>
					</div>
					<div className="border border-gray-200 rounded-lg p-4">
						<p className="text-gray-500 mb-1">Gross building area</p>
						<p className="font-semibold text-gray-900">127,406 SF</p>
					</div>
					<div className="border border-gray-200 rounded-lg p-4">
						<p className="text-gray-500 mb-1">Parking</p>
						<p className="font-semibold text-gray-900">180 spaces</p>
					</div>
				</div>
			</section>

			{/* Sponsor */}
			<section className="mb-12">
				<h2 className="text-2xl font-bold text-gray-900 mb-4">
					Sponsor Overview
				</h2>
				<p className="text-gray-700 leading-relaxed mb-4">
					<strong>Hoque Global</strong> is a diversified investment
					firm focused on transformative real estate and catalytic
					ventures in hospitality, logistics, and technology. The
					sponsor is known for revitalizing communities and
					strategically investing in projects with significant social
					impact.
				</p>
				<p className="text-gray-700 leading-relaxed">
					<strong>ACARA</strong>, the equity partner, offers
					accredited investors exclusive multifamily opportunities
					and collaborates with top developers nationwide using a
					vertically integrated approach from site selection to
					management, targeting primary and secondary markets with
					long-term growth potential.
				</p>
			</section>

			<p className="text-sm text-gray-500 border-t border-gray-200 pt-8">
				Source: Northmarq / ACARA construction financing package. This
				summary is for illustrative purposes.
			</p>
		</article>
	);
}
