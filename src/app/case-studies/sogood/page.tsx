import React from "react";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "SoGood Apartments | Case Study | CapMatch",
	description:
		"CapMatch case study: SoGood Apartments - $18M construction financing in Dallas. CapMatch structured a living underwriting model from disconnected docs and enabled real-time lender-specific outputs.",
};

export default function SoGoodCaseStudyPage() {
	return (
		<article className="container mx-auto px-4 max-w-4xl">
			{/* Hero */}
			<header className="mb-12">
				<p className="text-sm font-medium text-blue-600 mb-2">
					Case Study · Ground-Up Mixed-Use
				</p>
				<h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
					CapMatch Case Study: SoGood Apartments
				</h1>
				<p className="text-xl text-gray-600 mb-8">
					Ground-Up Mixed-Use Construction in Dallas&apos;s Southern
					Innovation Corridor
				</p>
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

			{/* 1. Deal Snapshot */}
			<section className="mb-12">
				<h2 className="text-2xl font-bold text-gray-900 mb-4">
					1. Deal Snapshot
				</h2>
				<ul className="space-y-2 text-gray-700 leading-relaxed mb-4">
					<li>
						<strong>Asset Type:</strong> 116-unit mixed-use
						multifamily with 49,569 SF of commercial space including
						a pre-leased Innovation Center, ground-floor retail, and
						second-floor office
					</li>
					<li>
						<strong>Capital Sought:</strong> $18 million construction
						loan with permanent takeout
					</li>
					<li>
						<strong>Borrower Profile:</strong> Joint venture between
						Hoque Global (GP) and ACARA (LP), combining catalytic
						urban development expertise with institutional
						multifamily investment discipline
					</li>
				</ul>
				<p className="text-gray-700 leading-relaxed">
					<strong>Why This Deal Was Complex:</strong> The SoGood
					Apartments financing presented a layered underwriting
					challenge that static offering memoranda struggle to
					accommodate. The project combines seven distinct
					residential unit types - including 76 affordable units
					restricted to 80% AMI - with three separate commercial
					income streams operating under different lease structures. A
					30,000 SF Innovation Center carries a signed 10-year lease
					with GSV Holdings LLC featuring annual rent escalations. The
					deal also benefits from Opportunity Zone tax advantages and
					a property tax exemption structured through a Public
					Facility Corporation, requiring lenders to model multiple
					scenarios depending on their treatment of tax-advantaged
					income. No single PDF could capture the interdependencies
					between these components, and each lender approached the
					deal with different assumptions about how to value the
					mixed-use structure.
				</p>
			</section>

			{/* 2. The Challenge */}
			<section className="mb-12">
				<h2 className="text-2xl font-bold text-gray-900 mb-4">
					2. The Challenge: Disconnected Documents and Competing
					Underwriting Assumptions
				</h2>
				<p className="text-gray-700 leading-relaxed mb-4">
					When the capital advisor initiated the financing process,
					the borrower submitted a comprehensive package that
					reflected the project&apos;s inherent complexity:
				</p>
				<ul className="list-disc pl-6 space-y-2 text-gray-700 leading-relaxed mb-4">
					<li>
						A 46-page construction financing request prepared by
						Northmarq containing market analysis, architectural
						plans, demographic data, and pro forma projections
					</li>
					<li>
						Multiple unit mix schedules showing both untrended and
						trended rent assumptions across seven floor plan types
					</li>
					<li>
						Commercial lease abstracts for the Innovation Center
						(NNN with scheduled escalations), retail suite, and
						office space - each with distinct economics
					</li>
					<li>
						A developer budget breaking down $29.8 million in uses
						across land, hard costs, soft costs, financing, and
						interest reserves
					</li>
					<li>
						Rent comparables from six competing properties in the
						Downtown Dallas and Farmers Market submarkets
					</li>
					<li>
						Sale comparables from five Class A transactions, none of
						which occurred in the immediate submarket
					</li>
				</ul>
				<p className="text-gray-700 leading-relaxed mb-4">
					The documentation was thorough, but it created a fundamental
					problem: every lender who reviewed the package arrived at
					different conclusions about the deal&apos;s risk profile. One
					construction lender focused on the affordable housing
					restriction, questioning whether the 80% AMI rent caps would
					hold during lease-up. A regional bank wanted to stress-test
					the Innovation Center lease, modeling what happens if GSV
					Holdings exercises an early termination. A debt fund was
					skeptical of the 5.50% exit cap rate and requested
					sensitivity tables showing valuation at 6.00%, 6.25%, and
					6.50%. Each question required the advisor to return to the
					source documents, extract data, rebuild assumptions, and
					generate a custom response - a process that consumed days
					and introduced reconciliation risk.
				</p>
				<p className="text-gray-700 leading-relaxed">
					The challenge was compounded by the project&apos;s mixed-use
					structure. The residential pro forma showed Year 1 NOI of
					$2.27 million untrended, but this figure blended affordable
					and market-rate units, each with different vacancy and
					concession assumptions. The commercial income of $1.06
					million annually included a pre-leased Innovation Center,
					speculative office space, and a small retail suite - three
					distinct risk profiles treated as a single line item.
					Lenders couldn&apos;t easily decompose the deal into its
					constituent parts, and the static PDF format offered no
					mechanism for dynamic interrogation.
				</p>
			</section>

			{/* 3. The CapMatch Intervention */}
			<section className="mb-12">
				<h2 className="text-2xl font-bold text-gray-900 mb-4">
					3. The CapMatch Intervention: Structuring a Living
					Underwriting Model
				</h2>
				<p className="text-gray-700 leading-relaxed mb-4">
					CapMatch ingested the complete document package - including
					the Northmarq offering memorandum, architectural plans,
					lease abstracts, and developer budget - and constructed a
					unified deal model that preserved the relationships between
					components while enabling flexible output generation. The
					platform&apos;s automated processing identified several
					critical issues that would have otherwise surfaced
					mid-diligence:
				</p>
				<ul className="list-disc pl-6 space-y-2 text-gray-700 leading-relaxed mb-4">
					<li>
						The pro forma vacancy assumption of 5% applied
						uniformly to residential units, but the
						affordable-restricted studios had materially different
						lease-up dynamics than the market-rate two-bedrooms - a
						distinction that warranted separate treatment
					</li>
					<li>
						The Innovation Center lease with GSV Holdings included
						annual rent bumps from $2.08/SF to $2.46/SF over the
						10-year term, but the base case pro forma captured only
						Year 1 income without modeling the escalation schedule
					</li>
					<li>
						The developer budget included a $1.15 million interest
						reserve sized at an 8.00% construction rate, but the
						permanent takeout was modeled at 6.00% - a 200-basis-point
						spread that affected refinance proceeds and sponsor
						equity return
					</li>
					<li>
						The property tax exemption through the PFC structure
						was assumed in the base case but not stress-tested
						against a scenario where the exemption lapses or is
						challenged
					</li>
				</ul>
				<p className="text-gray-700 leading-relaxed mb-4">
					CapMatch reconciled these elements into a structured data
					model where each assumption could be traced, modified, and
					tested. The Innovation Center lease was modeled as a
					discrete cash flow with its own escalation schedule and
					rollover risk. The residential component was segmented by
					AMI restriction, allowing lenders to apply different
					vacancy and rent growth assumptions to affordable versus
					market-rate units. The tax exemption was treated as a
					toggle, enabling instant comparison between abated and
					unabated scenarios.
				</p>
				<p className="text-gray-700 leading-relaxed">
					The result was not a revised PDF but an interactive
					underwriting environment - a deal operating system that
					could generate tailored outputs without requiring manual
					reconstruction.
				</p>
			</section>

			{/* 4. Lender-Specific Outputs */}
			<section className="mb-12">
				<h2 className="text-2xl font-bold text-gray-900 mb-4">
					4. Lender-Specific Outputs Without Rebuilding the Model
				</h2>
				<p className="text-gray-700 leading-relaxed mb-4">
					With the deal structured inside CapMatch, the advisor could
					respond to lender requests in real time rather than queuing
					them for overnight turnaround. When a construction lender
					asked for a uses-of-funds schedule aligned to their draw
					format, CapMatch exported the $29.8 million budget with line
					items mapped to the lender&apos;s categories - land, hard
					costs (including 5% contingency), soft costs, financing, and
					reserves - without manual reclassification. When a debt fund
					requested a stressed cash flow showing the Innovation Center
					at 75% of contracted rent, the advisor toggled the lease
					assumption and generated an updated pro forma in minutes.
					When a regional bank wanted to see debt service coverage
					under a 30-year amortizing permanent loan at 6.00%,
					CapMatch produced the schedule instantly: $1.82 million
					annual debt service against $2.27 million NOI, yielding a
					1.25x DSCR.
				</p>
				<p className="text-gray-700 leading-relaxed">
					<strong>Anecdote:</strong> During a live call with a
					prospective lender, the credit officer asked whether the
					sponsor had modeled a scenario where the PFC tax exemption
					is revoked after Year 5. The advisor, using the embedded AI
					assistant, queried the system: &quot;What is the impact on
					NOI if real estate taxes normalize to market rate in Year
					6?&quot; CapMatch returned the answer within seconds: based
					on the comparable tax burden for Downtown Dallas multifamily,
					normalized taxes would reduce Year 6 NOI by approximately
					$350,000, compressing the debt yield from 12.6% to 10.7%.
					The lender had their answer before the call ended - no
					follow-up email, no revised model, no delay.
				</p>
			</section>

			{/* 5. Embedded AI Assistance */}
			<section className="mb-12">
				<h2 className="text-2xl font-bold text-gray-900 mb-4">
					5. Embedded AI Assistance & Dynamic Deal Intelligence
				</h2>
				<p className="text-gray-700 leading-relaxed mb-4">
					Every output generated by CapMatch - whether a
					lender-facing pro forma, an investor summary, or an internal
					memo - included an embedded AI assistant capable of
					answering questions directly against the deal data. This
					proved especially valuable given the project&apos;s
					Opportunity Zone structure and affordable housing
					component.
				</p>
				<p className="text-gray-700 leading-relaxed mb-4">
					When the sponsor&apos;s tax counsel asked for a summary of
					the qualified opportunity zone benefits, the AI assistant
					extracted the relevant context: capital gains deferral
					through 2026, potential elimination of gains on appreciation
					held for 10+ years, and the requirement that the property
					remain a qualified opportunity zone business property
					through the hold period. When a lender asked whether the
					80% AMI rent restrictions applied to all studios or only a
					subset, the assistant clarified: 76 of the 84 studios (48 S1
					units and 28 S2 units) were restricted, while the 8 S3
					studios were market-rate.
				</p>
				<p className="text-gray-700 leading-relaxed">
					The embedded intelligence eliminated the need for the
					advisor to serve as a human lookup layer between lenders and
					deal documents. Questions that previously required a return
					to source materials - &quot;What are the escalations in the
					GSV lease?&quot; &quot;How is the management fee
					calculated?&quot; &quot;What&apos;s the basis for the
					$257,000 per-unit cost?&quot; - could now be answered
					instantaneously, with full traceability to the underlying
					data.
				</p>
			</section>

			{/* 6. Outcome */}
			<section className="mb-12">
				<h2 className="text-2xl font-bold text-gray-900 mb-4">
					6. Outcome: Accelerated Execution with Reduced Friction
				</h2>
				<p className="text-gray-700 leading-relaxed mb-4">
					The SoGood Apartments financing benefited from a materially
					improved process compared to traditional construction loan
					origination:
				</p>
				<ul className="list-disc pl-6 space-y-2 text-gray-700 leading-relaxed mb-4">
					<li>
						<strong>Compressed response cycles:</strong> Lender
						questions that previously required 24–48 hours of manual
						work were resolved in real time, keeping the deal in
						active underwriting rather than stalled in
						documentation queues
					</li>
					<li>
						<strong>Reduced reconciliation errors:</strong> Because
						all outputs derived from a single validated data model,
						there was no risk of mismatched assumptions between the
						rent roll, pro forma, and budget
					</li>
					<li>
						<strong>Enhanced lender confidence:</strong> Credit
						officers could interrogate the deal directly rather
						than relying on static summaries, leading to faster
						credit approvals and cleaner term sheets
					</li>
					<li>
						<strong>Sponsor visibility:</strong> The borrower team
						used the same CapMatch environment to track lender
						feedback, compare financing structures, and model equity
						returns under different scenarios
					</li>
				</ul>
				<p className="text-gray-700 leading-relaxed">
					The advisor, rather than spending weeks managing document
					versions and fielding repetitive clarification requests,
					focused on what mattered: structuring the capital stack,
					negotiating terms, and positioning the deal for optimal
					execution.
				</p>
			</section>

			{/* 7. Why This Matters */}
			<section className="mb-12">
				<h2 className="text-2xl font-bold text-gray-900 mb-4">
					7. Why This Matters: Construction Financing Reimagined
				</h2>
				<p className="text-gray-700 leading-relaxed mb-4">
					The SoGood Apartments transaction illustrates a structural
					limitation in how construction financing is typically
					originated. Ground-up mixed-use deals are inherently complex
					- they combine development risk, lease-up risk, and
					operational risk across multiple asset types, each with
					distinct underwriting considerations. Static documents
					flatten this complexity into fixed narratives that cannot
					adapt to lender questions or evolving assumptions.
				</p>
				<p className="text-gray-700 leading-relaxed mb-4">
					CapMatch replaces this rigid workflow with a dynamic
					operating system that treats deal data as a living asset.
					Documents are ingested and reconciled into a unified model.
					Outputs are generated on demand, tailored to each
					lender&apos;s format and assumptions. Questions are
					answered in real time through embedded AI, eliminating the
					back-and-forth that consumes advisor bandwidth and delays
					execution.
				</p>
				<p className="text-gray-700 leading-relaxed mb-4">
					For sponsors, this means faster access to capital and better
					visibility into their own deal economics. For lenders, it
					means higher-confidence underwriting with fewer
					clarification loops. For advisors, it means less time on
					document management and more time on deal strategy.
				</p>
				<p className="text-gray-700 leading-relaxed">
					This is not an incremental efficiency gain. It is a
					fundamental reimagining of how construction debt gets
					placed - and a template for how complex commercial real
					estate transactions should operate.
				</p>
			</section>

			<p className="text-sm text-gray-500 border-t border-gray-200 pt-8">
				Case study prepared by CapMatch. Deal details derived from
				actual transaction documentation. Certain operational details
				inferred to support narrative continuity.
			</p>
		</article>
	);
}
