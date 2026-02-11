"use client";

import React from "react";
import { motion } from "framer-motion";
import {
    Radar,
    TrendingUp,
    AlertTriangle,
    Zap,
    Database,
    BarChart3,
    FileText,
    Target,
    Route,
    Rocket,
    Building2,
    Landmark,
    Activity,
    Signal,
    RefreshCw,
    Layers,
} from "lucide-react";

/* ─── animation helpers ─── */
const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, delay: i * 0.1, ease: "easeOut" },
    }),
};

const stagger = {
    visible: { transition: { staggerChildren: 0.12 } },
};

/* ─── step data ─── */
const steps = [
    {
        icon: Database,
        title: "Detect the maturity universe",
        body: "Re-Fi Radar continuously ingests data from government, municipal, public, and proprietary industry sources to identify borrowers with approaching maturities.",
    },
    {
        icon: BarChart3,
        title: "Read the macro state",
        body: "It overlays current macro conditions—rate direction, credit tone, and liquidity signals—to understand refinancing viability in context, not in isolation.",
    },
    {
        icon: Target,
        title: "Map lender buy boxes",
        body: "Lender preferences are modeled in detail: asset class, market, size, leverage bands, sponsorship profile, business plan tolerance, and structural constraints.",
    },
    {
        icon: Radar,
        title: "Score match confidence",
        body: "Each potential borrower-lender pair is evaluated for alignment strength, timing relevance, and execution feasibility.",
    },
    {
        icon: Route,
        title: "Generate indicative pathways",
        body: "Before outreach begins, Re-Fi Radar creates mock term-sheet ranges and structured deal narratives so conversations start with substance.",
    },
    {
        icon: Rocket,
        title: "Activate proactive matchmaking",
        body: "CapMatch initiates high-fit opportunities directly, reducing friction and accelerating path-to-close.",
    },
];

/* ─── section wrapper ─── */
function Section({
    children,
    className = "",
    id,
}: {
    children: React.ReactNode;
    className?: string;
    id?: string;
}) {
    return (
        <section
            id={id}
            className={`py-20 md:py-28 bg-transparent ${className}`}
        >
            <div className="container mx-auto max-w-6xl px-4">{children}</div>
        </section>
    );
}

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════ */
export const RefiRadarContent: React.FC = () => {
    return (
        <>
            {/* ───────── 1. HERO ───────── */}
            <section className="relative overflow-hidden pt-32 pb-20 md:pt-36 md:pb-24 bg-white min-h-[85vh] flex items-center">
                {/* Video Background with 85% scaling and readability overlays */}
                <div className="absolute inset-0 z-0 bg-white" aria-hidden>
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        disablePictureInPicture
                        disableRemotePlayback
                        tabIndex={-1}
                        className="absolute w-[85%] h-[85%] left-[7.5%] top-[7.5%] object-contain pointer-events-none"
                    >
                        <source
                            src="/Landing-Page/RefiRadar/HeroSection.mp4"
                            type="video/mp4"
                        />
                    </video>
                    {/* Lightened white fade overlays for better video visibility */}
                    <div
                        className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/60 to-white pointer-events-none"
                        aria-hidden
                    />
                    <div
                        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0.6)_100%)] pointer-events-none"
                        aria-hidden
                    />
                </div>

                <div className="container mx-auto max-w-5xl px-4 relative z-10">
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={stagger}
                        className="text-center"
                    >
                        <motion.span
                            variants={fadeUp}
                            custom={0}
                            className="inline-block text-sm font-semibold tracking-widest uppercase text-blue-600 mb-4"
                        >
                            CapMatch Intelligence Layer
                        </motion.span>

                        <motion.h1
                            variants={fadeUp}
                            custom={1}
                            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight mb-6"
                        >
                            Re-Fi Radar:{" "}
                            <span className="text-blue-600">
                                Refinance Matchmaking
                            </span>{" "}
                            Before Anyone Asks
                        </motion.h1>

                        <motion.p
                            variants={fadeUp}
                            custom={2}
                            className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed"
                        >
                            Re-Fi Radar continuously tracks U.S. loan
                            maturities, macroeconomic shifts, and lender
                            buy-box preferences—then proactively identifies
                            high-probability refinance matches and structures
                            indicative pathways to execution.
                        </motion.p>

                        <motion.div
                            variants={fadeUp}
                            custom={3}
                            className="max-w-2xl mx-auto space-y-3 text-gray-500 text-base md:text-lg"
                        >
                            <p>
                                Traditional refinancing starts late: borrowers
                                scramble, lenders sift, and timing gets lost.
                                Re-Fi Radar flips that model. It detects
                                refinance pressure early, scores lender fit in
                                real time, and turns market signals into
                                transaction-ready opportunities.
                            </p>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* ───────── 2. MARKET TIMING / WHY NOW ───────── */}
            <Section>
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                    variants={stagger}
                >
                    <motion.h2
                        variants={fadeUp}
                        className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-6"
                    >
                        Built for the 2026 Refinance Window
                    </motion.h2>
                    <motion.p
                        variants={fadeUp}
                        className="text-gray-600 max-w-3xl mx-auto text-center text-base md:text-lg leading-relaxed mb-6"
                    >
                        Commercial real estate is entering a decisive
                        refinancing phase. A large volume of loans is
                        approaching maturity while capital remains selective and
                        structure-sensitive. Falling rates have improved
                        feasibility for many assets—but not uniformly.
                    </motion.p>
                    <motion.p
                        variants={fadeUp}
                        className="text-gray-600 max-w-3xl mx-auto text-center text-base md:text-lg leading-relaxed mb-16"
                    >
                        Re-Fi Radar is designed for this exact market condition.
                        It continuously reads timing pressure, underwriting
                        appetite, and macro direction so that refinance
                        opportunities are identified and shaped before they
                        become distressed or stale.
                    </motion.p>

                    {/* 3 highlight blocks */}
                    <motion.div
                        variants={stagger}
                        className="grid md:grid-cols-3 gap-6"
                    >
                        {[
                            {
                                icon: AlertTriangle,
                                title: "Maturity Pressure",
                                body: "A broad wave of loans is approaching term limits across geographies and asset classes.",
                                color: "text-blue-600",
                                bg: "bg-blue-50",
                                border: "border-blue-100",
                            },
                            {
                                icon: TrendingUp,
                                title: "Macro Repricing",
                                body: "Rate and liquidity shifts are creating new refinance paths—but only for deals that fit current credit preferences.",
                                color: "text-blue-600",
                                bg: "bg-blue-50",
                                border: "border-blue-100",
                            },
                            {
                                icon: Zap,
                                title: "Execution Gap",
                                body: "Most market participants still rely on manual outreach and reactive pipelines.",
                                color: "text-blue-600",
                                bg: "bg-blue-50",
                                border: "border-blue-100",
                            },
                        ].map((item) => (
                            <motion.div
                                variants={fadeUp}
                                key={item.title}
                                className={`rounded-2xl border ${item.border} ${item.bg} p-8 text-center transition-all hover:shadow-lg hover:-translate-y-1`}
                            >
                                <div
                                    className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${item.bg} ${item.color} mb-4`}
                                >
                                    <item.icon size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">
                                    {item.title}
                                </h3>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    {item.body}
                                </p>
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.div>
            </Section>

            {/* ───────── 3. HOW RE-FI RADAR WORKS ───────── */}
            <Section>
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.1 }}
                    variants={stagger}
                >
                    <motion.div variants={fadeUp} className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                            Signal → Fit → Structure → Execution
                        </h2>
                        <p className="text-gray-500 text-base md:text-lg">
                            How Re-Fi Radar transforms raw data into
                            transaction-ready opportunities.
                        </p>
                    </motion.div>

                    <div className="relative">
                        {/* vertical line connector (desktop) */}
                        <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-blue-200 via-blue-300 to-blue-200 -translate-x-1/2" />

                        <div className="space-y-8 md:space-y-0">
                            {steps.map((step, i) => {
                                const isLeft = i % 2 === 0;
                                return (
                                    <motion.div
                                        key={step.title}
                                        variants={fadeUp}
                                        custom={i}
                                        className="relative md:flex items-center md:min-h-[140px]"
                                    >
                                        {/* Left content / spacer */}
                                        <div
                                            className={`hidden md:block md:w-1/2 ${isLeft ? "pr-12 text-right" : ""}`}
                                        >
                                            {isLeft && (
                                                <div>
                                                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                                                        {step.title}
                                                    </h3>
                                                    <p className="text-gray-600 text-sm leading-relaxed">
                                                        {step.body}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Center dot */}
                                        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-blue-600 text-white items-center justify-center font-bold text-sm shadow-lg shadow-blue-200 z-10">
                                            {i + 1}
                                        </div>

                                        {/* Right content / spacer */}
                                        <div
                                            className={`hidden md:block md:w-1/2 ${!isLeft ? "pl-12" : ""}`}
                                        >
                                            {!isLeft && (
                                                <div>
                                                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                                                        {step.title}
                                                    </h3>
                                                    <p className="text-gray-600 text-sm leading-relaxed">
                                                        {step.body}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Mobile layout */}
                                        <div className="md:hidden flex gap-4 items-start">
                                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                                                {i + 1}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900 mb-1">
                                                    {step.title}
                                                </h3>
                                                <p className="text-gray-600 text-sm leading-relaxed">
                                                    {step.body}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </motion.div>
            </Section>

            {/* ───────── 4. WHAT THE ENGINE EVALUATES ───────── */}
            <Section>
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                    variants={stagger}
                >
                    <motion.div variants={fadeUp} className="text-center mb-14">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                            Multi-Layer Intelligence,{" "}
                            <span className="text-blue-600">
                                Not Single-Point Filtering
                            </span>
                        </h2>
                    </motion.div>

                    <motion.div
                        variants={stagger}
                        className="grid md:grid-cols-2 gap-8"
                    >
                        {/* Borrower signals */}
                        <motion.div
                            variants={fadeUp}
                            className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <Building2 size={20} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">
                                    Borrower / Deal Signals
                                </h3>
                            </div>
                            <ul className="space-y-3">
                                {[
                                    "Loan maturity timeline and urgency profile",
                                    "Asset type and submarket characteristics",
                                    "Sponsor quality and operating context",
                                    "Capital stack and refinance constraints",
                                    "Execution readiness indicators",
                                ].map((item) => (
                                    <li
                                        key={item}
                                        className="flex items-start gap-3 text-gray-600 text-sm"
                                    >
                                        <Signal
                                            size={16}
                                            className="text-blue-400 mt-0.5 shrink-0"
                                        />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </motion.div>

                        {/* Lender signals */}
                        <motion.div
                            variants={fadeUp}
                            className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <Landmark size={20} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">
                                    Lender / Market Signals
                                </h3>
                            </div>
                            <ul className="space-y-3">
                                {[
                                    "Buy-box parameters and exclusions",
                                    "Ticket size and leverage preferences",
                                    "Sector appetite and regional priorities",
                                    "Structural preferences (recourse, amortization, covenants)",
                                    "Current market responsiveness and capacity windows",
                                ].map((item) => (
                                    <li
                                        key={item}
                                        className="flex items-start gap-3 text-gray-600 text-sm"
                                    >
                                        <Signal
                                            size={16}
                                            className="text-blue-500 mt-0.5 shrink-0"
                                        />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    </motion.div>

                    <motion.p
                        variants={fadeUp}
                        className="text-gray-500 text-center text-sm md:text-base mt-8 italic"
                    >
                        The system is built to reflect how real deals get done:
                        dynamic, constrained, and highly timing-dependent.
                    </motion.p>
                </motion.div>
            </Section>

            {/* ───────── 5. OUTPUTS & DELIVERABLES ───────── */}
            <Section>
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                    variants={stagger}
                >
                    <motion.div variants={fadeUp} className="text-center mb-6">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                            From Raw Signal to{" "}
                            <span className="text-blue-600">
                                Decision-Ready Opportunity
                            </span>
                        </h2>
                    </motion.div>
                    <motion.p
                        variants={fadeUp}
                        className="text-gray-600 max-w-3xl mx-auto text-center text-base md:text-lg leading-relaxed mb-14"
                    >
                        Re-Fi Radar does not stop at &ldquo;match
                        found.&rdquo; It produces execution-grade outputs that
                        help both sides evaluate fit quickly and transparently.
                    </motion.p>

                    <motion.div
                        variants={stagger}
                        className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto"
                    >
                        {[
                            {
                                icon: Layers,
                                text: "Prioritized refinance opportunity queue based on timing and match confidence",
                            },
                            {
                                icon: FileText,
                                text: "Indicative term-sheet ranges tailored to lender preferences and market context",
                            },
                            {
                                icon: Target,
                                text: "Match rationale summaries explaining why a pairing is likely to transact",
                            },
                            {
                                icon: Activity,
                                text: "Execution-readiness profiles highlighting key diligence gaps early",
                            },
                            {
                                icon: RefreshCw,
                                text: "Continuously refreshed status states as macro and lender signals evolve",
                            },
                        ].map((item) => (
                            <motion.div
                                variants={fadeUp}
                                key={item.text}
                                className="bg-white border border-gray-200 rounded-xl p-6 flex items-start gap-4 hover:shadow-md transition-shadow"
                            >
                                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                    <item.icon size={18} />
                                </div>
                                <p className="text-gray-700 text-sm leading-relaxed">
                                    {item.text}
                                </p>
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.div>
            </Section>
        </>
    );
};
