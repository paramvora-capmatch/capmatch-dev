// src/components/utils/ConsoleSilencer.tsx
"use client";

import { useEffect } from "react";

/**
 * Silences noisy console methods in the **browser** when running
 * a production build. This ensures end users do not see
 * development logs, while developers keep full logs in dev.
 *
 * - In development: does nothing.
 * - In production: no-ops console.log/info/debug.
 *   (console.warn/error are kept so real issues are still visible.)
 */
export function ConsoleSilencer() {
	useEffect(() => {
		// Only run in the browser
		if (typeof window === "undefined") return;

		// Only silence logs in production builds
		if (process.env.NODE_ENV !== "production") return;

		const originalLog = console.log;
		const originalInfo = console.info;
		const originalDebug = console.debug;

		console.log = () => {};
		console.info = () => {};
		console.debug = () => {};

		// Cleanup on hot-reload / unmount (mainly for dev safety)
		return () => {
			console.log = originalLog;
			console.info = originalInfo;
			console.debug = originalDebug;
		};
	}, []);

	return null;
}


