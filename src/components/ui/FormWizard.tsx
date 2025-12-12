// src/components/ui/FormWizard.tsx
import React, { useState, useEffect } from 'react';
import { cn } from '../../utils/cn';
import { CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export interface Step {
  id: string;
  title: string;
  component: React.ReactNode;
  isOptional?: boolean;
  isCompleted?: boolean; // Track completion state if needed externally
}

interface FormWizardProps {
  steps: Step[];
  onComplete?: () => void;
  className?: string;
  allowSkip?: boolean; // Note: Skipping logic might need refinement if steps depend on each other
  showProgressBar?: boolean;
  showStepIndicators?: boolean;
  initialStep?: number;
  variant?: 'wizard' | 'tabs';
  showBottomNav?: boolean; // When true, show navigation buttons even in tabs variant
  onStepChange?: (stepId: string, stepIndex: number) => void;
}

export const FormWizard: React.FC<FormWizardProps> = ({
  steps,
  onComplete,
  className,
  allowSkip = false,
  showProgressBar = true,
  showStepIndicators = true,
  initialStep = 0,
  variant = 'wizard',
  showBottomNav = false,
  onStepChange,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(initialStep);
  // Internal completion tracking for visual state
  const [internallyCompletedSteps, setInternallyCompletedSteps] = useState<Record<string, boolean>>({});
  const numSteps = steps.length; // Memoize the number of steps
  
  // Scroll position tracking for tabs variant
  const [showLeftGradient, setShowLeftGradient] = useState(false);
  const [showRightGradient, setShowRightGradient] = useState(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Initialize internal completion based on external prop (if provided)
  useEffect(() => {
    const initialCompleted: Record<string, boolean> = {};
    steps.forEach(step => {
      if (step.isCompleted) { // Check the prop passed in
        initialCompleted[step.id] = true;
      }
    });
     // Also mark previous steps as complete initially if starting later
     for (let i = 0; i < initialStep; i++) {
         initialCompleted[steps[i].id] = true;
     }
    setInternallyCompletedSteps(initialCompleted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStep, numSteps]); // Rerun only if initialStep or number of steps changes

  // If initialStep changes (e.g., deep-linking into a step), move the wizard.
  useEffect(() => {
    if (initialStep < 0 || initialStep >= steps.length) return;
    setCurrentStepIndex((prev) => (prev === initialStep ? prev : initialStep));
  }, [initialStep, steps.length]);

  // Track scroll position for tabs variant to show/hide gradients
  const updateScrollGradients = React.useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || variant !== 'tabs') return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    const isScrollable = scrollWidth > clientWidth;
    
    setShowLeftGradient(isScrollable && scrollLeft > 0);
    setShowRightGradient(isScrollable && scrollLeft < scrollWidth - clientWidth - 1);
  }, [variant]);

  useEffect(() => {
    if (variant !== 'tabs') return;

    const container = scrollContainerRef.current;
    if (!container) return;

    // Initial check
    updateScrollGradients();

    // Listen to scroll events
    container.addEventListener('scroll', updateScrollGradients);
    
    // Listen to resize events (window and container)
    const resizeObserver = new ResizeObserver(() => {
      updateScrollGradients();
    });
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      container.removeEventListener('scroll', updateScrollGradients);
      resizeObserver.disconnect();
    };
  }, [variant, updateScrollGradients]);


  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const goNext = () => {
    // Mark current step as completed internally for visual feedback
    setInternallyCompletedSteps(prev => ({ ...prev, [currentStep.id]: true }));

    if (isLastStep) {
      onComplete?.(); // Call external onComplete if provided
    } else {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const goPrevious = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const goToStep = (index: number) => {
    if (variant === 'tabs') {
      setCurrentStepIndex(index);
      return;
    }
    // Allow navigation only to steps before the current one if they are marked complete
    if (index < currentStepIndex || internallyCompletedSteps[steps[index-1]?.id] || allowSkip) {
       setCurrentStepIndex(index);
    }
  };

  // Notify parent when the current step changes (for tracking last_step_id)
  useEffect(() => {
    const step = steps[currentStepIndex];
    if (!step) return;
    onStepChange?.(step.id, currentStepIndex);
  }, [currentStepIndex, onStepChange, steps]);

  // Calculate progress based on *internal* completion tracking for visuals
  const progressPercent = Math.round(
    (Object.values(internallyCompletedSteps).filter(Boolean).length / steps.length) * 100
  );

  const scrollTabs = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container || variant !== 'tabs') return;

    const scrollAmount = 260; // roughly a couple of tabs at a time
    const delta = direction === 'left' ? -scrollAmount : scrollAmount;

    container.scrollBy({
      left: delta,
      behavior: 'smooth',
    });
  };


  return (
    <div className={cn("w-full", className)}>
      {/* Tabs header when in tabs variant */}
      {variant === 'tabs' && (
        <div className="mb-6 border-b border-gray-200/70 bg-white/60 px-2 py-1">
          <div className="max-w-6xl mx-auto relative">
            {/* Left arrow */}
            {showLeftGradient && (
              <button
                type="button"
                onClick={() => scrollTabs('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                aria-label="Scroll left through sections"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            {/* Right arrow */}
            {showRightGradient && (
              <button
                type="button"
                onClick={() => scrollTabs('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                aria-label="Scroll right through sections"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
            {/* Left gradient overlay */}
            {showLeftGradient && (
              <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-white/95 via-white/60 to-transparent pointer-events-none z-10" />
            )}
            {/* Right gradient overlay */}
            {showRightGradient && (
              <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white/95 via-white/60 to-transparent pointer-events-none z-10" />
            )}
            <div
              ref={scrollContainerRef}
              className="overflow-x-auto scroll-smooth hide-scrollbar"
            >
              <div className="flex bg-gradient-to-r from-gray-100 to-gray-50 p-1 rounded-lg shadow-inner gap-1 min-w-max">
                {steps.map((step, index) => (
                  <button
                    key={step.id}
                    className={cn(
                      "flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 whitespace-nowrap flex-shrink-0",
                      index === currentStepIndex
                        ? "bg-gradient-to-r from-white to-gray-50 text-blue-600 shadow-sm transform scale-105 border border-blue-200/50"
                        : "text-gray-600 hover:text-gray-800 hover:bg-white/50 hover:scale-[1.02]"
                    )}
                    onClick={() => goToStep(index)}
                    aria-pressed={index === currentStepIndex}
                  >
                    {step.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {variant === 'wizard' && showProgressBar && (
        <div className="mb-6">
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-1 text-right text-sm text-gray-500">
            {progressPercent}% complete
          </div>
        </div>
      )}

      {/* Step indicators and titles */}
      {variant === 'wizard' && showStepIndicators && (
        <div className="flex justify-between items-start mb-8 px-4 md:px-8 relative z-0"> {/* Ensure below page header */}
          {steps.map((step, index) => (
            <div key={step.id} className="flex-1 flex flex-col items-center relative group"> {/* Added group */}
              {/* Step Circle */}
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all",
                  currentStepIndex === index ? "bg-blue-600 border-blue-600 text-white" :
                  internallyCompletedSteps[step.id] ? "bg-green-500 border-green-500 text-white" :
                  index < currentStepIndex ? "bg-white border-blue-600 text-blue-600" : // Completed but not active
                  "bg-white border-gray-300 text-gray-400", // Upcoming
                  index <= currentStepIndex || allowSkip ? "cursor-pointer" : "cursor-default"
                )}
                onClick={() => goToStep(index)}
              >
                {internallyCompletedSteps[step.id] || index < currentStepIndex ? (
                    <CheckCircle className="w-5 h-5" />
                 ) : (
                    <span className="text-xs font-semibold">{index + 1}</span> // Show number instead of circle icon
                )}
              </div>

              {/* Step Title - Positioned below */}
              <div className={cn(
                "mt-2 text-center text-xs md:text-sm font-medium absolute top-full whitespace-nowrap px-1 transition-colors", // Position below, allow wrapping maybe?
                currentStepIndex === index ? "text-blue-600 font-semibold" :
                internallyCompletedSteps[step.id] || index < currentStepIndex ? "text-gray-600" :
                "text-gray-400"
              )}>
                {step.title}
              </div>

               {/* Connector Line (Behind Circles) */}
               {index < steps.length - 1 && (
                 <div className={cn(
                     "absolute top-4 left-1/2 w-full h-0.5 z-0", // Position behind circle
                     internallyCompletedSteps[step.id] || index < currentStepIndex ? "bg-blue-600" : "bg-gray-300"
                 )} />
               )}

            </div>
          ))}
        </div>
      )}

      {/* Step content Area - Add margin top to avoid overlap with titles */}
      <div className="mt-8 mb-6"> {/* Added mt-8 */}
        {currentStep?.component} {/* Added optional chaining */}
      </div>

      {/* Navigation buttons */}
      {(variant === 'wizard' || showBottomNav) && (
        <div className={cn(
          "flex items-center pt-4",
          isFirstStep ? "justify-end" : "justify-between"
        )}>
          {!isFirstStep && (
            <Button
              variant="outline"
              className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
              leftIcon={<ChevronLeft size={16} />}
              onClick={goPrevious}
            >
              Previous
            </Button>
          )}
          {/* Show skip button only if allowed and step is optional */}
          {allowSkip && currentStep?.isOptional && !isLastStep && (
               <Button variant="ghost" onClick={goNext} className="text-sm text-gray-500 hover:text-gray-700">
                  Skip (Optional)
               </Button>
          )}
          <Button
            variant="outline"
            className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
            rightIcon={!isLastStep ? <ChevronRight size={16} /> : <CheckCircle size={16} />}
            onClick={goNext}
            // Add validation logic if needed: disabled={!isStepValid}
          >
            {isLastStep ? 'Complete' : 'Save and Next'}
          </Button>
        </div>
      )}
    </div>
  );
};