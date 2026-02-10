import React from "react";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "300 East LaSalle | Case Study | CapMatch",
	description:
		"CapMatch case study: 300 East LaSalle - 144-unit Class A mixed-use multifamily acquisition in South Bend, IN. $31.5M senior debt; reconciled BPO/Excel data and tax abatement into a single source of truth.",
};

export default function LaSalleCaseStudyPage() {
	return (
		<article className="container mx-auto px-4 max-w-4xl">
			{/* Hero */}
			<header className="mb-12">
				<p className="text-sm font-medium text-blue-600 mb-2">
					Case Study · Mixed-Use Multifamily
				</p>
				<h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
					CapMatch Case Study: 300 East LaSalle
				</h1>
				<p className="text-xl text-gray-600 mb-8">
					A Mixed-Use Multifamily Acquisition in South Bend, Indiana
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

			{/* 1. Deal Snapshot */}
			<section className="mb-12">
				<h2 className="text-2xl font-bold text-gray-900 mb-4">
					1. Deal Snapshot
				</h2>
				<ul className="space-y-2 text-gray-700 leading-relaxed mb-4">
					<li>
						<strong>Asset Type:</strong> 144-unit Class A multifamily
						with 29,007 SF of ground-floor commercial space
					</li>
					<li>
						<strong>Capital Sought:</strong> Acquisition financing -
						$31.5 million senior debt facility
					</li>
					<li>
						<strong>Borrower Profile:</strong> Private equity-backed
						sponsor pursuing Midwest value-oriented multifamily with
						commercial income diversification
					</li>
				</ul>
				<p className="text-gray-700 leading-relaxed">
					<strong>Why This Deal Was Complex:</strong> The 300 East
					LaSalle transaction presented several structural challenges
					that made traditional document-based underwriting especially
					fragmented. The property is a 2022-vintage mixed-use
					development in South Bend&apos;s East Bank neighborhood,
					combining 144 residential units with two long-term
					commercial tenants - East Race Market (NNN, 10-year term) and
					DMTM office space (gross lease, 8-year term). The deal also
					carried a multi-year property tax abatement, which
					materially affected valuation depending on whether lenders
					underwrote to abated NOI or applied a net present value
					adjustment. These layered income streams, lease structures,
					and tax assumptions created multiple &quot;correct&quot;
					answers depending on underwriting methodology - and no
					single static document could accommodate them all.
				</p>
			</section>

			{/* 2. The Challenge */}
			<section className="mb-12">
				<h2 className="text-2xl font-bold text-gray-900 mb-4">
					2. The Challenge: Static Documents, Version Chaos, and
					Lender Friction
				</h2>
				<p className="text-gray-700 leading-relaxed mb-4">
					When the borrower initiated the financing process, their
					advisor received an extensive document package that
					reflected the typical complexity of a stabilized mixed-use
					acquisition:
				</p>
				<ul className="list-disc pl-6 space-y-2 text-gray-700 leading-relaxed mb-4">
					<li>
						A 20+ page broker price opinion from Marcus & Millichap /
						IPA containing historical financials, rent roll
						snapshots, ten-year cash flow projections, and market
						comparables
					</li>
					<li>
						Separate Excel models with trailing-12, trailing-8,
						trailing-3, and trailing-1 income statements - each
						showing slightly different expense treatments
					</li>
					<li>
						Two distinct valuation approaches: one blending
						residential and commercial cap rates (6.24% blended),
						another applying the $4.4 million NPV of the tax
						abatement to a lower gross value
					</li>
					<li>
						Rent comparables across six properties with varying
						effective rent treatments and unit mix assumptions
					</li>
					<li>
						Commercial lease abstracts requiring separate
						underwriting from the residential component
					</li>
				</ul>
				<p className="text-gray-700 leading-relaxed mb-4">
					The advisor&apos;s challenge was not a lack of information -
					it was an excess of overlapping, partially contradictory
					information. The historical expense line excluded certain
					legal and management fees; the pro forma assumed $216,000 in
					on-site payroll not present in actuals. The tax
					abatement&apos;s impact on valuation depended on whether the
					lender preferred to capitalize abated NOI or add NPV to an
					unabated price.
				</p>
				<p className="text-gray-700 leading-relaxed">
					Each lender the advisor approached would ask a version of the
					same question: &quot;Which numbers should we trust?&quot;
					And each time, the advisor had to manually reconcile
					assumptions, re-export data, and rebuild the story. One
					regional bank requested a standalone Excel model with their
					preferred rent growth assumptions. A credit fund wanted the
					commercial income separated into a distinct cash flow
					schedule. A life company asked for a sensitivity table
					showing cap rate compression scenarios. Each request
					required a return to the source PDF, a re-extraction of
					data, and a custom rebuild - all while the underlying deal
					documents remained frozen in time.
				</p>
			</section>

			{/* 3. The CapMatch Intervention */}
			<section className="mb-12">
				<h2 className="text-2xl font-bold text-gray-900 mb-4">
					3. The CapMatch Intervention: From Static PDFs to a Living
					Deal System
				</h2>
				<p className="text-gray-700 leading-relaxed mb-4">
					CapMatch ingested the full document set - including the
					broker price opinion, rent roll, lease abstracts, and Excel
					models - and began automated classification and
					reconciliation. Within hours, the platform had:
				</p>
				<ul className="list-disc pl-6 space-y-2 text-gray-700 leading-relaxed mb-4">
					<li>
						Identified that the trailing-12 financials excluded
						replacement reserves and certain fee categories, while
						the pro forma included them - and flagged the
						discrepancy for advisor review
					</li>
					<li>
						Detected that the &quot;As Stabilized Trailing 1&quot;
						NOI of $2,991,512 assumed 94% occupancy and $1,851/unit
						effective rent, while the actual March 2024 rent roll
						showed 90% occupancy and $1,848/unit - a $135,000+
						variance in projected income
					</li>
					<li>
						Mapped the commercial lease terms (East Race Market at
						$24.00/SF NNN; DMTM at $24.00/SF gross) and separated
						commercial NOI into a distinct underwriting layer
					</li>
					<li>
						Reconciled the two valuation methodologies - blended cap
						rate vs. NPV-adjusted - and preserved both as selectable
						options for lender-facing outputs
					</li>
				</ul>
				<p className="text-gray-700 leading-relaxed">
					Rather than producing a single &quot;corrected&quot; PDF,
					CapMatch created a unified data model from which all
					downstream outputs could be generated. The system became
					the single source of truth - not a synthesis of competing
					documents, but a reconciled dataset with full version
					history and audit trails.
				</p>
			</section>

			{/* 4. Lender-Specific Outputs */}
			<section className="mb-12">
				<h2 className="text-2xl font-bold text-gray-900 mb-4">
					4. Lender-Specific Outputs Without Fragmentation
				</h2>
				<p className="text-gray-700 leading-relaxed mb-4">
					Once the deal was structured within CapMatch, the advisor
					could generate tailored outputs for each lender without
					rebuilding the underlying model. For a regional bank that
					required a Fannie-style rent roll format, CapMatch exported
					a unit-by-unit schedule with market rent, effective rent,
					and concession breakdowns aligned to the lender&apos;s
					template. For a credit fund focused on commercial risk, the
					platform isolated the 29,007 SF retail component into a
					standalone cash flow with lease rollover assumptions and
					tenant credit profiles. For a life company running cap rate
					sensitivity, CapMatch generated an interactive table
					showing valuation outcomes across a 25-basis-point range -
					all linked to the same underlying rent and expense
					assumptions.
				</p>
				<p className="text-gray-700 leading-relaxed">
					<strong>Anecdote:</strong> Midway through the process, one
					lender asked whether the $64,800 insurance expense in the
					pro forma was based on actual quotes or industry benchmarks.
					The advisor, using the embedded AI assistant, queried the
					system directly: &quot;What is the source of the insurance
					expense assumption?&quot; Within seconds, CapMatch surfaced
					the relevant context: the pro forma used $450/unit, which
					represented a 71% increase over the trailing-12 actual of
					$264/unit, suggesting the sponsor was conservatively
					budgeting for post-stabilization rate increases. The advisor
					relayed this to the lender in real time - no email chain, no
					document hunt, no delay.
				</p>
			</section>

			{/* 5. Embedded AI Assistance */}
			<section className="mb-12">
				<h2 className="text-2xl font-bold text-gray-900 mb-4">
					5. Embedded AI Assistance & Real-Time Deal Intelligence
				</h2>
				<p className="text-gray-700 leading-relaxed mb-4">
					Every CapMatch deliverable - whether a lender-facing model,
					an investor dashboard, or an internal memo - included an
					embedded AI assistant capable of answering questions
					directly against the underlying data. This capability proved
					especially valuable given the deal&apos;s structural
					complexity.
				</p>
				<p className="text-gray-700 leading-relaxed mb-4">
					When a lender asked, &quot;What happens to debt service
					coverage if the tax abatement expires in Year 5?&quot;, the
					advisor could query the model and receive an instant answer:
					the DSCR would decline from 1.85x to 1.36x as real estate
					taxes normalized from $0 to over $800,000 annually. The
					lender didn&apos;t need to request a new model or wait for
					a sensitivity run - the answer was already embedded in the
					system.
				</p>
				<p className="text-gray-700 leading-relaxed">
					Similarly, when the borrower&apos;s counsel asked for a
					summary of the commercial lease terms for their acquisition
					diligence, the AI assistant extracted the relevant abstracts:
					East Race Market&apos;s 10-year NNN term with $1.00/SF CAM
					recovery, and DMTM&apos;s 8-year gross lease with no
					escalations. The information was pulled from the same
					reconciled dataset powering the lender outputs - ensuring
					consistency across all parties.
				</p>
			</section>

			{/* 6. Outcome */}
			<section className="mb-12">
				<h2 className="text-2xl font-bold text-gray-900 mb-4">
					6. Outcome: A Structurally Better Loan Product
				</h2>
				<p className="text-gray-700 leading-relaxed mb-4">
					The 300 East LaSalle financing closed with materially
					improved process metrics compared to a traditional
					static-document workflow:
				</p>
				<ul className="list-disc pl-6 space-y-2 text-gray-700 leading-relaxed mb-4">
					<li>
						<strong>Faster lender review cycles:</strong> Lenders
						received pre-formatted, template-aligned outputs on
						first submission, reducing back-and-forth by an
						estimated 40%
					</li>
					<li>
						<strong>Fewer clarification loops:</strong> The embedded
						AI assistant resolved routine data questions in real
						time, eliminating the need for multi-day email chains
					</li>
					<li>
						<strong>Higher confidence submissions:</strong> Because
						all outputs traced to a single reconciled dataset,
						lenders could trust that rent rolls, pro formas, and
						sensitivity analyses were internally consistent
					</li>
					<li>
						<strong>Better borrower understanding:</strong> The
						sponsor&apos;s team used the same CapMatch dashboard to
						track lender feedback, compare term sheet structures,
						and model post-close performance - all without switching
						systems
					</li>
				</ul>
				<p className="text-gray-700 leading-relaxed">
					The advisor, rather than spending days reformatting Excel
					models and reconciling conflicting PDFs, focused on what
					mattered: negotiating terms, managing lender relationships,
					and positioning the deal for optimal execution.
				</p>
			</section>

			{/* 7. Why This Matters */}
			<section className="mb-12">
				<h2 className="text-2xl font-bold text-gray-900 mb-4">
					7. Why This Matters: A Repeatable Operating Advantage
				</h2>
				<p className="text-gray-700 leading-relaxed mb-4">
					The 300 East LaSalle transaction illustrates a broader truth
					about commercial real estate debt placement: the bottleneck
					is rarely information scarcity - it&apos;s information
					fragmentation. Static PDFs age the moment they&apos;re
					created. Rent rolls drift out of sync with pro formas.
					Commercial and residential components get underwritten in
					parallel but never reconciled. Lender-specific requests
					trigger manual rebuilds that introduce error risk and
					consume advisor bandwidth.
				</p>
				<p className="text-gray-700 leading-relaxed mb-4">
					CapMatch replaces this fragmented workflow with a unified
					operating system - one that ingests messy, real-world deal
					data; reconciles it into a single source of truth; and
					generates lender-native outputs without rework. For advisors,
					this means less time on document management and more time on
					deal strategy. For lenders, it means faster, higher-confidence
					underwriting. For borrowers, it means a structurally better
					loan product - and a clearer path to close.
				</p>
				<p className="text-gray-700 leading-relaxed">
					This is not a marginal improvement. It is a fundamentally
					better way to run commercial debt transactions.
				</p>
			</section>

			<p className="text-sm text-gray-500 border-t border-gray-200 pt-8">
				Case study prepared by CapMatch. Deal details derived from actual
				transaction documentation. Certain operational details inferred
				to support narrative continuity.
			</p>
		</article>
	);
}
