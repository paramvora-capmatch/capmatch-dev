// src/components/ui/SplashScreen.tsx
'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface SplashScreenProps {
  onComplete?: () => void;
  onLogoAnimationStart?: (position: { x: number, y: number, width: number, height: number }) => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ 
  onComplete,
  onLogoAnimationStart 
}) => {
  const logoRef = useRef<HTMLImageElement>(null);

  // Run the effect exactly once when component mounts
  useEffect(() => {
    // Schedule the completion and animation after 2 seconds
    const timer = setTimeout(() => {
      if (logoRef.current && onLogoAnimationStart) {
        // Get the position of the logo element
        const rect = logoRef.current.getBoundingClientRect();
        onLogoAnimationStart({
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        });
      }

      onComplete?.();
    }, 2000);
    
    // Clean up timer if component unmounts
    return () => clearTimeout(timer);
  }, [onComplete, onLogoAnimationStart]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-40 flex items-center justify-center bg-white"
    >
      <div className="flex items-center justify-center w-full h-full">
        <div className="flex flex-col items-center justify-center">
          <img
            src="/CapMatchLogo.png"
            alt="CapMatch"
            className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-36 lg:h-36 xl:w-40 xl:h-40 object-contain"
            ref={logoRef}
          />
        </div>
      </div>
    </motion.div>
  );
};