import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";

interface FieldWarningsTooltipProps {
	warnings?: string[];
	className?: string;
	placement?: "top" | "bottom" | "left" | "right";
}

export const FieldWarningsTooltip: React.FC<FieldWarningsTooltipProps> = ({
	warnings,
	className,
	placement = "top",
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [position, setPosition] = useState({ top: 0, left: 0 });
	const triggerRef = useRef<HTMLDivElement>(null);

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

	if (!warnings || warnings.length === 0) {
		return null;
	}

	const getTooltipStyles = () => {
		const baseStyles = {
			position: "fixed" as const,
			zIndex: 9999,
			width: "20rem",
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
			borderRight: "1px solid rgb(254 240 138)", // amber-200
			borderBottom: "1px solid rgb(254 240 138)",
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
				className={cn(
					"relative inline-flex items-center cursor-help",
					className
				)}
				onMouseEnter={() => setIsOpen(true)}
				onMouseLeave={() => setIsOpen(false)}
			>
				<AlertTriangle className="h-3 w-3 text-amber-500" />
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
								className="bg-amber-50 rounded-lg shadow-xl border border-amber-200 pointer-events-auto"
								onClick={(e) => e.stopPropagation()}
								onMouseEnter={() => setIsOpen(true)}
								onMouseLeave={() => setIsOpen(false)}
							>
								<div className="p-3">
									<div className="flex items-start gap-2">
										<AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
										<div>
											<p className="text-xs font-semibold text-amber-800 mb-1">
												Warnings
											</p>
											<ul className="space-y-1">
												{warnings.map((w, idx) => (
													<li
														key={idx}
														className="text-xs text-amber-900 leading-snug"
													>
														{w}
													</li>
												))}
											</ul>
										</div>
									</div>
								</div>
								<div style={getArrowStyles()} />
							</motion.div>
						)}
					</AnimatePresence>,
					document.body
				)}
		</>
	);
}

