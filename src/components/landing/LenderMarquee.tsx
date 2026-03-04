"use client";

import React from "react";
import { motion } from "framer-motion";

/** Logo filenames under public/lenders/ (no backend; frontend static only). */
const LENDER_LOGO_FILES: string[] = [
	"acara.png",
	"blackstone.png",
	"cbre.png",
	"chase.jpg",
	"deutsche.png",
	"goldman-sachs.png",
	"greystone.png",
	"lucbro.png",
	"northmarq.svg",
	"ozlistings.png",
	"Silverbow.png",
	"wells-fargo.png",
];

export function LenderMarquee() {
    const logoPaths = LENDER_LOGO_FILES.map((f) => `/lenders/${f}`);

    if (logoPaths.length === 0) return null;

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
                        x: [0, -100 * logoPaths.length * 2],
                    }}
                    transition={{
                        repeat: Infinity,
                        duration: Math.max(25, logoPaths.length * 6),
                        ease: "linear",
                    }}
                >
                    {[...logoPaths, ...logoPaths, ...logoPaths, ...logoPaths].map((src, index) => (
                        <div
                            key={`${src}-${index}`}
                            className="relative h-24 w-52 sm:h-28 sm:w-60 flex-shrink-0 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-500 transform hover:scale-110 hover:-translate-y-4 hover:z-50 cursor-pointer filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.15)]"
                        >
                            <img
                                src={src}
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
