"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";
import { loadProjectImages, type ImageData } from "@/lib/imageUtils";

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
	height = "h-64",
	onClick,
}: ImageSlideshowProps) {
	const [images, setImages] = useState<ImageData[]>([]);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [imagesPreloaded, setImagesPreloaded] = useState(false);
	const [isHovered, setIsHovered] = useState(false);
	const intervalRef = useRef<NodeJS.Timeout | null>(null);
	const touchStartX = useRef<number | null>(null);
	const touchEndX = useRef<number | null>(null);
	const preloadedImagesRef = useRef<Set<string>>(new Set());

	// Load images from artifacts folder structure
	useEffect(() => {
		const loadImages = async () => {
			if (!projectId || !orgId) return;

			setIsLoading(true);
			setImagesPreloaded(false);
			preloadedImagesRef.current.clear();
			try {
				// Load images from artifacts, excluding "other" category (logos, abstract images, etc.)
				// Only show site_images and architectural_diagrams
				const allImages = await loadProjectImages(
					projectId,
					orgId,
					true
				); // true = exclude "other"

				// Filter to site_images first, then architectural_diagrams (exclude "other")
				const siteImages = allImages.filter(
					(img) => img.category === "site_images"
				);
				const diagrams = allImages.filter(
					(img) => img.category === "architectural_diagrams"
				);

				// Combine: site images first, then diagrams (no "other" category)
				const sortedImages = [...siteImages, ...diagrams];

				setImages(sortedImages);
			} catch (error) {
				console.error("Error loading images:", error);
			} finally {
				setIsLoading(false);
			}
		};

		loadImages();
	}, [projectId, orgId]);

	// Preload all images into browser cache once images are loaded
	useEffect(() => {
		if (isLoading || images.length === 0) return;

		// Preload all images using native Image API for better browser cache utilization
		const imageUrls = images.map((img) => img.url).filter(Boolean);

		if (imageUrls.length === 0) {
			setImagesPreloaded(true);
			return;
		}

		let loadedCount = 0;
		const totalImages = imageUrls.length;

		const loadImage = (url: string): Promise<void> => {
			return new Promise((resolve) => {
				// Check if already preloaded
				if (preloadedImagesRef.current.has(url)) {
					resolve();
					return;
				}

				const img = new window.Image();
				img.onload = () => {
					preloadedImagesRef.current.add(url);
					loadedCount++;
					// Mark as preloaded once all images are loaded
					if (loadedCount === totalImages) {
						setImagesPreloaded(true);
					}
					resolve();
				};
				img.onerror = () => {
					// Still count as loaded to not block the UI
					preloadedImagesRef.current.add(url);
					loadedCount++;
					if (loadedCount === totalImages) {
						setImagesPreloaded(true);
					}
					resolve();
				};
				img.src = url;
			});
		};

		// Load all images in parallel
		Promise.all(imageUrls.map((url) => loadImage(url))).catch(() => {
			// Even if some fail, mark as preloaded so slideshow can start
			setImagesPreloaded(true);
		});
	}, [isLoading, images]);

	// Auto-play functionality (only start after images are preloaded)
	useEffect(() => {
		if (images.length <= 1 || !imagesPreloaded) {
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
	}, [isHovered, images.length, autoPlayInterval, imagesPreloaded]);

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

	// Show loading state while fetching image list
	if (isLoading) {
		return (
			<div
				className={cn(
					"relative w-full rounded-lg overflow-hidden bg-gray-100 shadow-lg flex items-center justify-center",
					height
				)}
			>
				<div className="flex flex-col items-center gap-3">
					<Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
					<p className="text-sm text-gray-500">Loading images...</p>
				</div>
			</div>
		);
	}

	// Don't render if no images available
	if (images.length === 0) {
		return null;
	}

	return (
		<div
			className={cn(
				"relative w-full rounded-lg overflow-hidden bg-gray-900 shadow-lg",
				height,
				onClick &&
					"cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
			)}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			onTouchStart={handleTouchStart}
			onTouchMove={handleTouchMove}
			onTouchEnd={handleTouchEnd}
			onClick={onClick}
			role={onClick ? "button" : undefined}
			tabIndex={onClick ? 0 : undefined}
		>
			{/* Images - preloaded, no loading overlay */}
			<div className="relative w-full h-full">
				<AnimatePresence mode="wait" initial={false}>
					<motion.div
						key={currentIndex}
						initial={{ opacity: 0, x: 300 }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, x: -300 }}
						transition={{ duration: 0.3, ease: "easeInOut" }}
						className="absolute inset-0"
					>
						<Image
							src={images[currentIndex].url}
							alt={images[currentIndex].title}
							fill
							sizes="100vw"
							className="object-cover"
							priority={currentIndex === 0}
							loading={currentIndex === 0 ? "eager" : "lazy"}
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
							"absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors z-10 backdrop-blur-sm duration-300",
							isHovered
								? "opacity-100"
								: "opacity-0 pointer-events-none"
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
							"absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors z-10 backdrop-blur-sm duration-300",
							isHovered
								? "opacity-100"
								: "opacity-0 pointer-events-none"
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
								"transition-all duration-300 rounded-full",
								index === currentIndex
									? "w-8 h-2 bg-white"
									: "w-2 h-2 bg-white/50 hover:bg-white/75"
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
					{images.length ? currentIndex + 1 : 0} /{" "}
					{images.length || 0}
				</span>
			</div>
		</div>
	);
}
