// src/components/ui/Footer.tsx
import React from 'react';
import Link from 'next/link';
import { Linkedin, Twitter, Facebook } from 'lucide-react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          {/* Logo and tagline */}
          <div className="mb-4 md:mb-0 text-center md:text-left">
            <h2 className="text-xl font-bold text-white mb-1">CapMatch</h2>
            <p className="text-gray-300 text-sm">
              AI-Powered. Borrower-Controlled. Commercial Lending, Simplified.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Join thousands of borrowers who have found the perfect financing solution through our platform.
            </p>
          </div>

          {/* Navigation links and social icons */}
          <div className="flex flex-wrap justify-center md:justify-end">
            <div className="flex space-x-4 mr-6">
              <Link href="/terms" className="text-sm text-gray-400 hover:text-white">
                Terms
              </Link>
              <Link href="/privacy" className="text-sm text-gray-400 hover:text-white">
                Privacy
              </Link>
              <Link href="/contact" className="text-sm text-gray-400 hover:text-white">
                Contact
              </Link>
            </div>
            
            <div className="flex space-x-4 mt-3 md:mt-0">
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-400 transition-colors">
                <Linkedin size={18} />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-400 transition-colors">
                <Twitter size={18} />
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-400 transition-colors">
                <Facebook size={18} />
              </a>
            </div>
          </div>
        </div>
        
        {/* Copyright line */}
        <div className="text-xs text-center text-gray-500 mt-4">
          © {currentYear} CapMatch. All rights reserved.
        </div>
      </div>
    </footer>
  );
};