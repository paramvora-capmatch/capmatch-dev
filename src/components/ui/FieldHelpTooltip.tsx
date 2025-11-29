// src/components/ui/FieldHelpTooltip.tsx
import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";
import {
	getFieldMetadata,
	FieldMetadata,
} from "@/lib/project-resume-field-metadata";

interface FieldHelpTooltipProps {
	fieldId: string;
	className?: string;
	iconSize?: number;
	placement?: "top" | "bottom" | "left" | "right";
}

export const FieldHelpTooltip: React.FC<FieldHelpTooltipProps> = ({
	fieldId,
	className,
	iconSize = 16,
	placement = "top",
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [position, setPosition] = useState({ top: 0, left: 0 });
	const triggerRef = useRef<HTMLDivElement>(null);
	const metadata = getFieldMetadata(fieldId);

	useEffect(() => {
		if (isOpen && triggerRef.current) {
			const updatePosition = () => {
				const rect = triggerRef.current?.getBoundingClientRect();
				if (rect) {
					const scrollY = window.scrollY;
					const scrollX = window.scrollX;

					switch (placement) {
						case "top":
							setPosition({
								top: rect.top + scrollY - 8,
								left: rect.left + scrollX + rect.width / 2,
							});
							break;
						case "bottom":
							setPosition({
								top: rect.bottom + scrollY + 8,
								left: rect.left + scrollX + rect.width / 2,
							});
							break;
						case "left":
							setPosition({
								top: rect.top + scrollY + rect.height / 2,
								left: rect.left + scrollX - 8,
							});
							break;
						case "right":
							setPosition({
								top: rect.top + scrollY + rect.height / 2,
								left: rect.right + scrollX + 8,
							});
							break;
					}
				}
			};

			updatePosition();
			window.addEventListener("scroll", updatePosition, true);
			window.addEventListener("resize", updatePosition);

			return () => {
				window.removeEventListener("scroll", updatePosition, true);
				window.removeEventListener("resize", updatePosition);
			};
		}
	}, [isOpen, placement]);

	if (!metadata) {
		return null; // Don't show tooltip if metadata doesn't exist
	}

	const handleMouseEnter = () => {
		setIsOpen(true);
	};

	const handleMouseLeave = () => {
		setIsOpen(false);
	};

	const getTooltipStyles = () => {
		const baseStyles = {
			position: "fixed" as const,
			zIndex: 9999,
			width: "20rem", // w-80
		};

		switch (placement) {
			case "top":
				return {
					...baseStyles,
					top: `${position.top}px`,
					left: `${position.left}px`,
					transform: "translate(-50%, -100%)",
					marginBottom: "0.5rem",
				};
			case "bottom":
				return {
					...baseStyles,
					top: `${position.top}px`,
					left: `${position.left}px`,
					transform: "translate(-50%, 0)",
					marginTop: "0.5rem",
				};
			case "left":
				return {
					...baseStyles,
					top: `${position.top}px`,
					left: `${position.left}px`,
					transform: "translate(-100%, -50%)",
					marginRight: "0.5rem",
				};
			case "right":
				return {
					...baseStyles,
					top: `${position.top}px`,
					left: `${position.left}px`,
					transform: "translate(0, -50%)",
					marginLeft: "0.5rem",
				};
			default:
				return {
					...baseStyles,
					top: `${position.top}px`,
					left: `${position.left}px`,
					transform: "translate(-50%, -100%)",
					marginBottom: "0.5rem",
				};
		}
	};

	const getArrowStyles = () => {
		const baseStyles: React.CSSProperties = {
			position: "absolute",
			width: "0.5rem",
			height: "0.5rem",
			backgroundColor: "white",
			borderRight: "1px solid rgb(229 231 235)",
			borderBottom: "1px solid rgb(229 231 235)",
			transform: "rotate(45deg)",
		};

		switch (placement) {
			case "top":
				return {
					...baseStyles,
					bottom: "-0.25rem",
					left: "50%",
					transform: "translateX(-50%) rotate(45deg)",
				};
			case "bottom":
				return {
					...baseStyles,
					top: "-0.25rem",
					left: "50%",
					transform: "translateX(-50%) rotate(45deg)",
				};
			case "left":
				return {
					...baseStyles,
					right: "-0.25rem",
					top: "50%",
					transform: "translateY(-50%) rotate(45deg)",
				};
			case "right":
				return {
					...baseStyles,
					left: "-0.25rem",
					top: "50%",
					transform: "translateY(-50%) rotate(45deg)",
				};
			default:
				return {
					...baseStyles,
					bottom: "-0.25rem",
					left: "50%",
					transform: "translateX(-50%) rotate(45deg)",
				};
		}
	};

	return (
		<>
			<div
				ref={triggerRef}
				className={cn("relative inline-flex items-center", className)}
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
			>
				<HelpCircle
					size={iconSize}
					className="text-gray-400 hover:text-blue-600 transition-colors cursor-help"
				/>
			</div>

			{typeof window !== "undefined" &&
				createPortal(
					<AnimatePresence>
						{isOpen && (
							<motion.div
								initial={{
									opacity: 0,
									y:
										placement === "top"
											? 5
											: placement === "bottom"
											? -5
											: 0,
									x:
										placement === "left"
											? 5
											: placement === "right"
											? -5
											: 0,
									scale: 0.95,
								}}
								animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
								exit={{
									opacity: 0,
									y:
										placement === "top"
											? 5
											: placement === "bottom"
											? -5
											: 0,
									x:
										placement === "left"
											? 5
											: placement === "right"
											? -5
											: 0,
									scale: 0.95,
								}}
								transition={{ duration: 0.2, ease: "easeOut" }}
								style={getTooltipStyles()}
								className="bg-white rounded-lg shadow-xl border border-gray-200 pointer-events-auto"
								onClick={(e) => e.stopPropagation()}
								onMouseEnter={() => setIsOpen(true)}
								onMouseLeave={() => setIsOpen(false)}
							>
								<div className="p-4">
									{/* Field Type Badge */}
									<div className="flex items-center justify-between mb-2">
										<span
											className={cn(
												"text-xs font-semibold px-2 py-0.5 rounded",
												metadata.fieldType === "derived"
													? "bg-purple-100 text-purple-700"
													: "bg-blue-100 text-blue-700"
											)}
										>
											{metadata.fieldType === "derived"
												? "Derived"
												: "Direct"}
										</span>
										{metadata.dataType && (
											<span className="text-xs text-gray-500">
												{metadata.dataType}
											</span>
										)}
									</div>

									{/* Description */}
									<p className="text-sm text-gray-800 mb-3 leading-relaxed">
										{metadata.description}
									</p>

									{/* Divider */}
									<div className="border-t border-gray-200 my-3" />

									{/* Sources */}
									<div className="space-y-2">
										<div>
											<p className="text-xs font-semibold text-gray-700 mb-0.5">
												Primary Source:
											</p>
											<p className="text-xs text-gray-600">
												{metadata.primarySource}
											</p>
										</div>
										{metadata.backupSource &&
											metadata.backupSource !== "N/A" && (
												<div>
													<p className="text-xs font-semibold text-gray-700 mb-0.5">
														Backup Source:
													</p>
													<p className="text-xs text-gray-600">
														{metadata.backupSource}
													</p>
												</div>
											)}
									</div>

									{/* Expected Value */}
									<div className="mt-3 pt-3 border-t border-gray-200">
										<p className="text-xs font-semibold text-gray-700 mb-1">
											Expected Value:
										</p>
										<p className="text-xs text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded">
											{metadata.expectedValue}
										</p>
									</div>
								</div>

								{/* Arrow pointer */}
								<div style={getArrowStyles()} />
							</motion.div>
						)}
					</AnimatePresence>,
					document.body
				)}
		</>
	);
};

/**
 * Wrapper component that adds tooltip to form fields
 */
interface FieldWithTooltipProps {
	fieldId: string;
	label: string;
	children: React.ReactNode;
	required?: boolean;
	className?: string;
}

export const FieldWithTooltip: React.FC<FieldWithTooltipProps> = ({
	fieldId,
	label,
	children,
	required = false,
	className,
}) => {
	return (
		<div className={cn("relative", className)}>
			<label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
				<span>
					{label}
					{required && <span className="text-red-500 ml-1">*</span>}
				</span>
				<FieldHelpTooltip fieldId={fieldId} />
			</label>
			{children}
		</div>
	);
};
