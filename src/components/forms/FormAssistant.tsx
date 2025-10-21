// src/components/forms/FormAssistant.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/Button';
import { MessageSquare, X, Info } from 'lucide-react';

interface FormAssistantProps {
  formSection: string;
  completedFields: string[];
  requiredFields: string[];
  onHelpRequest?: () => void;
}

export const FormAssistant: React.FC<FormAssistantProps> = ({
  formSection,
  completedFields,
  requiredFields,
  onHelpRequest,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [currentTip, setCurrentTip] = useState(0);
  
  // Tips for different form sections
  const tipsBySection: Record<string, string[]> = {
    'basic-info': [
      "Give your project a descriptive name that helps you identify it easily.",
      "Make sure the property address is accurate and complete.",
      "The property type will help match you with appropriate lenders.",
    ],
    'loan-info': [
      "Enter your desired loan amount in whole dollars (e.g., 10000000 for $10M).",
      "Most lenders have maximum LTV requirements between 65-80%.",
      "Interest-only periods typically range from 0-60 months.",
    ],
    'financials': [
      "If you're acquiring a property, enter the purchase price.",
      "For development projects, include the total project cost.",
      "CapEx budget should detail planned improvements.",
    ],
    'documents': [
      "Personal financial statements should be current within 90 days.",
      "Rent rolls should include unit mix, sizes, and current rents.",
      "Operating statements should cover at least the past 12 months.",
    ],
    'timeline': [
      "Be realistic with your closing timeline expectations.",
      "Most loans take 45-60 days to close after application.",
      "Having your documents ready can speed up the process.",
    ],
  };
  
  // Get tips for current section
  const tips = tipsBySection[formSection] || [
    "Complete all required fields for the best lender matches.",
    "Your advisor will review your project after submission.",
    "You can save and return to complete your project later.",
  ];
  
  // Calculate completion percentage
  const completionPercentage = requiredFields.length > 0
    ? Math.round((completedFields.filter(field => requiredFields.includes(field)).length / requiredFields.length) * 100)
    : 0;
  
  // Cycle through tips
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length);
    }, 8000);
    
    return () => clearInterval(interval);
  }, [tips.length]);
  
  // Reset tip index when section changes
  useEffect(() => {
    setCurrentTip(0);
  }, [formSection]);
  
  if (!isVisible) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="fixed bottom-6 right-6 z-40 max-w-sm w-full"
    >
      <Card className="shadow-lg border-blue-100">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center">
              <div className="bg-blue-100 p-2 rounded-full mr-3">
                <Info className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-medium text-gray-800">Form Assistant</h3>
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Progress indicator */}
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Section Completion</span>
              <span className="font-medium text-blue-600">{completionPercentage}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 transition-all duration-700" 
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
          
          {/* Tips carousel */}
          <div className="bg-blue-50 p-3 rounded-lg mb-3 min-h-20">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTip}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="text-sm text-blue-800"
              >
                {tips[currentTip]}
              </motion.div>
            </AnimatePresence>
            
            {/* Dots indicator */}
            <div className="flex justify-center mt-2 space-x-1">
              {tips.map((_, index) => (
                <div 
                  key={index}
                  className={`w-1.5 h-1.5 rounded-full ${
                    currentTip === index ? 'bg-blue-600' : 'bg-blue-300'
                  }`}
                />
              ))}
            </div>
          </div>
          
          {/* Help button */}
          {onHelpRequest && (
            <Button
              variant="outline"
              leftIcon={<MessageSquare size={16} />}
              onClick={onHelpRequest}
              fullWidth
            >
              Ask My Advisor for Help
            </Button>
          )}
          
          {/* Missing fields info */}
          {requiredFields.length > 0 && completionPercentage < 100 && (
            <div className="mt-3 text-xs text-gray-600">
              <p className="font-medium mb-1">Required fields remaining:</p>
              <ul className="ml-4 list-disc">
                {requiredFields
                  .filter(field => !completedFields.includes(field))
                  .slice(0, 3)
                  .map(field => (
                    <li key={field} className="text-amber-700">
                      {field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </li>
                  ))}
                {requiredFields.filter(field => !completedFields.includes(field)).length > 3 && (
                  <li className="text-amber-700">
                    ...and {requiredFields.filter(field => !completedFields.includes(field)).length - 3} more
                  </li>
                )}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};