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
}

export const FormWizard: React.FC<FormWizardProps> = ({
  steps,
  onComplete,
  className,
  allowSkip = false,
  showProgressBar = true,
  showStepIndicators = true,
  initialStep = 0,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(initialStep);
  // Internal completion tracking for visual state
  const [internallyCompletedSteps, setInternallyCompletedSteps] = useState<Record<string, boolean>>({});
  const numSteps = steps.length; // Memoize the number of steps

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
    // Allow navigation only to steps before the current one if they are marked complete
    if (index < currentStepIndex || internallyCompletedSteps[steps[index-1]?.id] || allowSkip) {
       setCurrentStepIndex(index);
    }
    // Add logic here if you want to prevent jumping far ahead
  };

  // Calculate progress based on *internal* completion tracking for visuals
  const progressPercent = Math.round(
    (Object.values(internallyCompletedSteps).filter(Boolean).length / steps.length) * 100
  );


  return (
    <div className={cn("w-full", className)}>
      {/* Progress bar */}
      {showProgressBar && (
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
      {showStepIndicators && (
        <div className="flex justify-between items-start mb-8 px-4 md:px-8 relative"> {/* Added relative positioning */}
          {steps.map((step, index) => (
            <div key={step.id} className="flex-1 flex flex-col items-center relative group"> {/* Added group */}
              {/* Step Circle */}
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all z-10",
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
      <div className={cn(
        "flex items-center pt-4 border-t", // Added border-t for separation
        isFirstStep ? "justify-end" : "justify-between"
      )}>
        {!isFirstStep && (
          <Button
            variant="outline"
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
          variant="primary"
          rightIcon={!isLastStep ? <ChevronRight size={16} /> : <CheckCircle size={16} />}
          onClick={goNext}
          // Add validation logic if needed: disabled={!isStepValid}
        >
          {isLastStep ? 'Complete' : 'Next'}
        </Button>
      </div>
    </div>
  );
};