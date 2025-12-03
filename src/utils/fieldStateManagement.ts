/**
 * Field State Management Utilities
 * 
 * This module provides utilities for managing field states in resume forms.
 * Fields can be in three states:
 * - WHITE: Empty, unlocked field (initial state)
 * - BLUE: User-editable, unlocked field (user input)
 * - GREEN: Filled, locked field (either AI-filled or user-filled and locked)
 */

import { cn } from "./cn";

export type FieldState = "WHITE" | "BLUE" | "GREEN";
export type FieldLockStatus = "locked" | "unlocked";
export type FieldSourceType = "ai" | "user_input" | null;

export interface FieldStateData {
	state: FieldState;
	locked: boolean;
	source: FieldSourceType;
}

/**
 * Determines if a value is considered "provided" (not empty)
 */
export function isValueProvided(value: unknown): boolean {
	if (value === null || value === undefined) return false;
	if (typeof value === "string") return value.trim().length > 0;
	if (Array.isArray(value)) return value.length > 0;
	if (typeof value === "number") return !Number.isNaN(value);
	if (typeof value === "boolean") return true;
	if (typeof value === "object") return Object.keys(value).length > 0;
	return false;
}

/**
 * Checks if a source is from AI (not user_input)
 */
export function isAISource(source: any): boolean {
	if (!source) return false;
	
	// Handle SourceMetadata object format
	if (typeof source === "object" && source !== null && "type" in source) {
		return source.type !== "user_input";
	}
	
	// Handle string format
	if (typeof source === "string") {
		const normalized = source.toLowerCase().trim();
		return normalized !== "user_input" && normalized !== "user input";
	}
	
	return false;
}

/**
 * Gets the primary source type from sources array
 */
export function getSourceType(sources: any[] | undefined | null): FieldSourceType {
	if (!sources || sources.length === 0) return null;
	
	const primarySource = sources[0];
	if (isAISource(primarySource)) return "ai";
	
	// Check if it's explicitly user_input
	if (
		(typeof primarySource === "object" && primarySource !== null && primarySource.type === "user_input") ||
		(typeof primarySource === "string" && (primarySource.toLowerCase() === "user_input" || primarySource.toLowerCase() === "user input"))
	) {
		return "user_input";
	}
	
	// Default to user_input if unclear
	return "user_input";
}

/**
 * Calculates the current field state based on value, lock status, and source
 */
export function calculateFieldState(
	value: unknown,
	isLocked: boolean,
	source: FieldSourceType,
	hasValue: boolean = isValueProvided(value)
): FieldState {
	// If field has no value, it's WHITE (regardless of lock status)
	if (!hasValue) {
		return "WHITE";
	}
	
	// If field is locked, it's GREEN
	if (isLocked) {
		return "GREEN";
	}
	
	// If field has value but is unlocked, it's BLUE
	return "BLUE";
}

/**
 * Determines the target state after an action
 */
export function getStateAfterAction(
	currentState: FieldState,
	action: "autofill_ai" | "autofill_unfilled" | "user_fill" | "user_unlock" | "user_lock" | "user_clear"
): FieldState {
	switch (action) {
		case "autofill_ai":
			// AI fills field -> GREEN (will be locked separately)
			return "GREEN";
		
		case "autofill_unfilled":
			// Field not filled by AI -> BLUE (user should fill)
			return "BLUE";
		
		case "user_fill":
			// User fills empty field -> BLUE
			return currentState === "WHITE" ? "BLUE" : currentState;
		
		case "user_unlock":
			// User unlocks green field -> BLUE
			return currentState === "GREEN" ? "BLUE" : currentState;
		
		case "user_lock":
			// User locks blue field -> GREEN
			return currentState === "BLUE" ? "GREEN" : currentState;
		
		case "user_clear":
			// User clears field -> WHITE
			return "WHITE";
		
		default:
			return currentState;
	}
}

/**
 * Gets field state data from stored field states
 */
export function getFieldStateData(
	fieldId: string,
	fieldStates: Record<string, FieldStateData> | undefined,
	defaultValue?: FieldStateData
): FieldStateData {
	if (!fieldStates) {
		return defaultValue || { state: "WHITE", locked: false, source: null };
	}
	
	return fieldStates[fieldId] || defaultValue || { state: "WHITE", locked: false, source: null };
}

/**
 * Creates a field state data object
 */
export function createFieldStateData(
	state: FieldState,
	locked: boolean,
	source: FieldSourceType
): FieldStateData {
	return { state, locked, source };
}

/**
 * Updates field state in the states record
 */
export function updateFieldState(
	fieldStates: Record<string, FieldStateData>,
	fieldId: string,
	updates: Partial<FieldStateData>
): Record<string, FieldStateData> {
	const current = getFieldStateData(fieldId, fieldStates);
	const updated = { ...current, ...updates };
	
	// Ensure state is calculated correctly if lock status changed
	if (updates.locked !== undefined || updates.state !== undefined) {
		updated.state = calculateFieldState(
			null, // We don't have value here, so we rely on explicit state
			updated.locked,
			updated.source || current.source,
			updated.state !== "WHITE" // Has value if not WHITE
		);
	}
	
	return { ...fieldStates, [fieldId]: updated };
}

/**
 * Gets CSS classes for field styling based on state
 */
export function getFieldStateClasses(
	state: FieldState,
	isLocked: boolean,
	baseClasses: string = ""
): string {
	const stateClasses: Record<FieldState, string> = {
		WHITE: "border-gray-200 bg-white focus:ring-blue-200",
		BLUE: "border-blue-600 bg-blue-50 focus:ring-blue-600 focus:border-blue-600 hover:border-blue-700 transition-colors",
		GREEN: "border-emerald-500 bg-emerald-50 focus:ring-emerald-500 focus:border-emerald-600 hover:border-emerald-600 transition-colors",
	};
	
	const classes = stateClasses[state] || stateClasses.WHITE;
	
	if (isLocked) {
		return cn(baseClasses, classes, "cursor-not-allowed");
	}
	
	return cn(baseClasses, classes);
}

