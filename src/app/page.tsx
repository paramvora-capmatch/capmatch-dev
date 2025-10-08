// src/app/page.tsx
'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { SplashScreen } from '../components/ui/SplashScreen';
import { EnhancedHeader } from '../components/ui/EnhancedHeader';
import { Footer } from '../components/ui/Footer';
import FilterSection from '../components/filter-section';
import LenderGraph from '../components/graph/LenderGraph';
import { useLenders } from '../hooks/useLenders';
import { LenderFilters } from '../contexts/LenderContext';


import { LenderProfile } from '@/types/lender';
import { Button } from '@/components/ui/Button';
import { ArrowRight } from 'lucide-react';
import { ProcessSection } from '../components/ui/ProcessSection';
import { CapMatchAnimation } from '../components/ui/CapMatchAnimation';
import { cn } from '@/utils/cn'; // Ensure cn is imported

// ... (initialFilters, HomePage component setup - no changes here) ...
// ... (useEffect hooks, handlers - no changes here) ...

export default function HomePage() {
  const router = useRouter();
  const {
    filteredLenders,
    filters,
    setFilters,
    selectLender,
    loadLenders
  } = useLenders();


  const [scrolled, setScrolled] = useState(false);
  const [splashComplete, setSplashComplete] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const [logoAnimating, setLogoAnimating] = useState(false);
  const [logoStartPosition, setLogoStartPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [textAnimation, setTextAnimation] = useState({ part1Visible: false, part2Visible: false, part3Visible: false });
  const [headerVisible, setHeaderVisible] = useState(false);
  const [headerTextVisible, setHeaderTextVisible] = useState(false);
  const [headerLogoHidden, setHeaderLogoHidden] = useState(true);

  const headerLogoRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const handleScroll = () => { setScrolled(window.scrollY > 10); };
    handleScroll(); window.addEventListener('scroll', handleScroll); return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    try {
      // Check if we're navigating from another page in the app
      const isNavigatingFromApp = sessionStorage.getItem('navigatingFromApp');
      
      if (isNavigatingFromApp) {
        // Clear the flag and skip splash screen
        sessionStorage.removeItem('navigatingFromApp');
        setSplashComplete(true);
        setContentVisible(true);
        setTextAnimation({ part1Visible: true, part2Visible: true, part3Visible: true });
        setHeaderVisible(true);
        setHeaderTextVisible(true);
        setHeaderLogoHidden(false);
        setLogoAnimating(false);
      } else if (sessionStorage.getItem('splashAnimationComplete')) {
        // Normal case - splash already completed
        setSplashComplete(true);
        setContentVisible(true);
        setTextAnimation({ part1Visible: true, part2Visible: true, part3Visible: true });
        setHeaderVisible(true);
        setHeaderTextVisible(true);
        setHeaderLogoHidden(false);
        setLogoAnimating(false);
      }
    } catch (error) {
      console.warn("Could not access sessionStorage. Splash animation may re-run.", error);
    }
  }, []); // Run only once on component mount

  const handleLogoAnimationStart = useCallback((pos: { x: number, y: number, width: number, height: number }) => {
    setLogoStartPosition(pos); 
    setLogoAnimating(true); 
    setHeaderLogoHidden(true);
  }, []);

  useEffect(() => { if (splashComplete) { const t = setTimeout(() => { setContentVisible(true); setTimeout(() => { setTextAnimation(p => ({ ...p, part1Visible: true })); setHeaderTextVisible(true); }, 300); setTimeout(() => setTextAnimation(p => ({ ...p, part2Visible: true })), 800); setTimeout(() => setTextAnimation(p => ({ ...p, part3Visible: true })), 1300); }, 100); return () => clearTimeout(t); } }, [splashComplete]);

  useEffect(() => { const load = async () => { try { await loadLenders(); } catch (e) { console.error("Err load lenders:", e); } }; load(); }, [loadLenders]);



  const handleFilterChange = (newFilters: Partial<LenderFilters>) => {
    setFilters(newFilters);
  };

  const allFilterCategoriesSelected =
    filters.asset_types.length > 0 &&
    filters.deal_types.length > 0 &&
    filters.capital_types.length > 0 &&
    filters.debt_ranges.length > 0 &&
    filters.locations.length > 0;

  const filtersAreAppliedByUser =
    filters.asset_types.length > 0 ||
    filters.deal_types.length > 0 ||
    filters.capital_types.length > 0 ||
    filters.debt_ranges.length > 0 ||
    filters.locations.length > 0;

  const topLenders = filteredLenders.filter(lender => (lender.match_score ?? 0) > 0.7);

  const handleContactLendersClick = () => {
    try {
      localStorage.setItem('lastFormData', JSON.stringify(filters));
      router.push('/login?from=lenderline');
    } catch (error) {
      console.error("Error saving filters or navigating:", error);
    }
  };

  const handleLogoAnimationComplete = useCallback(() => {
    setLogoAnimating(false);
    setHeaderLogoHidden(false);
    try {
      sessionStorage.setItem('splashAnimationComplete', 'true');
    } catch (error) {
      console.warn("Could not write to sessionStorage:", error);
    }
    // Small delay to ensure smooth transition
    setTimeout(() => setHeaderVisible(true), 100);
  }, []);

  const handleSplashComplete = useCallback(() => {
    setSplashComplete(true);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {!splashComplete && ( <SplashScreen onComplete={handleSplashComplete} onLogoAnimationStart={handleLogoAnimationStart} /> )}

      {/* Always render header so target ref exists for animation; keep logo hidden until handoff */}
      <EnhancedHeader 
        scrolled={scrolled} 
        logoRef={headerLogoRef} 
        visible={headerVisible}
        textVisible={headerTextVisible}
        logoHidden={headerLogoHidden}
      />

      {/* Moving logo overlay - rendered above splash/header as needed */}
      {logoAnimating && headerLogoRef.current && ( 
        <AnimatePresence> 
          <motion.img 
            src="/CapMatchLogo.png" 
            alt="CapMatch" 
            className="fixed z-50 object-contain" 
            initial={{ 
              x: logoStartPosition.x, 
              y: logoStartPosition.y, 
              width: logoStartPosition.width, 
              height: logoStartPosition.height, 
              opacity: 1 
            }} 
            animate={{ 
              x: headerLogoRef.current.getBoundingClientRect().x, 
              y: headerLogoRef.current.getBoundingClientRect().y, 
              width: headerLogoRef.current.getBoundingClientRect().width, 
              height: headerLogoRef.current.getBoundingClientRect().height, 
              opacity: 0 
            }} 
            transition={{ duration: 0.8, ease: "easeInOut" }} 
            onUpdate={(latest) => {
              if (!headerLogoRef.current) return;
              const target = headerLogoRef.current.getBoundingClientRect();
              const dx = (latest.x as number) - target.x;
              const dy = (latest.y as number) - target.y;
              const distance = Math.hypot(dx, dy);
              if (distance < 24) {
                setHeaderLogoHidden(false);
              }
            }}
            onAnimationComplete={handleLogoAnimationComplete} 
            style={{ pointerEvents: 'none' }} 
          /> 
        </AnimatePresence> 
      )}

              {splashComplete && (
                <>
                  <main className="flex-grow">
            <section className="py-32 bg-gradient-to-b from-white to-gray-50 relative overflow-hidden" style={{minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              {/* Blueprint Grid Background */}
              <div className="absolute inset-0 opacity-40">
                <svg width="100%" height="100%" className="absolute inset-0">
                  <defs>
                    <pattern
                      id="hero-blueprint-grid"
                      width="20"
                      height="20"
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d="M 20 0 L 0 0 0 20"
                        fill="none"
                        stroke="#60a5fa"
                        strokeWidth="0.8"
                        opacity="0.8"
                      />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#hero-blueprint-grid)" />
                </svg>
              </div>
              
              {/* Hero content - no changes */}
              <div className="container mx-auto px-4 max-w-5xl text-center relative z-20">
                <motion.div className="mb-8">
                    <div className="overflow-hidden"><motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: textAnimation.part1Visible ? 1 : 0, y: textAnimation.part1Visible ? 0 : 20 }} transition={{ duration: 0.6 }} className="text-5xl md:text-6xl font-bold leading-tight text-black"><span className="md:whitespace-nowrap"><span className="text-blue-600">AI</span>-Powered. <span className="text-blue-600">Borrower-Controlled</span></span>.</motion.div></div>
                    <div className="overflow-hidden mt-2"><motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: textAnimation.part2Visible ? 1 : 0, y: textAnimation.part2Visible ? 0 : 20 }} transition={{ duration: 0.6 }} className="text-5xl md:text-6xl font-bold leading-tight"><span className="text-blue-800 font-display">Commercial Lending,</span></motion.div></div>
                    <div className="overflow-hidden"><motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: textAnimation.part3Visible ? 1 : 0, y: textAnimation.part3Visible ? 0 : 20 }} transition={{ duration: 0.6 }} className="text-5xl md:text-6xl font-bold leading-tight italic"><span className="text-blue-800 font-display">Simplified.</span></motion.div></div>
                </motion.div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: textAnimation.part3Visible ? 1 : 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
                  <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 justify-center">
                    <Button variant="primary" size="lg" className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8 shadow-lg" onClick={() => { document.getElementById('lenderline-section')?.scrollIntoView({ behavior: 'smooth' }); }}>Use LenderLine™</Button>
                    <Button variant="outline" size="lg" onClick={() => router.push('/login')} className="rounded-full shadow-md">Access Deal Room™</Button>
                  </div>
                  
                  {/* Animation below buttons */}
                  <CapMatchAnimation />
                </motion.div>
              </div>
            </section>

            <section id="lenderline-section" className="py-16 bg-white">
              <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <div className="flex items-center justify-center mb-4">
                        <h2 className="text-4xl font-bold text-gray-900">
                            <span className="text-blue-700 font-semibold text-5xl">CapMatch LenderLine</span>
                            <sup className="text-xs">™</sup>
                        </h2>
                    </div>
                    <p className="text-lg text-gray-600 max-w-3xl mx-auto">Select your project criteria below to visualize matching lenders in real-time.</p>
                </div>
                
                {/* Applied cn for conditional height on filter panel */}
                <div className="flex flex-col lg:flex-row">
                  <motion.div
                    className={cn(
                        "w-full lg:w-1/2 lg:pr-8 mb-8 lg:mb-0 flex flex-col",
                        "lg:h-[75vh] lg:min-h-[600px]" // Apply same height constraints as graph panel on large screens
                    )}
                    initial={{ opacity: 0, x: -50 }}
                    animate={contentVisible ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  >
                    <div className="flex-grow flex flex-col justify-between">
                        <FilterSection formData={filters} onChange={handleFilterChange} filterType="asset_types" />
                        <FilterSection formData={filters} onChange={handleFilterChange} filterType="deal_types" />
                        <FilterSection formData={filters} onChange={handleFilterChange} filterType="capital_types" />
                        <FilterSection formData={filters} onChange={handleFilterChange} filterType="locations" />
                        <FilterSection formData={filters} onChange={handleFilterChange} filterType="debt_ranges" />
                    </div>
                    <div className="mt-auto pt-6 text-center px-4">
                        {allFilterCategoriesSelected && topLenders.length > 0 && (
                          <>
                            <Button variant="primary" rightIcon={<ArrowRight size={16} />} onClick={handleContactLendersClick} className="shadow-xl bg-red-600 hover:bg-red-700 text-white rounded-full px-8 py-3 text-lg font-medium transition-transform hover:scale-105">Contact Your Top {topLenders.length} Lender{topLenders.length > 1 ? 's' : ''}</Button>
                            <p className="text-xs text-gray-500 mt-2">Sign in to connect and share your project.</p>
                          </>
                        )}
                        {allFilterCategoriesSelected && topLenders.length === 0 && ( <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg"><p className="text-amber-700 font-medium">No exact matches found.</p><p className="text-sm text-amber-600">Try broadening your filters.</p></div> )}
                        {!allFilterCategoriesSelected && ( <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg"><p className="text-blue-700 font-medium">Select filters in all categories above</p><p className="text-sm text-blue-600">to see matches and connect.</p></div> )}
                    </div>
                  </motion.div>
                  
                  <motion.div
                    className="w-full lg:w-1/2 h-[75vh] min-h-[600px] relative"
                    initial={{ opacity: 0, x: 50 }}
                    animate={contentVisible ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  >
                    <LenderGraph
                      lenders={filteredLenders}
                      formData={filters}
                      filtersApplied={filtersAreAppliedByUser}
                      onLenderClick={(lender: LenderProfile | null) => {
                        selectLender(lender);
                      }}
                      allFiltersSelected={allFilterCategoriesSelected}
                    />
                  </motion.div>
                </div>
              </div>
            </section>

            <ProcessSection />
          </main>

          <Footer />
        </>
      )}
    </div>
  );
}