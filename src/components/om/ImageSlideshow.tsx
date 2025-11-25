'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { loadProjectImages, type ImageData } from '@/lib/imageUtils';

interface ImageSlideshowProps {
  projectId: string;
  orgId: string;
  projectName?: string;
  autoPlayInterval?: number; // milliseconds
  height?: string; // e.g., "h-64", "h-96"
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export function ImageSlideshow({
  projectId,
  orgId,
  projectName,
  autoPlayInterval = 5000, // 5 seconds default
  height = 'h-64',
  onClick,
}: ImageSlideshowProps) {
  const [images, setImages] = useState<ImageData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Load images from artifacts folder structure
  useEffect(() => {
    const loadImages = async () => {
      if (!projectId || !orgId) return;
      
      setIsLoading(true);
      try {
        // Load all images from artifacts (prioritize site_images for slideshow)
        const allImages = await loadProjectImages(projectId, orgId);
        
        // Filter to site_images first, then architectural_diagrams, then other
        const siteImages = allImages.filter(img => img.category === 'site_images');
        const diagrams = allImages.filter(img => img.category === 'architectural_diagrams');
        const other = allImages.filter(img => img.category === 'other');
        
        // Combine: site images first, then diagrams, then other
        const sortedImages = [...siteImages, ...diagrams, ...other];
        
        setImages(sortedImages);
      } catch (error) {
        console.error('Error loading images:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadImages();
  }, [projectId, orgId]);

  // Auto-play functionality
  useEffect(() => {
    if (images.length <= 1) {
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }

    if (!isHovered) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      }, autoPlayInterval);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isHovered, images.length, autoPlayInterval]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // Touch/swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;

    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      goToNext();
    } else if (distance < -minSwipeDistance) {
      goToPrevious();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };


  if (isLoading) {
    return (
      <div className={cn('w-full bg-gray-100 rounded-lg flex items-center justify-center', height)}>
        <div className="text-gray-500">Loading images...</div>
      </div>
    );
  }

  if (images.length === 0) {
    return null; // Don't show anything if there are no images
  }

  return (
    <div
      className={cn(
        'relative w-full rounded-lg overflow-hidden bg-gray-900 shadow-lg',
        height,
        onClick && 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Images */}
      <div className="relative w-full h-full">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="absolute inset-0"
          >
            <Image
              src={images[currentIndex].url}
              alt={images[currentIndex].title}
              fill
              sizes="100vw"
              className="object-cover"
              priority={currentIndex === 0}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Image Name Overlay (bottom) */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-4">
        <h3 className="text-white font-semibold text-sm md:text-base">
          {images[currentIndex].title}
        </h3>
      </div>

      {/* Navigation Arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={(event) => {
              event.stopPropagation();
              goToPrevious();
            }}
            className={cn(
              'absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors z-10 backdrop-blur-sm duration-300',
              isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}
            aria-label="Previous image"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              goToNext();
            }}
            className={cn(
              'absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors z-10 backdrop-blur-sm duration-300',
              isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}
            aria-label="Next image"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Dots Indicator (bottom center) */}
      {images.length > 1 && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={(event) => {
                event.stopPropagation();
                goToSlide(index);
              }}
              className={cn(
                'transition-all duration-300 rounded-full',
                index === currentIndex
                  ? 'w-8 h-2 bg-white'
                  : 'w-2 h-2 bg-white/50 hover:bg-white/75'
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Project Name + Image Counter */}
      <div className="absolute top-4 left-4 px-4 py-2 rounded-full bg-black/50 text-white text-xs md:text-sm backdrop-blur-sm z-10 flex items-center gap-3 max-w-[85%]">
        {projectName && (
          <span className="font-semibold text-sm md:text-base truncate">
            {projectName}
          </span>
        )}
        <span className="text-white/60">•</span>
        <span className="text-xs md:text-sm">
          {images.length ? currentIndex + 1 : 0} / {images.length || 0}
        </span>
      </div>
    </div>
  );
}

