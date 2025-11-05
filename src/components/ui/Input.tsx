// src/components/ui/Input.tsx
import React, { forwardRef, useState } from 'react';
import { cn } from '../../utils/cn';
import { Eye, EyeOff } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    label, 
    helperText, 
    error, 
    type = 'text', 
    leftIcon, 
    rightIcon, 
    fullWidth = true,
    id,
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || Math.random().toString(36).substr(2, 9);
    
    // For password inputs, we'll add toggle functionality
    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;
    
    const togglePassword = () => {
      setShowPassword(!showPassword);
    };

    const passwordIcon = showPassword ? (
      <EyeOff className="h-5 w-5 text-gray-400 cursor-pointer" onClick={togglePassword} />
    ) : (
      <Eye className="h-5 w-5 text-gray-400 cursor-pointer" onClick={togglePassword} />
    );

    return (
      <div className={cn(fullWidth && "w-full", className)}>
        {label && (
          <label 
            htmlFor={inputId} 
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
          </label>
        )}
        <div className="relative rounded-md shadow-sm">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            className={cn(
              "h-10 px-3 py-2 block rounded-md sm:text-sm border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500",
              leftIcon && "pl-10",
              (rightIcon || isPassword) && "pr-10",
              error && "border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500",
              fullWidth && "w-full"
            )}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            {...props}
          />
          {(rightIcon || isPassword) && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              {isPassword ? passwordIcon : rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="mt-1 text-sm text-red-600" id={`${inputId}-error`}>
            {error}
          </p>
        ) : helperText ? (
          <p className="mt-1 text-sm text-gray-500" id={`${inputId}-helper`}>
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';