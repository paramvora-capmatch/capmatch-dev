"use client";

import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";

export function LenderMarquee() {
    const [lenders, setLenders] = React.useState<string[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchLenders = async () => {
            try {
                const response = await fetch("/api/lenders");
                const data = await response.json();
                if (data.files && Array.isArray(data.files)) {
                    setLenders(data.files);
                }
            } catch (error) {
                console.error("Failed to fetch lender logos:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLenders();
    }, []);

    if (loading || lenders.length === 0) return null;

    return (
        <section
            className="pt-6 pb-16 sm:pb-20 md:pb-24 overflow-hidden"
            style={{
                backgroundImage: `
                    repeating-linear-gradient(
                        45deg,
                        transparent,
                        transparent 10px,
                        rgba(209, 213, 219, 0.097) 10px,
                        rgba(209, 213, 219, 0.097) 11px
                    ),
                    repeating-linear-gradient(
                        -45deg,
                        transparent,
                        transparent 10px,
                        rgba(209, 213, 219, 0.097) 10px,
                        rgba(209, 213, 219, 0.097) 11px
                    )
                `,
            }}
        >
            <div className="relative flex overflow-hidden group pt-4 sm:pt-6 md:pt-10"> {/* Top padding for hover "popout" headroom */}
                {/* Gradient Masks - fade to transparent so cross-hatch shows */}
                <div className="absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-white to-transparent pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-white to-transparent pointer-events-none" />

                {/* Marquee Track */}
                <motion.div
                    className="flex items-center gap-12 pr-12"
                    animate={{
                        x: [0, -100 * lenders.length * 2], 
                    }}
                    transition={{
                        repeat: Infinity,
                        duration: Math.max(25, lenders.length * 6),
                        ease: "linear",
                    }}
                >
                    {/* Quadruple the logos for seamless loop and enough content */}
                    {[...lenders, ...lenders, ...lenders, ...lenders].map((logo, index) => (
                        <div 
                            key={index} 
                            className="relative h-24 w-52 sm:h-28 sm:w-60 flex-shrink-0 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-500 transform hover:scale-110 hover:-translate-y-4 hover:z-50 cursor-pointer filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.15)]"
                        >
                            <img
                                src={logo}
                                alt="Lender Logo"
                                className="h-full w-full object-contain mix-blend-multiply"
                            />
                        </div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
