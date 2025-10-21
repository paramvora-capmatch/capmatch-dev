// src/components/ui/ContextHelp.tsx
import React, { useState } from 'react';
import { Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

interface ContextHelpProps {
  title: string;
  content: React.ReactNode;
  className?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  trigger?: 'hover' | 'click';
  icon?: React.ReactNode;
  iconSize?: number;
}

export const ContextHelp: React.FC<ContextHelpProps> = ({
  title,
  content,
  className,
  placement = 'top',
  trigger = 'hover',
  icon = <Info />,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    if (trigger === 'click') {
      setIsOpen(!isOpen);
    }
  };

  const handleMouseEnter = () => {
    if (trigger === 'hover') {
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (trigger === 'hover') {
      setIsOpen(false);
    }
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
        return 'bottom-full mb-2';
    }
  };

  return (
    <div 
      className={cn("relative inline-flex", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        className="text-gray-400 hover:text-gray-600 focus:outline-none"
        onClick={handleToggle}
        aria-label={`Help: ${title}`}
      >
        {React.isValidElement(icon) 
          ? React.cloneElement(icon) 
          : icon}
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute z-50 w-64 bg-white rounded-lg shadow-lg border border-gray-200",
              getPlacementStyles()
            )}
          >
            <div className="p-3">
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-medium text-gray-800 text-sm">{title}</h3>
                {trigger === 'click' && (
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="text-xs text-gray-600">
                {content}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};