// src/components/ui/EnhancedHeader.tsx
'use client';

import React, { useState, useEffect, MutableRefObject } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn, Menu, X, Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from './Button';
import { cn } from '@/utils/cn';
import { useTheme } from '@/contexts/ThemeContext';

interface EnhancedHeaderProps {
  scrolled: boolean;
  logoRef?: MutableRefObject<HTMLImageElement | null>;
  textVisible?: boolean;
  logoHidden?: boolean;
}

export const EnhancedHeader: React.FC<EnhancedHeaderProps> = ({
  scrolled,
  logoRef,
  textVisible = false,
  logoHidden = false
}) => {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
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

  const isDark = theme === 'dark';
  
  return (
    <motion.header
      className={cn(
        "fixed top-0 left-0 right-0 z-30 transition-all duration-300",
        scrolled
          ? isDark 
            ? "bg-gray-900/95 backdrop-blur-sm shadow-lg shadow-black/20 py-3"
            : "bg-white/95 backdrop-blur-sm shadow-lg shadow-gray-200/20 py-3"
          : isDark
            ? "bg-transparent py-5"
            : "bg-transparent py-5"
      )}
    >
      <div className="container mx-auto flex justify-between items-center px-4 h-16">
        <div className="flex items-center">
          <Link 
            href="/" 
            className="flex items-center"
            onClick={() => {
              try {
                sessionStorage.setItem('navigatingFromApp', 'true');
              } catch (error) {
                console.warn('Could not set navigation flag:', error);
              }
            }}
          >
            <div className="flex items-center justify-center">
              <Image
                ref={logoRef}
                src="/CapMatchLogo.png"
                alt="CapMatch"
                width={56}
                height={56}
                className={cn(
                  "transition-all duration-300",
                  scrolled ? "h-12" : "h-14 drop-shadow-sm",
                  logoHidden && "invisible"
                )}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.outerHTML = `<span class=\"font-bold text-lg text-blue-400\">CapMatch</span>`;
                }}
              />
            </div>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: textVisible ? 1 : 0 }}
              transition={{ duration: 0.6 }}
              className={cn(
                "ml-3 transition-all duration-300 font-bold flex items-center",
                isDark ? "text-white" : "text-gray-900",
                scrolled ? "text-lg" : "text-2xl drop-shadow-sm"
              )}
            >
              CapMatch
            </motion.span>
          </Link>
        </div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="hidden md:flex items-center space-x-6"
        >
          <nav className="flex items-center space-x-6">
            <Link href="/#lender-matching-section" scroll={false}
              onClick={(e) => { e.preventDefault(); document.getElementById('lender-matching-section')?.scrollIntoView({ behavior: 'smooth' });}}
              className={cn(
              "text-sm font-medium transition-colors",
              isDark 
                ? scrolled ? "text-gray-300 hover:text-blue-400" : "text-gray-200 hover:text-blue-400"
                : scrolled ? "text-gray-700 hover:text-blue-600" : "text-gray-800 hover:text-blue-600"
            )}>
              <span className="font-semibold">Lender Matching</span>
            </Link>
            <Link href="/#process-section" scroll={false}
              onClick={(e) => { e.preventDefault(); document.getElementById('process-section')?.scrollIntoView({ behavior: 'smooth' });}}
              className={cn(
              "text-sm font-medium transition-colors",
              isDark 
                ? scrolled ? "text-gray-300 hover:text-blue-400" : "text-gray-200 hover:text-blue-400"
                : scrolled ? "text-gray-700 hover:text-blue-600" : "text-gray-800 hover:text-blue-600"
            )}>
              Process
            </Link>
          </nav>

          <div className="flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className={cn(
                "p-2 rounded-full transition-colors",
                isDark 
                  ? "text-gray-300 hover:text-white hover:bg-gray-800" 
                  : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              )}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <Button
              variant="primary"
              size="sm"
              leftIcon={<LogIn size={16} />}
              onClick={() => router.push('/login')}
              className={cn(
                "bg-blue-500 hover:bg-blue-600 shadow-lg !text-white",
                "font-medium transition-colors duration-200"
              )}
            >
              <span>Access <span className="font-bold">Deal Room</span></span>
            </Button>
          </div>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          className={cn(
            "md:hidden p-2 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 rounded transition-colors",
            isDark ? "text-white" : "text-gray-900"
          )}
          onClick={toggleMobileMenu}
          aria-label="Toggle mobile menu"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </motion.button>
      </div>

      {mobileMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "md:hidden backdrop-blur-sm border-t shadow-lg absolute top-full left-0 right-0",
            isDark 
              ? "bg-gray-900/95 border-gray-700"
              : "bg-white/95 border-gray-200"
          )}
        >
          <div className="container mx-auto py-4 px-4">
            <nav className="flex flex-col space-y-4">
               <Link
                href="/#lender-matching-section"
                className={cn(
                  "py-2 text-sm font-medium block",
                  isDark ? "text-gray-300 hover:text-blue-400" : "text-gray-700 hover:text-blue-600"
                )}
                onClick={() => handleNav('#lender-matching-section', true)}
              >
                <span className="font-semibold">Lender Matching</span>
              </Link>
              <Link
                href="/#process-section"
                className={cn(
                  "py-2 text-sm font-medium block",
                  isDark ? "text-gray-300 hover:text-blue-400" : "text-gray-700 hover:text-blue-600"
                )}
                onClick={() => handleNav('#process-section', true)}
              >
                Process
              </Link>
              <button
                onClick={toggleTheme}
                className={cn(
                  "py-2 text-sm font-medium text-left flex items-center space-x-2",
                  isDark ? "text-gray-300 hover:text-white" : "text-gray-700 hover:text-gray-900"
                )}
              >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
                <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<LogIn size={16} />}
                onClick={() => handleNav('/login')}
                className="mt-2 w-full bg-blue-500 hover:bg-blue-600 !text-white"
              >
                <span>Access <span className="font-bold">Deal Room</span></span>
              </Button>
            </nav>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
};