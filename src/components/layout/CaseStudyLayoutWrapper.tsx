"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { EnhancedHeader } from "@/components/ui/EnhancedHeader";
import { Footer } from "@/components/ui/Footer";
import { ChevronLeft } from "lucide-react";

export default function CaseStudyLayoutWrapper({
    children,
}: {
    children: React.ReactNode;
}) {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        let ticking = false;
        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    setScrolled(window.scrollY > 10);
                    ticking = false;
                });
                ticking = true;
            }
        };
        handleScroll();
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <div className="min-h-screen flex flex-col bg-white">
            <EnhancedHeader scrolled={scrolled} textVisible={false} />
            <main className="flex-1 pt-24 pb-16">
                <div className="container mx-auto px-4 max-w-4xl mb-8">
                    <Link
                        href="/#case-studies"
                        className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-blue-600"
                    >
                        <ChevronLeft size={18} />
                        Back to case studies
                    </Link>
                </div>
                {children}
            </main>
            <Footer />
        </div>
    );
}
