// src/components/ui/Form.tsx
import React from 'react';
import { cn } from '../../utils/cn';

type FormProps = React.FormHTMLAttributes<HTMLFormElement>;

export const Form: React.FC<FormProps> = ({ 
  className,
  children, 
  ...props 
}) => {
  return (
    <form className={cn("space-y-4", className)} {...props}>
      {children}
    </form>
  );
};

interface FormGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'row' | 'column';
}

export const FormGroup: React.FC<FormGroupProps> = ({ 
  className, 
  children, 
  direction = 'column',
  ...props 
}) => {
  return (
    <div 
      className={cn(
        direction === 'column' ? "space-y-2" : "flex items-center space-x-4",
        className
      )} 
      {...props}
    >
      {children}
    </div>
  );
};

interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const FormLabel: React.FC<FormLabelProps> = ({ 
  className, 
  children, 
  required,
  ...props 
}) => {
  return (
    <label 
      className={cn("block text-sm font-medium text-gray-700", className)} 
      {...props}
    >
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
};

interface FormHelperTextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  error?: boolean;
}

export const FormHelperText: React.FC<FormHelperTextProps> = ({ 
  className, 
  children, 
  error,
  ...props 
}) => {
  return (
    <p 
      className={cn(
        "mt-1 text-sm", 
        error ? "text-red-600" : "text-gray-500",
        className
      )} 
      {...props}
    >
      {children}
    </p>
  );
};