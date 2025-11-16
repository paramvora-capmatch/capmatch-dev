// src/components/ui/SplashScreen.tsx
"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ReactNode } from "react";

interface SplashScreenProps {
  text?: string;
  icon?: ReactNode;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ text, icon }) => {
  const logoRef = useRef<HTMLImageElement>(null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      className="fixed inset-0 z-40 flex items-center justify-center"
    >
      {/* Glassmorphic backdrop */}
      <div className="absolute inset-0 bg-white/70 backdrop-blur-md" />
      
      {/* Content */}
      <div className="relative flex items-center justify-center w-full h-full">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col items-center justify-center space-y-6"
        >
          <Image
            src="/CapMatchLogo.png"
            alt="CapMatch"
            width={160}
            height={160}
            className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-36 lg:h-36 xl:w-40 xl:h-40 object-contain"
            ref={logoRef}
          />
          
          {/* Optional icon */}
          {icon && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="flex items-center justify-center"
            >
              {icon}
            </motion.div>
          )}
          
          {/* Optional text */}
          {text && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="text-gray-700 text-base sm:text-lg font-medium"
            >
              {text}
            </motion.p>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};
