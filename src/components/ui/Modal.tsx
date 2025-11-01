// src/components/ui/Modal.tsx
import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | '8xl' | '9xl' | '10xl' | 'full';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on escape key press
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    '8xl': 'max-w-8xl',
    '9xl': 'max-w-9xl',
    '10xl': 'max-w-10xl',
    full: 'w-[98vw]',
  };

  const isFullSize = size === 'full';
  
  return (
    <div className={cn(
      "fixed inset-0 z-50 flex overflow-y-auto bg-black/20 backdrop-blur-sm",
      isFullSize ? "p-1" : "items-center justify-center p-4"
    )}>
      <div 
        ref={modalRef}
        className={cn(
          'bg-white rounded-lg shadow-xl transform transition-all flex flex-col',
          isFullSize 
            ? 'w-[98vw] h-[98vh] m-auto' 
            : `w-full ${sizeClasses[size]}`
        )}
        role="dialog"
        aria-modal="true"
      >
        {title && (
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-900 focus:outline-none p-1 rounded-md hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </div>
        )}
        <div className={cn("flex-1 overflow-hidden flex flex-col", !title && "pt-10", title ? "p-6" : "p-6")}>
          {children}
        </div>
      </div>
    </div>
  );
};

export const ModalHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn("mb-4", className)} {...props}>
    {children}
  </div>
);

export const ModalBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn("my-4", className)} {...props}>
    {children}
  </div>
);

export const ModalFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn("mt-6 flex justify-end space-x-3", className)} {...props}>
    {children}
  </div>
);