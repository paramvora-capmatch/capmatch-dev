// src/components/ui/Footer.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { Linkedin, Twitter, Facebook } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/utils/cn';

export const Footer: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const currentYear = new Date().getFullYear();

  return (
    <footer className={cn(
      "py-6 transition-all duration-300 backdrop-blur-sm shadow-lg",
      isDark
        ? "bg-gray-900/95 text-white shadow-black/20"
        : "bg-white/95 text-gray-900 shadow-gray-200/20"
    )}>
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          {/* Logo and tagline */}
          <div className="mb-4 md:mb-0 text-center md:text-left">
            <h2 className={cn("text-xl font-bold mb-1", isDark ? "text-white" : "text-gray-900")}>CapMatch</h2>
            <p className={cn("text-sm", isDark ? "text-gray-300" : "text-gray-600")}>
              AI-Powered. Borrower-Controlled. Commercial Lending, Simplified.
            </p>
            <p className={cn("text-xs mt-1", isDark ? "text-gray-400" : "text-gray-500")}>
              Join thousands of borrowers who have found the perfect financing solution through our platform.
            </p>
          </div>

          {/* Navigation links and social icons */}
          <div className="flex flex-wrap justify-center md:justify-end">
            <div className="flex space-x-4 mr-6">
              <Link href="/terms" className={cn("text-sm transition-colors", isDark ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900")}>
                Terms
              </Link>
              <Link href="/privacy" className={cn("text-sm transition-colors", isDark ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900")}>
                Privacy
              </Link>
              <Link href="/contact" className={cn("text-sm transition-colors", isDark ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900")}>
                Contact
              </Link>
            </div>
            
            <div className="flex space-x-4 mt-3 md:mt-0">
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className={cn("transition-colors", isDark ? "text-gray-400 hover:text-blue-400" : "text-gray-600 hover:text-blue-600")}>
                <Linkedin size={18} />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className={cn("transition-colors", isDark ? "text-gray-400 hover:text-blue-400" : "text-gray-600 hover:text-blue-600")}>
                <Twitter size={18} />
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className={cn("transition-colors", isDark ? "text-gray-400 hover:text-blue-400" : "text-gray-600 hover:text-blue-600")}>
                <Facebook size={18} />
              </a>
            </div>
          </div>
        </div>
        
        {/* Copyright line */}
        <div className={cn("text-xs text-center mt-4", isDark ? "text-gray-500" : "text-gray-400")}>
          © {currentYear} CapMatch. All rights reserved.
        </div>
      </div>
    </footer>
  );
};