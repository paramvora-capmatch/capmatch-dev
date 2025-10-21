// src/components/ui/SuccessPathIndicator.tsx
import React from 'react';
import { Check, X, Clock } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface Step {
  id: string;
  label: string;
  description?: string;
  status: 'complete' | 'current' | 'upcoming' | 'skipped';
}

interface SuccessPathIndicatorProps {
  steps: Step[];
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  onStepClick?: (stepId: string) => void;
}

export const SuccessPathIndicator: React.FC<SuccessPathIndicatorProps> = ({
  steps,
  orientation = 'horizontal',
  className,
  onStepClick,
}) => {
  const isClickable = !!onStepClick;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <Check className="h-5 w-5 text-white" />;
      case 'current':
        return <Clock className="h-5 w-5 text-white" />;
      case 'skipped':
        return <X className="h-5 w-5 text-white" />;
      case 'upcoming':
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'bg-green-600 border-green-600';
      case 'current':
        return 'bg-blue-600 border-blue-600';
      case 'skipped':
        return 'bg-gray-400 border-gray-400';
      case 'upcoming':
      default:
        return 'bg-white border-gray-300';
    }
  };

  const getConnectorColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'bg-green-600';
      case 'current':
        return 'bg-blue-600';
      case 'skipped':
      case 'upcoming':
      default:
        return 'bg-gray-300';
    }
  };

  const handleStepClick = (stepId: string) => {
    if (isClickable) {
      onStepClick(stepId);
    }
  };

  return (
    <div 
      className={cn(
        "flex",
        orientation === 'vertical' ? 'flex-col space-y-4' : 'items-center',
        className
      )}
    >
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          {/* Step circle with icon */}
          <div className="flex items-center">
            <div 
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full border-2",
                getStatusColor(step.status),
                isClickable && 'cursor-pointer hover:shadow-md transition-shadow'
              )}
              onClick={() => handleStepClick(step.id)}
            >
              {getStatusIcon(step.status)}
              
              {step.status === 'upcoming' && (
                <span className="text-gray-500 text-sm font-medium">{index + 1}</span>
              )}
            </div>
            
            {/* Step label for horizontal orientation */}
            {orientation === 'horizontal' && (
              <div className="ml-2">
                <p className={cn(
                  "text-xs font-medium",
                  step.status === 'complete' ? 'text-green-700' :
                  step.status === 'current' ? 'text-blue-700' :
                  step.status === 'skipped' ? 'text-gray-500' : 'text-gray-500'
                )}>
                  {step.label}
                </p>
              </div>
            )}
          </div>
          
          {/* Connector line */}
          {index < steps.length - 1 && (
            <div 
              className={cn(
                orientation === 'vertical' ? 'w-0.5 h-4 ml-4' : 'h-0.5 w-8 mx-2',
                getConnectorColor(step.status)
              )} 
            />
          )}
          
          {/* Step details for vertical orientation */}
          {orientation === 'vertical' && (
            <div className="ml-3">
              <p className={cn(
                "font-medium",
                step.status === 'complete' ? 'text-green-700' :
                step.status === 'current' ? 'text-blue-700' :
                step.status === 'skipped' ? 'text-gray-500' : 'text-gray-500'
              )}>
                {step.label}
              </p>
              {step.description && (
                <p className="text-sm text-gray-500 mt-0.5">{step.description}</p>
              )}
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};