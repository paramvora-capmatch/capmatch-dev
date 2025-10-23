// src/contexts/FormContext.tsx
'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { FormContextType, FieldContext } from '../types/ask-ai-types';

const FormContext = createContext<FormContextType>({} as FormContextType);

export const useFormContext = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within a FormProvider');
  }
  return context;
};

interface FormProviderProps {
  children: React.ReactNode;
  initialFormData: Record<string, unknown>;
}

export const FormProvider: React.FC<FormProviderProps> = ({ children, initialFormData }) => {
  const [formData, setFormData] = useState(initialFormData);
  const subscribers = useRef<Set<(fieldId: string, value: unknown) => void>>(new Set());
  const fieldContextCache = useRef<Map<string, FieldContext>>(new Map());

  const fieldChanged = useCallback((fieldId: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));

    // Notify all subscribers
    subscribers.current.forEach(callback => {
      try {
        callback(fieldId, value);
      } catch (error) {
        console.error('Error in form change subscriber:', error);
      }
    });
  }, []);

  const subscribeToChanges = useCallback((callback: (fieldId: string, value: unknown) => void) => {
    subscribers.current.add(callback);
    
    // Return unsubscribe function
    return () => {
      subscribers.current.delete(callback);
    };
  }, []);

  const getFieldContext = useCallback((fieldId: string): FieldContext | null => {
    // Check cache first
    if (fieldContextCache.current.has(fieldId)) {
      return fieldContextCache.current.get(fieldId)!;
    }

    // Build context from DOM
    const fieldElement = document.querySelector(`[data-field-id="${fieldId}"]`);
    if (!fieldElement) return null;

    const context: FieldContext = {
      id: fieldId,
      type: (fieldElement.getAttribute('data-field-type') as FieldContext['type']) || 'input',
      section: (fieldElement.getAttribute('data-field-section') as FieldContext['section']) || 'basic-info',
      required: fieldElement.getAttribute('data-field-required') === 'true',
      label: fieldElement.getAttribute('data-field-label') || '',
      placeholder: fieldElement.getAttribute('data-field-placeholder') || undefined,
      currentValue: formData[fieldId as keyof typeof formData],
      options: fieldElement.getAttribute('data-field-options')
        ? JSON.parse(fieldElement.getAttribute('data-field-options') || '[]')
        : undefined,
      validationState: {
        isValid: true,
        errors: [],
        warnings: [],
        isComplete: false,
        suggestions: []
      }
    };

    // Cache the context
    fieldContextCache.current.set(fieldId, context);
    return context;
  }, [formData]);

  // Update form data when initialFormData changes
  useEffect(() => {
    setFormData(initialFormData);
  }, [initialFormData]);

  const value: FormContextType = {
    formData,
    fieldChanged,
    subscribeToChanges,
    getFieldContext
  };

  return (
    <FormContext.Provider value={value}>
      {children}
    </FormContext.Provider>
  );
}; 