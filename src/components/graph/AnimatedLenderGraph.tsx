"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LenderGraph from "./LenderGraph";
import { useLenderStore, LenderFilters } from "@/stores/useLenderStore";
import { MapPin, Building2, Briefcase } from "lucide-react";

const ASSET_TYPES = [
    "Multifamily",
    "Office",
    "Retail",
    "Industrial",
    "Hospitality",
    "Land",
];
const DEAL_TYPES = ["Acquisition", "Refinance", "Construction", "Bridge"];
const LOCATIONS = [
    "nationwide",
    "Northeast",
    "Southeast",
    "Midwest",
    "Southwest",
    "West Coast",
];

const PHASE_INTERVAL_MS = 2000;
/** Phase 0: no extra hold so Northeast→reset→Multifamily is one interval (same as Multifamily→Refinance, etc.) */
const RESET_HOLD_MS = 0;

const PHASE_LABELS: Record<0 | 1 | 2 | 3, string> = {
	0: "Reset (empty)",
	1: "Multifamily",
	2: "Refinance",
	3: "Northeast",
};

type ChipLayout = "vertical" | "horizontal";

export function AnimatedLenderGraph({
	chipLayout = "vertical",
}: {
	chipLayout?: ChipLayout;
}) {
    const { lenders, filteredLenders, loadLenders, setFilters: setStoreFilters } = useLenderStore();
    const [filters, setFilters] = useState<Partial<LenderFilters>>({
        asset_types: [],
        deal_types: [],
        locations: [],
        capital_types: [],
        debt_ranges: [],
    });
    const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0);
    const [isPaused, setIsPaused] = useState(false);
    const lastTransitionAt = useRef<number>(0);

    // Sync animation filters to store so match_score is computed for current formData
    useEffect(() => {
        setStoreFilters({
            asset_types: filters.asset_types ?? [],
            deal_types: filters.deal_types ?? [],
            locations: filters.locations ?? [],
            capital_types: filters.capital_types ?? [],
            debt_ranges: filters.debt_ranges ?? [],
        });
    }, [filters, setStoreFilters]);

    // Load lenders if not already loaded
    useEffect(() => {
        if (lenders.length === 0) {
            loadLenders();
        }
    }, [lenders.length, loadLenders]);

    useEffect(() => {
        if (isPaused) return;

        let timer: NodeJS.Timeout;

        const runAnimation = () => {
            const now = Date.now();
            const gapMs = lastTransitionAt.current ? now - lastTransitionAt.current : 0;
            console.log(`[AnimatedLenderGraph] → ${PHASE_LABELS[phase]}, gap since last: ${gapMs}ms`);
            lastTransitionAt.current = now;

            if (phase === 0) {
                // Reset
                setFilters({
                    asset_types: [],
                    deal_types: [],
                    locations: [],
                    capital_types: [],
                    debt_ranges: [],
                });
                timer = setTimeout(() => setPhase(1), RESET_HOLD_MS); // 0 so Northeast→Reset→Multifamily = one interval
            } else if (phase === 1) {
                // Select Asset Type
                setFilters((prev) => ({ ...prev, asset_types: ["Multifamily"] }));
                timer = setTimeout(() => setPhase(2), PHASE_INTERVAL_MS);
            } else if (phase === 2) {
                // Select Deal Type
                setFilters((prev) => ({ ...prev, deal_types: ["Refinance"] }));
                timer = setTimeout(() => setPhase(3), PHASE_INTERVAL_MS);
            } else if (phase === 3) {
                // Select Location, then reset after one interval (same duration as other steps)
                setFilters((prev) => ({ ...prev, locations: ["Northeast"] }));
                timer = setTimeout(() => setPhase(0), PHASE_INTERVAL_MS);
            }
        };

        runAnimation();

        return () => clearTimeout(timer);
    }, [phase, isPaused]);

    const filtersApplied = useMemo(() => {
        return (
            (filters.asset_types?.length ?? 0) > 0 ||
            (filters.deal_types?.length ?? 0) > 0 ||
            (filters.locations?.length ?? 0) > 0
        );
    }, [filters]);

    const allFiltersSelected = phase === 3;

    const graphHeight = chipLayout === "horizontal" ? "min-h-[50vh] h-[50vh] md:min-h-[55vh] md:h-[55vh]" : "min-h-[380px] h-[380px]";

    return (
        <div className="w-full h-full flex flex-col overflow-hidden p-0 min-h-0">
            <div className={`flex-grow relative w-full ${graphHeight}`}>
                <LenderGraph
                    lenders={filteredLenders.length > 0 ? filteredLenders : lenders}
                    formData={filters}
                    filtersApplied={filtersApplied}
                    allFiltersSelected={phase >= 3}
                    showDetailCard={false}
                />

                {/* Phase indicator / selection display overlay (vertical layout only) */}
                {chipLayout === "vertical" && (
                    <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
                        <AnimatePresence>
                            {filters.asset_types?.[0] && (
                                <motion.div
                                    key="asset"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                                    className="bg-white/90 backdrop-blur-sm border border-blue-200 px-3 py-1.5 rounded-full shadow-sm flex items-center gap-2 text-sm font-medium text-blue-700"
                                >
                                    <Building2 size={14} />
                                    {filters.asset_types[0]}
                                </motion.div>
                            )}
                            {filters.deal_types?.[0] && (
                                <motion.div
                                    key="deal"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                                    className="bg-white/90 backdrop-blur-sm border border-blue-200 px-3 py-1.5 rounded-full shadow-sm flex items-center gap-2 text-sm font-medium text-blue-700"
                                >
                                    <Briefcase size={14} />
                                    {filters.deal_types[0]}
                                </motion.div>
                            )}
                            {filters.locations?.[0] && (
                                <motion.div
                                    key="location"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                                    className="bg-white/90 backdrop-blur-sm border border-blue-200 px-3 py-1.5 rounded-full shadow-sm flex items-center gap-2 text-sm font-medium text-blue-700"
                                >
                                    <MapPin size={14} />
                                    {filters.locations[0]}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

            </div>

            {/* Horizontal chips below graph (when chipLayout === 'horizontal') — fixed order: Asset | Deal | Location */}
            {chipLayout === "horizontal" && (
                <div className="mt-4 flex items-center justify-center gap-3">
                    <div className="flex items-center justify-center min-w-[120px] h-9">
                        <AnimatePresence mode="wait">
                            {filters.asset_types?.[0] ? (
                                <motion.div
                                    key="asset"
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                                    className="bg-white/90 backdrop-blur-sm border border-blue-200 px-3 py-1.5 rounded-full shadow-sm flex items-center gap-2 text-sm font-medium text-blue-700"
                                >
                                    <Building2 size={14} />
                                    {filters.asset_types[0]}
                                </motion.div>
                            ) : null}
                        </AnimatePresence>
                    </div>
                    <div className="flex items-center justify-center min-w-[120px] h-9">
                        <AnimatePresence mode="wait">
                            {filters.deal_types?.[0] ? (
                                <motion.div
                                    key="deal"
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                                    className="bg-white/90 backdrop-blur-sm border border-blue-200 px-3 py-1.5 rounded-full shadow-sm flex items-center gap-2 text-sm font-medium text-blue-700"
                                >
                                    <Briefcase size={14} />
                                    {filters.deal_types[0]}
                                </motion.div>
                            ) : null}
                        </AnimatePresence>
                    </div>
                    <div className="flex items-center justify-center min-w-[120px] h-9">
                        <AnimatePresence mode="wait">
                            {filters.locations?.[0] ? (
                                <motion.div
                                    key="location"
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                                    className="bg-white/90 backdrop-blur-sm border border-blue-200 px-3 py-1.5 rounded-full shadow-sm flex items-center gap-2 text-sm font-medium text-blue-700"
                                >
                                    <MapPin size={14} />
                                    {filters.locations[0]}
                                </motion.div>
                            ) : null}
                        </AnimatePresence>
                    </div>
                </div>
            )}

            {chipLayout === "vertical" && (
            <div className="mt-4 pb-8 flex flex-col items-center justify-center gap-4">
                <div className="flex gap-4 items-center h-12">
                    <div className={`flex flex-col items-center transition-opacity duration-300 ${phase >= 1 ? 'opacity-100' : 'opacity-30'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${phase === 1 ? 'bg-blue-500 text-white animate-pulse' : phase > 1 ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
                            1
                        </div>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Asset</span>
                    </div>
                    <div className="w-8 h-[2px] bg-slate-200 mt-[-10px]" />
                    <div className={`flex flex-col items-center transition-opacity duration-300 ${phase >= 2 ? 'opacity-100' : 'opacity-30'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${phase === 2 ? 'bg-blue-500 text-white animate-pulse' : phase > 2 ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
                            2
                        </div>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Deal</span>
                    </div>
                    <div className="w-8 h-[2px] bg-slate-200 mt-[-10px]" />
                    <div className={`flex flex-col items-center transition-opacity duration-300 ${phase >= 3 ? 'opacity-100' : 'opacity-30'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${phase === 3 ? 'bg-blue-500 text-white animate-pulse' : phase > 3 ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
                            3
                        </div>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Location</span>
                    </div>
                </div>
            </div>
            )}
        </div>
    );
}
