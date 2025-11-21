// src/components/om/DataSourceTooltip.tsx
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { getDataSources, getSectionSources, DataSource } from '@/lib/om-data-sources';

interface DataSourceTooltipProps {
  /** Field name(s) or section name to show sources for */
  fields?: string | string[];
  /** Section name (alternative to fields) */
  sectionName?: string;
  /** Icon size */
  iconSize?: number;
  /** Tooltip placement */
  placement?: 'top' | 'bottom' | 'left' | 'right';
  /** Custom className */
  className?: string;
}

export const DataSourceTooltip: React.FC<DataSourceTooltipProps> = ({
  fields,
  sectionName,
  iconSize = 16,
  placement = 'top',
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const iconRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Get sources based on fields or section name
  const sources: DataSource[] = fields
    ? getDataSources(fields)
    : sectionName
    ? getSectionSources(sectionName)
    : [];

  if (sources.length === 0) {
    return null; // Don't show tooltip if no sources found
  }

  const handleMouseEnter = () => {
    setIsOpen(true);
    updateTooltipPosition();
  };

  const handleMouseLeave = () => {
    setIsOpen(false);
  };

  const updateTooltipPosition = () => {
    if (!iconRef.current) return;

    const rect = iconRef.current.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    let top = 0;
    let left = 0;

    switch (placement) {
      case 'top':
        top = rect.top + scrollY - 8; // 8px margin
        left = rect.left + scrollX + rect.width / 2;
        break;
      case 'bottom':
        top = rect.bottom + scrollY + 8;
        left = rect.left + scrollX + rect.width / 2;
        break;
      case 'left':
        top = rect.top + scrollY + rect.height / 2;
        left = rect.left + scrollX - 8;
        break;
      case 'right':
        top = rect.top + scrollY + rect.height / 2;
        left = rect.right + scrollX + 8;
        break;
    }

    setTooltipPosition({ top, left });
  };

  useEffect(() => {
    if (isOpen) {
      updateTooltipPosition();
      const handleScroll = () => updateTooltipPosition();
      const handleResize = () => updateTooltipPosition();
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen, placement]);

  const getPlacementStyles = () => {
    switch (placement) {
      case 'top':
        return 'bottom-full mb-2 left-1/2 transform -translate-x-1/2';
      case 'bottom':
        return 'top-full mt-2 left-1/2 transform -translate-x-1/2';
      case 'left':
        return 'right-full mr-2 top-1/2 transform -translate-y-1/2';
      case 'right':
        return 'left-full ml-2 top-1/2 transform -translate-y-1/2';
      default:
        return 'bottom-full mb-2 left-1/2 transform -translate-x-1/2';
    }
  };

  // Format source text
  const formatSource = (source: DataSource): string => {
    if (source.backup) {
      return `${source.primary} (backup: ${source.backup})`;
    }
    return source.primary;
  };

  const tooltipContent = mounted && isOpen && (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: placement === 'top' ? 5 : -5, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: placement === 'top' ? 5 : -5, scale: 0.95 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={cn(
          'fixed z-[99999] w-80 bg-white rounded-lg shadow-xl border border-gray-200',
          placement === 'top' && '-translate-y-full -translate-x-1/2',
          placement === 'bottom' && '-translate-x-1/2',
          placement === 'left' && '-translate-x-full -translate-y-1/2',
          placement === 'right' && '-translate-y-1/2'
        )}
        style={{
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <div className="p-4">
          <div className="flex items-center mb-3">
            <Info className="h-4 w-4 text-blue-600 mr-2" />
            <h3 className="font-semibold text-sm text-gray-800">Data Sources</h3>
          </div>
          <div className="space-y-2">
            {sources.map((source, index) => (
              <div key={index} className="text-xs">
                <div className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <div className="flex-1">
                    <p className="text-gray-700 font-medium">
                      {formatSource(source)}
                    </p>
                    {source.notes && (
                      <p className="text-gray-500 mt-1 italic">{source.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );

  return (
    <>
      <div
        ref={iconRef}
        className={cn('relative inline-flex', className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <FileText
          size={iconSize}
          className="text-gray-400 hover:text-blue-600 transition-colors cursor-help"
          aria-label="Data sources"
        />
      </div>
      {mounted && createPortal(tooltipContent, document.body)}
    </>
  );
};

