"use client";

/**
 * Utility for debounced sanity checks with request cancellation
 * Prevents excessive API calls when users are typing or rapidly changing fields
 */

interface DebouncedSanityCheckOptions {
	debounceMs?: number; // Debounce for individual field checks (blur events)
	batchDebounceMs?: number; // Debounce for batch/dependency validations
	resumeType: "project" | "borrower";
}

interface PendingCheck {
	fieldId: string;
	value: any;
	context: Record<string, any>;
	existingFieldData: Record<string, any>;
	abortController: AbortController;
}

export class DebouncedSanityChecker {
	private debounceMs: number;
	private batchDebounceMs: number;
	private resumeType: "project" | "borrower";
	private pendingChecks: Map<string, PendingCheck> = new Map();
	private debounceTimeouts: Map<string, NodeJS.Timeout> = new Map();
	private lastCheckTimes: Map<string, number> = new Map(); // Track last check time per field

	constructor(options: DebouncedSanityCheckOptions) {
		this.debounceMs = options.debounceMs ?? 1000; // Default 1 second for individual checks
		this.batchDebounceMs = options.batchDebounceMs ?? 2000; // Default 2 seconds for batch checks
		this.resumeType = options.resumeType;
	}

	/**
	 * Schedule a sanity check for a field with debouncing
	 * Cancels any pending check for the same field
	 * Uses progressive debouncing: longer delays for rapid repeated checks
	 */
	scheduleCheck(
		fieldId: string,
		value: any,
		context: Record<string, any>,
		existingFieldData: Record<string, any>,
		onComplete: (fieldId: string, warnings: string[]) => void,
		onError?: (fieldId: string, error: Error) => void
	): void {
		// Cancel any existing pending check for this field
		this.cancelCheck(fieldId);

		// Create new abort controller for this check
		const abortController = new AbortController();

		// Store the pending check
		this.pendingChecks.set(fieldId, {
			fieldId,
			value,
			context,
			existingFieldData,
			abortController,
		});

		// Clear any existing timeout
		const existingTimeout = this.debounceTimeouts.get(fieldId);
		if (existingTimeout) {
			clearTimeout(existingTimeout);
		}

		// Progressive debouncing: if checked recently, use longer delay
		const now = Date.now();
		const lastCheckTime = this.lastCheckTimes.get(fieldId) || 0;
		const timeSinceLastCheck = now - lastCheckTime;
		
		// If checked within last 2 seconds, use longer debounce (2x)
		// If checked within last 5 seconds, use even longer debounce (3x)
		let debounceDelay = this.debounceMs;
		if (timeSinceLastCheck < 2000) {
			debounceDelay = this.debounceMs * 2;
		} else if (timeSinceLastCheck < 5000) {
			debounceDelay = this.debounceMs * 1.5;
		}

		// Schedule the check after debounce period
		const timeout = setTimeout(async () => {
			const pending = this.pendingChecks.get(fieldId);
			if (!pending) return;

			// Remove from pending checks
			this.pendingChecks.delete(fieldId);
			this.debounceTimeouts.delete(fieldId);

			// Update last check time
			this.lastCheckTimes.set(fieldId, Date.now());

			// Check if aborted
			if (abortController.signal.aborted) {
				return;
			}

			try {
				// Dynamic import to avoid SSR issues
				const { checkRealtimeSanity } = await import("@/lib/api/realtimeSanityCheck");
				const result = await checkRealtimeSanity({
					fieldId: pending.fieldId,
					value: pending.value,
					resumeType: this.resumeType,
					context: pending.context,
					existingFieldData: pending.existingFieldData,
				});

				// Check again if aborted during the request
				if (abortController.signal.aborted) {
					return;
				}

				onComplete(pending.fieldId, result.warnings || []);
			} catch (error) {
				// Don't call onError if the request was aborted
				if (abortController.signal.aborted) {
					return;
				}

				const err = error instanceof Error ? error : new Error(String(error));
				onError?.(pending.fieldId, err);
			}
		}, this.debounceMs);

		this.debounceTimeouts.set(fieldId, timeout);
	}

	/**
	 * Get the appropriate debounce delay for batch operations
	 */
	private getBatchDebounceDelay(): number {
		return this.batchDebounceMs;
	}

	/**
	 * Cancel a pending check for a field
	 */
	cancelCheck(fieldId: string): void {
		const pending = this.pendingChecks.get(fieldId);
		if (pending) {
			pending.abortController.abort();
			this.pendingChecks.delete(fieldId);
		}

		const timeout = this.debounceTimeouts.get(fieldId);
		if (timeout) {
			clearTimeout(timeout);
			this.debounceTimeouts.delete(fieldId);
		}
	}

	/**
	 * Cancel all pending checks
	 */
	cancelAll(): void {
		for (const [fieldId] of this.pendingChecks) {
			this.cancelCheck(fieldId);
		}
	}

	/**
	 * Batch check multiple fields in parallel with debouncing
	 * Returns a promise that resolves when all checks complete
	 * Uses longer debounce delay for batch operations
	 */
	async batchCheck(
		fields: Array<{
			fieldId: string;
			value: any;
			context: Record<string, any>;
			existingFieldData: Record<string, any>;
		}>,
		onComplete: (fieldId: string, warnings: string[]) => void,
		onError?: (fieldId: string, error: Error) => void
	): Promise<void> {
		// Cancel any pending individual checks for these fields
		fields.forEach((field) => this.cancelCheck(field.fieldId));

		// Wait for batch debounce delay before executing
		await new Promise((resolve) => setTimeout(resolve, this.getBatchDebounceDelay()));

		// Execute all checks in parallel
		// Dynamic import to avoid SSR issues
		const { checkRealtimeSanity } = await import("@/lib/api/realtimeSanityCheck");
		
		const promises = fields.map(async (field) => {
			try {
				// Update last check time for each field
				this.lastCheckTimes.set(field.fieldId, Date.now());

				const result = await checkRealtimeSanity({
					fieldId: field.fieldId,
					value: field.value,
					resumeType: this.resumeType,
					context: field.context,
					existingFieldData: field.existingFieldData,
				});

				onComplete(field.fieldId, result.warnings || []);
			} catch (error) {
				const err = error instanceof Error ? error : new Error(String(error));
				onError?.(field.fieldId, err);
			}
		});

		await Promise.allSettled(promises);
	}
}

