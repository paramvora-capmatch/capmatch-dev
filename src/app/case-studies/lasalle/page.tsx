import React from "react";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "300 East LaSalle | Case Study | CapMatch",
	description:
		"Investment sales case study: 300 East LaSalle, South Bend IN — 144-unit Class A multifamily + commercial in the East Bank, IPA/Marcus & Millichap.",
};

export default function LaSalleCaseStudyPage() {
	return (
		<article className="container mx-auto px-4 max-w-4xl">
			{/* Hero */}
			<header className="mb-12">
				<p className="text-sm font-medium text-blue-600 mb-2">
					Case Study · Multifamily + Commercial
				</p>
				<h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
					300 East LaSalle
				</h1>
				<p className="text-xl text-gray-600">
					South Bend, Indiana · East Bank
				</p>
			</header>

			<div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden bg-gray-100 mb-12">
				<Image
					src="/LaSalle-CaseStudy/img-0.jpeg"
					alt="300 East LaSalle"
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
					300 East LaSalle is a Class A multifamily and commercial
					asset in South Bend&apos;s East Bank neighborhood—the
					region&apos;s most active urban area, with walkable
					restaurants, cafes, fitness centers, and parks, and only six
					blocks from Memorial Hospital (Level II Trauma, children&apos;s
					hospital, and cancer care). The property was offered through
					Institutional Property Advisors (IPA) / Marcus & Millichap
					The Kuroiwa Group.
				</p>
				<p className="text-gray-700 leading-relaxed mb-4">
					The 144-unit, 131,310 SF community was built in 2022 with a
					diverse unit mix (studios through 3BR/3BA), ground-floor
					commercial (East Race Market and DMTM office), and strong
					in-place occupancy. South Bend has a rich industrial and
					urban history; the East Bank has become the preferred
					location for modern multifamily and mixed-use living in the
					market.
				</p>
				<p className="text-gray-700 leading-relaxed">
					Pricing guidance reflected a trade range of{" "}
					<strong>$46M–$50M</strong>, with a tax-adjusted stabilized
					cap rate of approximately 6.50%–5.98% and leveraged 10-year
					IRR in the 11.5%–13.5% range under the proposed debt
					structure.
				</p>
			</section>

			{/* Investment Summary */}
			<section className="mb-12">
				<h2 className="text-2xl font-bold text-gray-900 mb-4">
					Investment Summary
				</h2>
				<div className="overflow-x-auto mb-6">
					<table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
						<thead>
							<tr className="bg-gray-100">
								<th className="px-4 py-3 text-left font-medium text-gray-700">
									Metric
								</th>
								<th className="px-4 py-3 text-left font-medium text-gray-700">
									Value
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200">
							<tr className="bg-gray-50">
								<td className="px-4 py-3 text-gray-700">
									Trade range
								</td>
								<td className="px-4 py-3 font-medium text-gray-900">
									$46,000,000 – $50,000,000
								</td>
							</tr>
							<tr>
								<td className="px-4 py-3 text-gray-700">
									Price per unit
								</td>
								<td className="px-4 py-3">
									$319,444 – $347,222
								</td>
							</tr>
							<tr className="bg-gray-50">
								<td className="px-4 py-3 text-gray-700">
									Year built
								</td>
								<td className="px-4 py-3">2022</td>
							</tr>
							<tr>
								<td className="px-4 py-3 text-gray-700">
									Units
								</td>
								<td className="px-4 py-3">144</td>
							</tr>
							<tr className="bg-gray-50">
								<td className="px-4 py-3 text-gray-700">
									Rentable square feet
								</td>
								<td className="px-4 py-3">131,310</td>
							</tr>
							<tr>
								<td className="px-4 py-3 text-gray-700">
									Average unit size
								</td>
								<td className="px-4 py-3">912 SF</td>
							</tr>
							<tr className="bg-gray-50">
								<td className="px-4 py-3 text-gray-700">
									As stabilized trailing 1 NOI
								</td>
								<td className="px-4 py-3">$2,991,512</td>
							</tr>
							<tr>
								<td className="px-4 py-3 text-gray-700">
									Tax-adj. cap (as stabilized)
								</td>
								<td className="px-4 py-3">6.50% – 5.98%</td>
							</tr>
							<tr className="bg-gray-50">
								<td className="px-4 py-3 text-gray-700">
									Leveraged 10-year IRR
								</td>
								<td className="px-4 py-3">13.5% – 11.5%</td>
							</tr>
						</tbody>
					</table>
				</div>
				<p className="text-gray-600 text-sm">
					The subject was underwritten assuming NOI includes the
					property tax abatement. The present value of the abatement
					was approximately $4.4M; some buyers may add this NPV to
					their purchase price under an alternate valuation approach.
				</p>
			</section>

			{/* Location & Neighborhood */}
			<section className="mb-12">
				<h2 className="text-2xl font-bold text-gray-900 mb-4">
					Location & Neighborhood
				</h2>
				<p className="text-gray-700 leading-relaxed mb-4">
					South Bend was founded on the southern bend of the St. Joseph
					River and grew as a portage point and center of trade. The
					East Bank is the trendiest urban neighborhood in the South
					Bend region—highly walkable, with yoga studios, fitness
					centers, restaurants, cafes, and parks, and only six blocks
					from Memorial Hospital (Level II Trauma, children&apos;s
					hospital, cancer care).
				</p>
				<p className="text-gray-700 leading-relaxed">
					The 300 East LaSalle development is a natural fit for
					investors seeking in-fill multifamily with strong
					commercial income and a stabilized rent roll in a growing
					submarket.
				</p>
			</section>

			{/* Unit Mix */}
			<section className="mb-12">
				<h2 className="text-2xl font-bold text-gray-900 mb-4">
					Unit Mix (Rent Roll Summary)
				</h2>
				<div className="overflow-x-auto">
					<table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
						<thead>
							<tr className="bg-gray-100">
								<th className="px-4 py-3 text-left font-medium text-gray-700">
									Unit type
								</th>
								<th className="px-4 py-3 text-right font-medium text-gray-700">
									Units
								</th>
								<th className="px-4 py-3 text-right font-medium text-gray-700">
									% of total
								</th>
								<th className="px-4 py-3 text-right font-medium text-gray-700">
									SF/unit
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200">
							<tr>
								<td className="px-4 py-3">Studio</td>
								<td className="px-4 py-3 text-right">24</td>
								<td className="px-4 py-3 text-right">16.7%</td>
								<td className="px-4 py-3 text-right">554</td>
							</tr>
							<tr className="bg-gray-50">
								<td className="px-4 py-3">1 BR / 1 BA</td>
								<td className="px-4 py-3 text-right">54</td>
								<td className="px-4 py-3 text-right">37.5%</td>
								<td className="px-4 py-3 text-right">780</td>
							</tr>
							<tr>
								<td className="px-4 py-3">2 BR / 1 BA</td>
								<td className="px-4 py-3 text-right">6</td>
								<td className="px-4 py-3 text-right">4.2%</td>
								<td className="px-4 py-3 text-right">982</td>
							</tr>
							<tr className="bg-gray-50">
								<td className="px-4 py-3">2 BR / 2 BA</td>
								<td className="px-4 py-3 text-right">48</td>
								<td className="px-4 py-3 text-right">33.3%</td>
								<td className="px-4 py-3 text-right">1,120</td>
							</tr>
							<tr>
								<td className="px-4 py-3">3 BR / 2 BA</td>
								<td className="px-4 py-3 text-right">6</td>
								<td className="px-4 py-3 text-right">4.2%</td>
								<td className="px-4 py-3 text-right">1,220</td>
							</tr>
							<tr className="bg-gray-50">
								<td className="px-4 py-3">3 BR / 3 BA</td>
								<td className="px-4 py-3 text-right">5</td>
								<td className="px-4 py-3 text-right">3.5%</td>
								<td className="px-4 py-3 text-right">1,490</td>
							</tr>
							<tr>
								<td className="px-4 py-3">2 BR / 3 BA</td>
								<td className="px-4 py-3 text-right">1</td>
								<td className="px-4 py-3 text-right">0.7%</td>
								<td className="px-4 py-3 text-right">1,490</td>
							</tr>
						</tbody>
					</table>
				</div>
				<p className="text-gray-600 text-sm mt-3">
					As of 3/6/24 rent roll: ~90% occupancy; market rent ~$1,895/unit;
					effective rent ~$1,848/unit.
				</p>
			</section>

			{/* Commercial */}
			<section className="mb-12">
				<h2 className="text-2xl font-bold text-gray-900 mb-4">
					Commercial Tenants
				</h2>
				<div className="overflow-x-auto">
					<table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
						<thead>
							<tr className="bg-gray-100">
								<th className="px-4 py-3 text-left font-medium text-gray-700">
									Tenant
								</th>
								<th className="px-4 py-3 text-right font-medium text-gray-700">
									SF
								</th>
								<th className="px-4 py-3 text-right font-medium text-gray-700">
									Term
								</th>
								<th className="px-4 py-3 text-right font-medium text-gray-700">
									Annual rent + CAM
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200">
							<tr>
								<td className="px-4 py-3">East Race Market (NNN)</td>
								<td className="px-4 py-3 text-right">14,507</td>
								<td className="px-4 py-3 text-right">10 years</td>
								<td className="px-4 py-3 text-right">$362,675</td>
							</tr>
							<tr className="bg-gray-50">
								<td className="px-4 py-3">DMTM – Office (Gross)</td>
								<td className="px-4 py-3 text-right">14,500</td>
								<td className="px-4 py-3 text-right">8 years</td>
								<td className="px-4 py-3 text-right">$348,000</td>
							</tr>
						</tbody>
					</table>
				</div>
				<p className="text-gray-600 text-sm mt-3">
					Commercial total: 29,007 SF · ~$710,675 annual rent + CAM.
				</p>
			</section>

			{/* Proposed Debt */}
			<section className="mb-12">
				<h2 className="text-2xl font-bold text-gray-900 mb-4">
					Proposed Loan (Summary)
				</h2>
				<ul className="space-y-2 text-gray-700">
					<li>Loan amount: $31,500,000</li>
					<li>Interest only: 5 years</li>
					<li>Amortization: 30 years (begins after IO)</li>
					<li>Interest rate: 5.85%</li>
					<li>LTV: 68.5% – 63.0%</li>
					<li>Initial DCR: 1.34</li>
				</ul>
				<p className="text-gray-600 text-sm mt-3">
					Loan structure provided by IPA Capital Markets; terms
					subject to lender due diligence and underwriting.
				</p>
			</section>

			<p className="text-sm text-gray-500 border-t border-gray-200 pt-8">
				Source: Marcus & Millichap / IPA The Kuroiwa Group. This is a
				broker price opinion / comparative market analysis and should
				not be considered an appraisal. This summary is for illustrative
				purposes.
			</p>
		</article>
	);
}
