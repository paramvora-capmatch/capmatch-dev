import React from "react";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "The Marshall | Case Study | CapMatch",
	description:
		"CapMatch case study: The Marshall - $30.1M equity recapitalization for purpose-built student housing at Saint Louis University. CapMatch built an investor-ready intelligence layer and accelerated capital formation.",
};

export default function MarshallCaseStudyPage() {
	return (
		<article className="container mx-auto px-4 max-w-4xl">
			{/* Hero */}
			<header className="mb-12">
				<p className="text-sm font-medium text-blue-600 mb-2">
					Case Study · Student Housing
				</p>
				<h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
					CapMatch Case Study: The Marshall
				</h1>
				<p className="text-xl text-gray-600 mb-8">
					Purpose-Built Student Housing Recapitalization at Saint Louis
					University
				</p>
			</header>

			<div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden bg-gray-100 mb-12">
				<Image
					src="/Marshall-CaseStudy/R01-2_DUSK-PERSPECTIVE_MARSHALL-MO_4KTV_01.16.24-scaled.webp"
					alt="The Marshall"
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
						<strong>Asset Type:</strong> 177-unit, 508-bed
						purpose-built student housing community with 368,000 SF
						across five residential floors over a two-level parking
						podium
					</li>
					<li>
						<strong>Capital Sought:</strong> $30.1 million equity
						recapitalization for a 99%-complete development with
						strong pre-leasing momentum
					</li>
					<li>
						<strong>Borrower Profile:</strong> Joint venture
						between ACARA and Aptitude Development, combining
						institutional multifamily investment expertise with
						specialized student housing development experience
					</li>
				</ul>
				<p className="text-gray-700 leading-relaxed">
					<strong>Why This Deal Was Complex:</strong> The Marshall
					recapitalization presented distinct challenges that resist
					conventional documentation approaches. The project operates
					in the specialized student housing sector, where
					underwriting conventions differ materially from traditional
					multifamily - beds rather than units drive revenue, lease
					terms align to academic calendars, and demand is tied to
					enrollment trends rather than employment statistics. The
					investment also carries Opportunity Zone tax benefits that
					require careful structuring to preserve, including capital
					gains deferral through 2026 and potential elimination of
					appreciation taxes after a 10-year hold. With 99%
					construction complete and over 60% pre-leased, the deal sits
					at an inflection point between development and
					stabilization - a transitional moment that static documents
					struggle to capture accurately.
				</p>
			</section>

			{/* 2. The Challenge */}
			<section className="mb-12">
				<h2 className="text-2xl font-bold text-gray-900 mb-4">
					2. The Challenge: Specialized Asset Class, Generic
					Documentation Formats
				</h2>
				<p className="text-gray-700 leading-relaxed mb-4">
					When the sponsor initiated the recapitalization process,
					prospective investors received a comprehensive package
					reflecting the deal&apos;s multidimensional structure:
				</p>
				<ul className="list-disc pl-6 space-y-2 text-gray-700 leading-relaxed mb-4">
					<li>
						Market analysis documenting SLU&apos;s 25% enrollment
						growth since 2020, with back-to-back record classes in
						2023 and 2024
					</li>
					<li>
						Competitive supply analysis showing only 162
						purpose-built student housing beds delivered since 2017
						against a student population exceeding 15,200
					</li>
					<li>
						Rent comparables from three competing properties -
						Verve St Louis, The Standard, and City Lofts at Laclede
						- each showing 96-100% occupancy and rent growth ranging
						from 18% to 37% annually
					</li>
					<li>
						Pro forma projections targeting 17.7% IRR and 4.29x
						equity multiple over a 10-year hold
					</li>
					<li>
						Opportunity Zone structuring details including 8%
						preferred return, annual distributions, and tax-free
						appreciation mechanics
					</li>
					<li>
						Construction progress documentation showing 99%
						completion with Q2 2025 occupancy timeline
					</li>
				</ul>
				<p className="text-gray-700 leading-relaxed mb-4">
					The materials were comprehensive, but they created a
					persistent interpretation problem. Student housing
					investors approached the deal with bed-level economics in
					mind, but certain exhibits showed unit-level metrics. The
					Opportunity Zone benefits were described qualitatively, but
					investors needed to model their specific tax situations to
					understand personal impact. The competitive analysis showed
					historical rent growth, but prospective investors wanted to
					understand how those trends would affect The Marshall&apos;s
					Year 1 and Year 2 revenue.
				</p>
				<p className="text-gray-700 leading-relaxed mb-4">
					Every investor conversation surfaced slightly different
					questions. One family office wanted to understand how the
					8% preferred return compounded during the development
					period before stabilization. A fund focused on OZ investments
					asked whether the capital gains deferral applied to
					short-term or long-term gains, and how the 10-year clock
					interacted with the projected 2035 exit. A student housing
					specialist wanted granular detail on the pre-lease velocity
					- were the 60%+ pre-leases concentrated in certain unit
					types, and what did absorption look like by bedroom count?
				</p>
				<p className="text-gray-700 leading-relaxed">
					Each question required the capital advisor to dig through
					source documents, extract relevant data, and construct a
					custom response. The static nature of the materials meant
					that every inquiry became a manual research project.
				</p>
			</section>

			{/* 3. The CapMatch Intervention */}
			<section className="mb-12">
				<h2 className="text-2xl font-bold text-gray-900 mb-4">
					3. The CapMatch Intervention: Building an Investor-Ready
					Intelligence Layer
				</h2>
				<p className="text-gray-700 leading-relaxed mb-4">
					CapMatch processed the complete document package - market
					analysis, competitive set data, pro forma projections, and
					OZ structuring details - and constructed an integrated
					model that connected the deal&apos;s disparate components
					into a queryable system. The platform&apos;s automated
					analysis surfaced several insights that would otherwise
					have required significant manual effort:
				</p>
				<ul className="list-disc pl-6 space-y-2 text-gray-700 leading-relaxed mb-4">
					<li>
						The 60%+ pre-lease rate was concentrated in 2-bedroom
						and 4-bedroom configurations, with 1-bedroom units
						lagging - a pattern consistent with student preference
						for shared living arrangements that reduce individual
						rent burden
					</li>
					<li>
						The competitive set showed vacancy rates between 0% and
						4%, but two of the three comparables were older vintage
						(2006 and 2015), suggesting The Marshall&apos;s 2025
						delivery could command a premium for modern finishes
						and amenities
					</li>
					<li>
						The pro forma assumed 3% annual rent growth, but the
						competitive set had achieved 18-37% growth in recent
						years - a conservative assumption that provided
						meaningful upside if market conditions persisted
					</li>
					<li>
						The Opportunity Zone structuring required capital
						deployment by December 31, 2024 to preserve the full
						deferral benefit, creating timing urgency that affected
						investor decision-making
					</li>
				</ul>
				<p className="text-gray-700 leading-relaxed mb-4">
					CapMatch organized these findings into a structured data
					environment where each element could be interrogated
					independently or in combination. The pre-lease velocity
					could be viewed by unit type, by lease term, or by signing
					date. The competitive analysis could be filtered by vintage,
					by distance from campus, or by amenity set. The OZ benefits
					could be modeled against different investor tax profiles
					and holding period assumptions.
				</p>
				<p className="text-gray-700 leading-relaxed">
					Rather than delivering a fixed narrative that required
					manual updates, CapMatch created an adaptive system that
					could respond to investor questions in real time.
				</p>
			</section>

			{/* 4. Investor-Specific Outputs */}
			<section className="mb-12">
				<h2 className="text-2xl font-bold text-gray-900 mb-4">
					4. Investor-Specific Outputs Without Redundant Customization
				</h2>
				<p className="text-gray-700 leading-relaxed mb-4">
					With the deal structured inside CapMatch, the capital advisor
					could generate tailored materials for each prospective
					investor without rebuilding the underlying analysis. For a
					family office focused on cash flow timing, CapMatch produced
					a distribution waterfall showing the 8% preferred return
					compounding through the development period, with projected
					annual distributions of 6-12% during the operating years and
					a final exit distribution in 2035. For an OZ-focused fund,
					the platform generated a tax benefit schedule comparing
					scenarios where the investor held short-term versus
					long-term gains, showing the dollar impact of deferral
					through 2026 and elimination of appreciation taxes after
					the 10-year hold. For a student housing specialist,
					CapMatch extracted bed-level economics across all seven unit
					types, showing effective rent per bed, pre-lease status,
					and competitive positioning against the local supply.
				</p>
				<p className="text-gray-700 leading-relaxed">
					<strong>Anecdote:</strong> During a call with a prospective
					investor, the question arose: &quot;What happens to
					occupancy if SLU enrollment flattens after years of
					growth?&quot; The advisor queried the embedded AI assistant
					directly. Within seconds, CapMatch returned a stress analysis:
					even if enrollment held flat at current levels, the
					supply-demand imbalance would persist - SLU&apos;s 15,200
					students were served by only 1,035 purpose-built beds
					including The Marshall, implying a bed-to-student ratio of
					6.8% versus the national average of approximately 10%. The
					structural undersupply provided a buffer against enrollment
					volatility. The investor had their answer before the call
					concluded.
				</p>
			</section>

			{/* 5. Embedded AI Assistance */}
			<section className="mb-12">
				<h2 className="text-2xl font-bold text-gray-900 mb-4">
					5. Embedded AI Assistance & Real-Time Investor Intelligence
				</h2>
				<p className="text-gray-700 leading-relaxed mb-4">
					Every CapMatch deliverable - whether an investor summary, a
					tax modeling schedule, or a competitive analysis - included
					an embedded AI assistant capable of answering questions
					directly against the underlying data. This capability proved
					especially valuable given the specialized nature of student
					housing underwriting.
				</p>
				<p className="text-gray-700 leading-relaxed mb-4">
					When an investor asked about The Marshall&apos;s amenity
					differentiation versus the competitive set, the AI
					assistant itemized the comparison: professional fitness
					center, hot-tub complex, collaborative study spaces,
					individual study pods, entertainment room, café, and
					grilling stations - a modern amenity package that the
					2006-vintage City Lofts and 2015-vintage Standard could not
					match. When a different investor asked about the major
					employers driving non-student demand, the assistant
					surfaced the proximity data: BJC Healthcare with 8,500+
					employees at 0.6 miles, Washington University with 6,200+
					at 0.6 miles, and the Cortex Innovation District with
					5,700+ jobs at 0.5 miles - a secondary demand driver that
					provided occupancy support beyond the student population.
				</p>
				<p className="text-gray-700 leading-relaxed">
					The embedded intelligence transformed investor diligence
					from a sequential question-and-answer process into a
					dynamic conversation. Prospective investors could explore
					the deal at their own pace, drilling into the specific
					elements that mattered to their investment thesis without
					waiting for the advisor to locate and extract information
					from static documents.
				</p>
			</section>

			{/* 6. Outcome */}
			<section className="mb-12">
				<h2 className="text-2xl font-bold text-gray-900 mb-4">
					6. Outcome: Faster Capital Formation with Higher Investor
					Confidence
				</h2>
				<p className="text-gray-700 leading-relaxed mb-4">
					The Marshall recapitalization benefited from a materially
					improved investor engagement process:
				</p>
				<ul className="list-disc pl-6 space-y-2 text-gray-700 leading-relaxed mb-4">
					<li>
						<strong>Accelerated diligence cycles:</strong> Investor
						questions that previously required overnight turnaround
						were resolved during live conversations, maintaining
						momentum through the capital formation process
					</li>
					<li>
						<strong>Reduced interpretation risk:</strong> Because
						all investor materials derived from a single validated
						model, there was no risk of conflicting figures between
						the market analysis, pro forma, and competitive study
					</li>
					<li>
						<strong>Enhanced investor confidence:</strong> Prospective
						investors could interrogate the deal directly rather
						than relying on curated summaries, leading to faster
						commitment decisions and cleaner documentation
					</li>
					<li>
						<strong>Sponsor efficiency:</strong> The development
						team used the same CapMatch environment to track
						investor feedback, model different capital structures,
						and prepare for closing - all without switching between
						disconnected systems
					</li>
				</ul>
				<p className="text-gray-700 leading-relaxed">
					The capital advisor, rather than spending days fielding
					repetitive questions and manually customizing materials,
					focused on relationship management and deal execution - the
					high-value activities that actually drive capital formation.
				</p>
			</section>

			{/* 7. Why This Matters */}
			<section className="mb-12">
				<h2 className="text-2xl font-bold text-gray-900 mb-4">
					7. Why This Matters: Specialized Assets Demand Specialized
					Infrastructure
				</h2>
				<p className="text-gray-700 leading-relaxed mb-4">
					The Marshall transaction illustrates a broader truth about
					capital formation for specialized real estate assets.
					Student housing, senior living, self-storage, data centers -
					each sector carries its own underwriting conventions,
					demand drivers, and risk factors. Generic documentation
					formats designed for conventional multifamily or office
					deals cannot adequately capture these nuances, forcing
					capital advisors into endless cycles of manual
					customization.
				</p>
				<p className="text-gray-700 leading-relaxed mb-4">
					CapMatch addresses this limitation by treating deal data as
					structured intelligence rather than static content.
					Documents are ingested and organized into queryable models.
					Outputs are generated dynamically, tailored to each
					investor&apos;s format requirements and analytical
					preferences. Questions are answered in real time through
					embedded AI, eliminating the friction that slows capital
					formation and introduces error risk.
				</p>
				<p className="text-gray-700 leading-relaxed mb-4">
					For sponsors, this means faster access to capital with less
					distraction from core development responsibilities. For
					investors, it means higher-confidence underwriting with the
					ability to explore deal-specific questions without waiting
					for advisor turnaround. For capital advisors, it means
					spending time on strategy and relationships rather than
					document management.
				</p>
				<p className="text-gray-700 leading-relaxed">
					The Marshall is not an isolated example. It represents a new
					standard for how specialized real estate transactions
					should be capitalized - with intelligence, precision, and
					the adaptive responsiveness that modern investors expect.
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
