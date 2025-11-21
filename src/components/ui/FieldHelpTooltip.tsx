// src/components/ui/FieldHelpTooltip.tsx
import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { getFieldMetadata, FieldMetadata } from '@/lib/project-resume-field-metadata';

interface FieldHelpTooltipProps {
  fieldId: string;
  className?: string;
  iconSize?: number;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export const FieldHelpTooltip: React.FC<FieldHelpTooltipProps> = ({
  fieldId,
  className,
  iconSize = 16,
  placement = 'top',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const metadata = getFieldMetadata(fieldId);

  if (!metadata) {
    return null; // Don't show tooltip if metadata doesn't exist
  }

  const handleMouseEnter = () => {
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    setIsOpen(false);
  };

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

  return (
    <div
      className={cn('relative inline-flex items-center', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <HelpCircle
        size={iconSize}
        className="text-gray-400 hover:text-blue-600 transition-colors cursor-help"
      />
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: placement === 'top' ? 5 : -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: placement === 'top' ? 5 : -5, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
              'absolute z-50 w-80 bg-white rounded-lg shadow-xl border border-gray-200',
              getPlacementStyles()
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4">
              {/* Field Type Badge */}
              <div className="flex items-center justify-between mb-2">
                <span
                  className={cn(
                    'text-xs font-semibold px-2 py-0.5 rounded',
                    metadata.fieldType === 'derived'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-100 text-blue-700'
                  )}
                >
                  {metadata.fieldType === 'derived' ? 'Derived' : 'Direct'}
                </span>
                {metadata.dataType && (
                  <span className="text-xs text-gray-500">{metadata.dataType}</span>
                )}
              </div>

              {/* Description */}
              <p className="text-sm text-gray-800 mb-3 leading-relaxed">
                {metadata.description}
              </p>

              {/* Divider */}
              <div className="border-t border-gray-200 my-3" />

              {/* Sources */}
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-0.5">
                    Primary Source:
                  </p>
                  <p className="text-xs text-gray-600">{metadata.primarySource}</p>
                </div>
                {metadata.backupSource && metadata.backupSource !== 'N/A' && (
                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-0.5">
                      Backup Source:
                    </p>
                    <p className="text-xs text-gray-600">{metadata.backupSource}</p>
                  </div>
                )}
              </div>

              {/* Expected Value */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs font-semibold text-gray-700 mb-1">
                  Expected Value:
                </p>
                <p className="text-xs text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded">
                  {metadata.expectedValue}
                </p>
              </div>
            </div>

            {/* Arrow pointer */}
            <div
              className={cn(
                'absolute w-2 h-2 bg-white border-r border-b border-gray-200 transform rotate-45',
                placement === 'top' && 'top-full -mt-1 left-1/2 -translate-x-1/2',
                placement === 'bottom' && 'bottom-full -mb-1 left-1/2 -translate-x-1/2',
                placement === 'left' && 'left-full -ml-1 top-1/2 -translate-y-1/2',
                placement === 'right' && 'right-full -mr-1 top-1/2 -translate-y-1/2'
              )}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Wrapper component that adds tooltip to form fields
 */
interface FieldWithTooltipProps {
  fieldId: string;
  label: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}

export const FieldWithTooltip: React.FC<FieldWithTooltipProps> = ({
  fieldId,
  label,
  children,
  required = false,
  className,
}) => {
  return (
    <div className={cn('relative', className)}>
      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
        <span>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </span>
        <FieldHelpTooltip fieldId={fieldId} />
      </label>
      {children}
    </div>
  );
};

