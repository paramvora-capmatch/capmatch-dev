// src/components/ui/Button.tsx
import React from "react";
import { cn } from "../../utils/cn";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "outline"
    | "ghost"
    | "danger"
    | "success";
  as?: "button" | "a";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<
  HTMLButtonElement,
  ButtonProps
>(
  (
    {
      className,
      variant = "primary",
      as = "button",
      size = "md",
      isLoading = false,
      disabled,
      children,
      leftIcon,
      rightIcon,
      fullWidth,
      type = "button",
      ...props
    },
    ref
  ) => {
    const Component = as as any;
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500";

    const variantStyles = {
      primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm rounded-md",
      secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md",
      outline:
        "border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-md",
      ghost: "bg-transparent hover:bg-gray-100 text-gray-700 rounded-md",
      danger: "bg-red-600 hover:bg-red-700 text-white shadow-sm rounded-md",
      success:
        "bg-green-600 hover:bg-green-700 text-white shadow-sm rounded-md",
    };

    const sizeStyles = {
      sm: "text-xs px-2.5 py-1.5",
      md: "text-sm px-4 py-2",
      lg: "text-base px-6 py-3",
      icon: "p-2",
    };

    const widthStyles = fullWidth ? "w-full" : "";

    const isDisabled = disabled || isLoading;

    return (
      <Component
        ref={ref}
        type={as === "button" ? type : undefined}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          widthStyles,
          isDisabled ? "opacity-60 cursor-not-allowed" : "",
          className
        )}
        disabled={isDisabled}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </Component>
    );
  }
);

Button.displayName = "Button";
