// src/components/ui/EnhancedHeader.tsx
'use client';

import React, { useState, useEffect, MutableRefObject } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn, Menu, X, Briefcase } from 'lucide-react'; // Added Briefcase for Process
import { motion } from 'framer-motion';
import { Button } from './Button';
import { cn } from '@/utils/cn';

interface EnhancedHeaderProps {
  scrolled: boolean;
  logoRef?: MutableRefObject<HTMLImageElement | null>;
  visible?: boolean;
  textVisible?: boolean;
  logoHidden?: boolean;
}

export const EnhancedHeader: React.FC<EnhancedHeaderProps> = ({
  scrolled,
  logoRef,
  visible = true,
  textVisible = false,
  logoHidden = false
}) => {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mobileMenuOpen && !(e.target instanceof Element && e.target.closest('header'))) {
         setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
        document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [mobileMenuOpen]);

  const toggleMobileMenu = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleNav = (path: string, isSectionLink: boolean = false) => {
    setMobileMenuOpen(false);
    if (isSectionLink) {
        // For section links, we need to ensure we are on the homepage first
        if (typeof window !== 'undefined' && window.location.pathname === '/') {
            document.getElementById(path.substring(1))?.scrollIntoView({ behavior: 'smooth' });
        } else {
            router.push('/' + path); // Navigate to homepage then scroll (can be improved)
        }
    } else {
        router.push(path);
    }
  };

  return (
    <motion.header
      className={cn(
        "fixed top-0 left-0 right-0 z-30 transition-all duration-300",
        scrolled
          ? "bg-white/90 backdrop-blur-sm shadow-md py-2"
          : "bg-transparent py-4"
      )}
    >
      <div className="container mx-auto flex justify-between items-center px-4">
        <div>
          <Link href="/" className="flex items-center">
            <div className="flex items-center justify-center">
              <img
                ref={logoRef}
                src="/CapMatchLogo.png"
                alt="CapMatch"
                className={cn(
                  "transition-all duration-300",
                  scrolled ? "h-12" : "h-14 drop-shadow-sm",
                  logoHidden && "invisible"
                )}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.outerHTML = `<span class=\"font-bold text-lg ${scrolled ? 'text-blue-700' : 'text-blue-800'}\">CapMatch</span>`;
                }}
              />
            </div>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: textVisible ? 1 : 0 }}
              transition={{ duration: 0.6 }}
              className={cn(
                "ml-3 transition-all duration-300 font-bold",
                scrolled ? "text-lg text-blue-700" : "text-2xl text-blue-700 drop-shadow-sm"
              )}
            >
              CapMatch
            </motion.span>
          </Link>
        </div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: visible ? 1 : 0, x: visible ? 0 : 20 }}
          transition={{ duration: 0.6, delay: visible ? 0.2 : 0, ease: "easeOut" }}
          className="hidden md:flex items-center space-x-6"
        >
          <nav className="flex items-center space-x-6">
            <Link href="/#lenderline-section" scroll={false} // Add scroll={false} for smooth scroll
              onClick={(e) => { e.preventDefault(); document.getElementById('lenderline-section')?.scrollIntoView({ behavior: 'smooth' });}}
              className={cn(
              "text-sm font-medium transition-colors",
              scrolled ? "text-gray-700 hover:text-blue-600" : "text-black hover:text-blue-700 drop-shadow-sm"
            )}>
              <span className="font-semibold">LenderLine</span>
              <sup className="text-xs">™</sup>
            </Link>
            <Link href="/#process-section" scroll={false} // Add scroll={false}
              onClick={(e) => { e.preventDefault(); document.getElementById('process-section')?.scrollIntoView({ behavior: 'smooth' });}}
              className={cn(
              "text-sm font-medium transition-colors",
              scrolled ? "text-gray-700 hover:text-blue-600" : "text-black hover:text-blue-700 drop-shadow-sm"
            )}>
              Process
            </Link>
          </nav>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<LogIn size={16} />}
            onClick={() => router.push('/login')}
            className={cn(
              scrolled ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-700 hover:bg-blue-800 shadow-lg",
              "font-medium transition-colors duration-200"
            )}
          >
            <span>Access <span className="font-bold">Deal Room</span><sup className="text-xs">™</sup></span>
          </Button>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.8 }}
          transition={{ duration: 0.6, delay: visible ? 0.3 : 0, ease: "easeOut" }}
          className={cn(
            "md:hidden p-2 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 rounded transition-colors",
            scrolled ? "text-gray-700" : "text-white"
          )}
          onClick={toggleMobileMenu}
          aria-label="Toggle mobile menu"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </motion.button>
      </div>

      {mobileMenuOpen && visible && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="md:hidden bg-white/95 backdrop-blur-sm border-t shadow-lg absolute top-full left-0 right-0"
        >
          <div className="container mx-auto py-4 px-4">
            <nav className="flex flex-col space-y-4">
               <Link
                href="/#lenderline-section"
                className="text-gray-700 hover:text-blue-600 py-2 text-sm font-medium block"
                onClick={() => handleNav('#lenderline-section', true)}
              >
                <span className="font-semibold">LenderLine</span>
                <sup className="text-xs">™</sup>
              </Link>
              <Link
                href="/#process-section"
                className="text-gray-700 hover:text-blue-600 py-2 text-sm font-medium block"
                onClick={() => handleNav('#process-section', true)}
              >
                Process
              </Link>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<LogIn size={16} />}
                onClick={() => handleNav('/login')}
                className="mt-2 w-full"
              >
                <span>Access <span className="font-bold">Deal Room</span><sup className="text-xs">™</sup></span>
              </Button>
            </nav>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
};