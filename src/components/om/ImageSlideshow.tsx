'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/utils/cn';

interface ImageSlideshowProps {
  projectId: string;
  orgId: string;
  autoPlayInterval?: number; // milliseconds
  height?: string; // e.g., "h-64", "h-96"
}

interface ImageData {
  url: string;
  name: string;
}

export function ImageSlideshow({
  projectId,
  orgId,
  autoPlayInterval = 5000, // 5 seconds default
  height = 'h-64',
}: ImageSlideshowProps) {
  const [images, setImages] = useState<ImageData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Load site images
  useEffect(() => {
    const loadImages = async () => {
      if (!projectId || !orgId) return;
      
      setIsLoading(true);
      try {
        const { data: siteData, error } = await supabase.storage
          .from(orgId)
          .list(`${projectId}/site-images`, {
            limit: 100,
            sortBy: { column: 'name', order: 'asc' },
          });

        if (error) {
          console.error('Error loading site images:', error);
          setIsLoading(false);
          return;
        }

        if (siteData) {
          const imagePromises = siteData
            .filter((f) => f.name !== '.keep' && f.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))
            .map(async (f) => {
              const filePath = `${projectId}/site-images/${f.name}`;
              const { data, error } = await supabase.storage
                .from(orgId)
                .createSignedUrl(filePath, 3600);

              if (error) {
                console.error(`Error creating signed URL for ${f.name}:`, error);
                return null;
              }

              return {
                name: f.name,
                url: data.signedUrl,
              };
            });

          const loadedImages = (await Promise.all(imagePromises)).filter(
            (img): img is ImageData => img !== null
          );

          setImages(loadedImages);
        }
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
    if (images.length <= 1) return;
    
    if (isPlaying && !isHovered) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      }, autoPlayInterval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, isHovered, images.length, autoPlayInterval]);

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

  // Remove file extension helper
  const removeFileExtension = (filename: string): string => {
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1) return filename;
    return filename.substring(0, lastDotIndex);
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
      className={cn('relative w-full rounded-lg overflow-hidden bg-gray-900 shadow-lg', height)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
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
              alt={removeFileExtension(images[currentIndex].name)}
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
          {removeFileExtension(images[currentIndex].name)}
        </h3>
      </div>

      {/* Navigation Arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors z-10 backdrop-blur-sm"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors z-10 backdrop-blur-sm"
            aria-label="Next image"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Controls (top right) */}
      {images.length > 1 && (
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors backdrop-blur-sm"
            aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </button>
        </div>
      )}

      {/* Dots Indicator (bottom center) */}
      {images.length > 1 && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
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

      {/* Image Counter */}
      {images.length > 1 && (
        <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/50 text-white text-xs backdrop-blur-sm z-10">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
}

