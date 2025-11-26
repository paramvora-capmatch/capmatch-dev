// src/app/page.tsx
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { EnhancedHeader } from "../components/ui/EnhancedHeader";
import { Footer } from "../components/ui/Footer";
import FilterSection from "../components/filter-section";
import LenderGraph from "../components/graph/LenderGraph";
import { useLenders } from "../hooks/useLenders";
import { LenderFilters } from "../contexts/LenderContext";

import { LenderProfile } from "@/types/lender";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";
import { ProcessSection } from "../components/ui/ProcessSection";
import { cn } from "@/utils/cn";
import { useTheme } from "@/contexts/ThemeContext";
import {
  DotWaterfall,
  DotWaterfallStep,
} from "@/components/ui/DotWaterfall";

// ... (initialFilters, HomePage component setup - no changes here) ...
// ... (useEffect hooks, handlers - no changes here) ...

const HERO_WATERFALL_STEPS: DotWaterfallStep[] = [
  { label: "Senior Debt", width: 40, height: 90, startX: 0, color: "#2563eb" },
  { label: "Mezzanine", width: 40, height: 45, startX: 40, color: "#2563eb" },
  { label: "Equity", width: 20, height: 15, startX: 80, color: "#2563eb" },
];

export default function HomePage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { filteredLenders, filters, setFilters, selectLender, loadLenders } =
    useLenders();

  const scrolled = true;
  const isDark = theme === 'dark';
  const [textAnimation, setTextAnimation] = useState({
    part1Visible: false,
    part2Visible: false,
    part3Visible: false,
  });

  // Animate text when component mounts
  useEffect(() => {
    const timeout1 = setTimeout(
      () => setTextAnimation((p) => ({ ...p, part1Visible: true })),
      300
    );
    const timeout2 = setTimeout(
      () => setTextAnimation((p) => ({ ...p, part2Visible: true })),
      800
    );
    const timeout3 = setTimeout(
      () => setTextAnimation((p) => ({ ...p, part3Visible: true })),
      1300
    );
    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
    };
  }, []);

  // Load lenders only once on mount
  useEffect(() => {
    const load = async () => {
      try {
        await loadLenders();
      } catch (e) {
        console.error("Err load lenders:", e);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Memoized event handlers
  const handleFilterChange = useCallback((newFilters: Partial<LenderFilters>) => {
    setFilters(newFilters);
  }, [setFilters]);

  const handleContactLendersClick = useCallback(() => {
    try {
      localStorage.setItem("lastFormData", JSON.stringify(filters));
      router.push("/login?from=lenderline");
    } catch (error) {
      console.error("Error saving filters or navigating:", error);
    }
  }, [filters, router]);

  const handleLenderClick = useCallback((lender: LenderProfile | null) => {
    selectLender(lender);
  }, [selectLender]);

  const handleScrollToLenderMatching = useCallback(() => {
    document
      .getElementById("lender-matching-section")
      ?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleAccessDealRoom = useCallback(() => {
    router.push("/login");
  }, [router]);

  // Memoized computed values
  const allFilterCategoriesSelected = useMemo(() =>
    filters.asset_types.length > 0 &&
    filters.deal_types.length > 0 &&
    filters.capital_types.length > 0 &&
    filters.debt_ranges.length > 0 &&
    filters.locations.length > 0,
    [filters]
  );

  const filtersAreAppliedByUser = useMemo(() =>
    filters.asset_types.length > 0 ||
    filters.deal_types.length > 0 ||
    filters.capital_types.length > 0 ||
    filters.debt_ranges.length > 0 ||
    filters.locations.length > 0,
    [filters]
  );

  const topLenders = useMemo(() =>
    filteredLenders.filter(lender => (lender.match_score ?? 0) > 0.7),
    [filteredLenders]
  );

  // Memoized className strings
  const containerClasses = useMemo(() => cn(
    "min-h-screen flex flex-col transition-colors duration-300",
    isDark ? "bg-gray-900" : "bg-white"
  ), [isDark]);

  const mainClasses = useMemo(() => cn(
    "flex-grow transition-colors duration-300 pattern-background",
    isDark ? "bg-gray-900 pattern-background-dark" : "bg-white pattern-background-light"
  ), [isDark]);

  const heroSectionClasses = useMemo(() => cn(
    "relative overflow-hidden transition-colors duration-300 hero-font pattern-background",
    isDark ? "bg-gray-900 pattern-background-dark" : "bg-white pattern-background-light"
  ), [isDark]);

  const lenderMatchingSectionClasses = useMemo(() => cn(
    "min-h-screen py-16 relative flex items-center transition-colors duration-300 pattern-background",
    isDark ? "bg-gray-900 pattern-background-dark" : "bg-white pattern-background-light"
  ), [isDark]);

  return (
    <div className={containerClasses}>
      {/* Always render header so target ref exists for animation; keep logo hidden until handoff */}
      <EnhancedHeader scrolled={scrolled} textVisible={true} />

      <main className={mainClasses}>
        <section className={heroSectionClasses}>
          <motion.div
            className="container mx-auto max-w-6xl px-6 lg:px-8 py-20 lg:py-32"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)] items-center">
              <motion.div
                className="text-left space-y-8"
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <div className="space-y-4">
                  <div className="overflow-hidden">
                    <motion.h1
                      initial={{ opacity: 0, y: 20 }}
                      animate={{
                        opacity: textAnimation.part1Visible ? 1 : 0,
                        y: textAnimation.part1Visible ? 0 : 20,
                      }}
                      transition={{ duration: 0.6 }}
                      className={cn(
                        "text-5xl sm:text-6xl lg:text-7xl font-normal leading-tight",
                        isDark ? "text-white" : "text-gray-900"
                      )}
                    >
                      CRE Funding
                    </motion.h1>
                  </div>
                  <div className="overflow-hidden">
                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{
                        opacity: textAnimation.part2Visible ? 1 : 0,
                        y: textAnimation.part2Visible ? 0 : 20,
                      }}
                      transition={{ duration: 0.6, delay: 0.1 }}
                      className={cn(
                        "text-4xl sm:text-5xl lg:text-6xl font-normal leading-tight",
                        isDark ? "text-white" : "text-gray-900"
                      )}
                    >
                      From <span className="text-blue-500">Months</span> to{" "}
                      <span className="text-green-500">Minutes</span>
                    </motion.p>
                  </div>
                  <div className="overflow-hidden">
                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{
                        opacity: textAnimation.part3Visible ? 1 : 0,
                        y: textAnimation.part3Visible ? 0 : 20,
                      }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                      className={cn(
                        "text-lg md:text-xl max-w-2xl",
                        isDark ? "text-gray-300" : "text-gray-600"
                      )}
                    >
                      CapMatch&apos;s intelligent platform automates and
                      accelerates every step of your commercial real estate
                      financing.
                    </motion.p>
                  </div>
                </div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: textAnimation.part3Visible ? 1 : 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <Button
                      variant="primary"
                      size="lg"
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8 shadow-lg"
                      onClick={handleScrollToLenderMatching}
                    >
                      Lender Matching
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handleAccessDealRoom}
                      className={cn(
                        "rounded-full shadow-md",
                        isDark
                          ? "border-blue-500 !text-blue-600 hover:bg-gray-800 hover:border-blue-400"
                          : "border-blue-300 !text-blue-600 hover:bg-blue-50 hover:border-blue-400"
                      )}
                    >
                      Access Deal Room
                    </Button>
                  </div>
                </motion.div>
              </motion.div>

              <motion.div
                className="relative w-full h-[360px] sm:h-[420px] lg:h-[520px]"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <DotWaterfall
                  steps={HERO_WATERFALL_STEPS}
                  className={cn(
                    "shadow-2xl",
                    isDark
                      ? "bg-slate-900/80 border-slate-800"
                      : "bg-white border-blue-100"
                  )}
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between px-6 pb-5 text-[11px] font-medium uppercase tracking-[0.2em] text-white/80">
                  <span>Senior Debt</span>
                  <span>Mezzanine</span>
                  <span>Equity</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </section>

        <section 
          id="lender-matching-section" 
          className={lenderMatchingSectionClasses}
        >
          <div className="container mx-auto px-4 w-full">
            <motion.div 
              className="text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center justify-center mb-4">
                <h2 className={cn("text-4xl md:text-5xl font-bold", isDark ? "text-white" : "text-gray-900")}>
                  Lender Matching
                </h2>
              </div>
              <p className={cn("text-lg max-w-3xl mx-auto", isDark ? "text-gray-400" : "text-gray-600")}>
                Select your project criteria below to visualize matching lenders
                in real-time.
              </p>
            </motion.div>

            {/* Two-column layout with filter card and graph */}
            <div className="flex flex-col lg:flex-row gap-8">
              <motion.div
                className={cn(
                  "w-full lg:w-1/2 flex flex-col",
                  "lg:h-[75vh] lg:min-h-[600px]"
                )}
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                {/* Filter card container */}
                <div className={cn(
                  "border rounded-xl p-6 flex-grow flex flex-col transition-colors duration-300",
                  isDark ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200"
                )}>
                  <div className="flex-grow flex flex-col justify-between space-y-4">
                    <FilterSection
                      formData={filters}
                      onChange={handleFilterChange}
                      filterType="asset_types"
                    />
                    <FilterSection
                      formData={filters}
                      onChange={handleFilterChange}
                      filterType="deal_types"
                    />
                    <FilterSection
                      formData={filters}
                      onChange={handleFilterChange}
                      filterType="capital_types"
                    />
                    <FilterSection
                      formData={filters}
                      onChange={handleFilterChange}
                      filterType="locations"
                    />
                    <FilterSection
                      formData={filters}
                      onChange={handleFilterChange}
                      filterType="debt_ranges"
                    />
                  </div>
                  <div className={cn("mt-6 pt-6 border-t text-center transition-colors duration-300", isDark ? "border-gray-700" : "border-gray-200")}>
                    {allFilterCategoriesSelected && topLenders.length > 0 && (
                      <>
                        <Button
                          variant="primary"
                          rightIcon={<ArrowRight size={16} />}
                          onClick={handleContactLendersClick}
                          className="shadow-xl bg-green-500 hover:bg-green-600 text-white rounded-full px-8 py-3 text-lg font-medium transition-transform hover:scale-105"
                        >
                          Contact Your Top {topLenders.length} Lender
                          {topLenders.length > 1 ? "s" : ""}
                        </Button>
                        <p className={cn("text-xs mt-2", isDark ? "text-gray-500" : "text-gray-500")}>
                          Sign in to connect and share your project.
                        </p>
                      </>
                    )}
                    {allFilterCategoriesSelected && topLenders.length === 0 && (
                      <div className={cn(
                        "p-4 border rounded-lg",
                        isDark ? "bg-amber-900/30 border-amber-700" : "bg-amber-50 border-amber-200"
                      )}>
                        <p className={cn("font-medium", isDark ? "text-amber-400" : "text-amber-700")}>
                          No exact matches found.
                        </p>
                        <p className={cn("text-sm", isDark ? "text-amber-500" : "text-amber-600")}>
                          Try broadening your filters.
                        </p>
                      </div>
                    )}
                    {!allFilterCategoriesSelected && (
                      <div className={cn(
                        "p-4 border rounded-lg",
                        isDark ? "bg-blue-900/30 border-blue-700" : "bg-blue-50 border-blue-200"
                      )}>
                        <p className={cn("font-medium", isDark ? "text-blue-300" : "text-blue-700")}>
                          Select filters in all categories above
                        </p>
                        <p className={cn("text-sm", isDark ? "text-blue-400" : "text-blue-600")}>
                          to see matches and connect.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>

              <motion.div
                className={cn(
                  "w-full lg:w-1/2 h-[75vh] min-h-[600px] relative border rounded-xl overflow-hidden transition-colors duration-300",
                  isDark ? "bg-gray-800/30 border-gray-700" : "bg-gray-100 border-gray-200"
                )}
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                <LenderGraph
                  lenders={filteredLenders}
                  formData={filters}
                  filtersApplied={filtersAreAppliedByUser}
                  onLenderClick={handleLenderClick}
                  allFiltersSelected={allFilterCategoriesSelected}
                />
              </motion.div>
            </div>
          </div>
        </section>

        <ProcessSection />
      </main>

      <Footer />
    </div>
  );
}
