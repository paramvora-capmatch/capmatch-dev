"use client";

import { useCallback, useRef, useEffect } from "react";
import { useParams } from "next/navigation";

export interface FieldAccessData {
	fieldId: string;
	status: "available" | "missing" | "fallback";
	page: string;
	subpage?: string;
	isInsight: boolean;
	fallbackValue?: string;
}

export function useOMFieldLogger() {
	const params = useParams();
	const projectId = params?.id as string;
	const logBuffer = useRef<FieldAccessData[]>([]);
	const flushTimeout = useRef<NodeJS.Timeout | null>(null);
	// Persistent deduplication: track logged fields across buffer flushes
	const loggedFields = useRef<Set<string>>(new Set());

	// Create a unique key for deduplication
	const getLogKey = (data: FieldAccessData): string => {
		return `${data.fieldId}|${data.page}|${data.subpage || "main"}|${
			data.isInsight
		}`;
	};

	// Flush logs to backend
	const flushLogs = useCallback(async () => {
		if (logBuffer.current.length === 0 || !projectId) return;

		const logsToSend = [...logBuffer.current];
		logBuffer.current = [];

		try {
			await fetch(`/api/projects/${projectId}/om/log-field-access`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					fields: logsToSend.map((log) => ({
						...log,
						timestamp: new Date().toISOString(),
					})),
				}),
			});

			// Clear the logged fields set after successful flush
			// This allows the same field to be logged again if accessed after flush
			loggedFields.current.clear();
		} catch (error) {
			console.error("Failed to log field access:", error);
			// Re-add logs to buffer on failure (optional: could implement retry logic)
			logBuffer.current.unshift(...logsToSend);
		}
	}, [projectId]);

	// Log a field access
	const logField = useCallback(
		(data: FieldAccessData) => {
			// Only log missing or fallback fields
			if (data.status === "available") return;

			// Deduplicate: check if this exact field+page+subpage combination was already logged
			const logKey = getLogKey(data);

			// Check both in buffer and in persistent logged set
			const isDuplicateInBuffer = logBuffer.current.some(
				(existing) => getLogKey(existing) === logKey
			);
			const isDuplicatePersistent = loggedFields.current.has(logKey);

			if (isDuplicateInBuffer || isDuplicatePersistent) {
				return; // Skip duplicate
			}

			// Mark as logged
			loggedFields.current.add(logKey);
			logBuffer.current.push(data);

			// Debounce: flush after 2 seconds of inactivity, or when buffer reaches 50 items
			if (flushTimeout.current) {
				clearTimeout(flushTimeout.current);
			}

			if (logBuffer.current.length >= 50) {
				flushLogs();
			} else {
				flushTimeout.current = setTimeout(() => {
					flushLogs();
				}, 2000);
			}
		},
		[flushLogs]
	);

	// Flush on unmount
	useEffect(() => {
		return () => {
			if (flushTimeout.current) {
				clearTimeout(flushTimeout.current);
			}
			flushLogs();
		};
	}, [flushLogs]);

	return { logField };
}
