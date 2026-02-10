"use client";

import React from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { DottedGlowBackground } from "@/components/ui/dotted-glow-background";

export function SecuritySection() {
    return (
        <section className="relative py-24 overflow-hidden bg-white border-t border-gray-100">
            {/* Section-wide background with radial mask */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    maskImage: "radial-gradient(circle at 75% center, black 0%, transparent 45%)",
                    WebkitMaskImage: "radial-gradient(circle at 75% center, black 0%, transparent 45%)",
                }}
            >
                <DottedGlowBackground
                    className="w-full h-full opacity-60"
                    opacity={1}
                    gap={12}
                    radius={1.5}
                    colorLightVar="--color-blue-900"
                    glowColorLightVar="--color-blue-700"
                    backgroundOpacity={0}
                    speedMin={0.2}
                    speedMax={1.0}
                    speedScale={1}
                />
            </div>

            <div className="container mx-auto px-4 max-w-7xl relative z-10">
                <div className="flex flex-col items-center justify-between gap-12 md:flex-row">
                    <motion.div
                        className="flex-1 text-center md:text-left"
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                    >
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-6">
                            Enterprise-Grade <span className="text-blue-600">Security</span>
                        </h2>
                        <p className="text-lg md:text-xl text-gray-600 max-w-2xl leading-relaxed">
                            Your data security is our top priority. We employ industry-leading
                            encryption and security practices to ensure your information remains protected.
                            We are currently on our way to <span className="font-semibold text-gray-900">SOC2 compliance</span>.
                        </p>
                    </motion.div>

                    <motion.div
                        className="relative flex-1 flex items-center justify-center min-h-[400px]"
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        {/* Clean Lock Icon - No background */}
                        <div className="relative z-20">
                            <Lock size={160} className="text-blue-500/90" strokeWidth={1} />
                        </div>

                        {/* Subtle decorative glow behind icon */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-100/40 rounded-full blur-[100px] -z-10" />
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
