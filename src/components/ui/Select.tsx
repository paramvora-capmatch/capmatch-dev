// src/components/ui/Select.tsx
import React, { forwardRef } from "react";
import { cn } from "../../utils/cn";

export interface SelectOption {
	value: string;
	label: string;
	disabled?: boolean;
}

export interface SelectProps
	extends Omit<
		React.SelectHTMLAttributes<HTMLSelectElement>,
		"size" | "placeholder"
	> {
	options: SelectOption[];
	label?: string;
	helperText?: string;
	error?: string;
	size?: "sm" | "md" | "lg";
	fullWidth?: boolean;
	placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
	(
		{
			className,
			options,
			label,
			helperText,
			error,
			size = "md",
			fullWidth = true,
			id,
			placeholder = "Select...",
			...props
		},
		ref
	): React.JSX.Element => {
		const inputId = id || Math.random().toString(36).substr(2, 9);

		const sizeClasses = {
			sm: "h-8 text-xs",
			md: "h-10 text-sm",
			lg: "h-12 text-base",
		};

		// Extract className from props to apply to select element, and remove it from props
		const { className: propsClassName, ...selectProps } = props;
		// Use className prop if provided, otherwise use className from props spread
		const selectClassName = className || propsClassName;

		return (
			<div className={cn(fullWidth && "w-full")}>
				{label && (
					<label
						htmlFor={inputId}
						className="block text-sm font-medium text-gray-700 mb-1"
					>
						{label}
					</label>
				)}
				<div className="relative rounded-md shadow-sm">
					<select
						ref={ref}
						id={inputId}
						className={cn(
							"block rounded-md border shadow-sm transition-colors pr-8",
							sizeClasses[size],
							// Only apply default border classes if no custom className is provided
							!selectClassName && error &&
								"border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500 bg-red-50/50",
							!selectClassName && !error &&
								"border-gray-300 focus:ring-blue-500 focus:border-blue-500",
							fullWidth && "w-full",
							"px-3 py-2 appearance-none",
							// Apply custom className last to override defaults
							selectClassName
						)}
						aria-invalid={error ? "true" : "false"}
						aria-describedby={
							error
								? `${inputId}-error`
								: helperText
								? `${inputId}-helper`
								: undefined
						}
						{...selectProps}
					>
						{placeholder && (
							<option value="" disabled hidden>
								{placeholder}
							</option>
						)}
						{options.map((option) => (
							<option
								key={option.value}
								value={option.value}
								disabled={option.disabled}
							>
								{option.label}
							</option>
						))}
					</select>
					<div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
						<svg
							className="h-5 w-5 text-gray-400"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
							aria-hidden="true"
						>
							<path
								fillRule="evenodd"
								d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
								clipRule="evenodd"
							/>
						</svg>
					</div>
				</div>
				{error ? (
					<p
						className="mt-1 text-sm text-red-600"
						id={`${inputId}-error`}
					>
						{error}
					</p>
				) : helperText ? (
					<p
						className="mt-1 text-sm text-gray-500"
						id={`${inputId}-helper`}
					>
						{helperText}
					</p>
				) : null}
			</div>
		);
	}
);

Select.displayName = "Select";
