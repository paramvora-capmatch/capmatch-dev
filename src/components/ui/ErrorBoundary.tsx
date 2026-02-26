"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
	children: ReactNode;
	/** Section name for the fallback message */
	sectionName?: string;
	/** Optional custom fallback UI */
	fallback?: ReactNode;
	/** Called when an error is caught (e.g. for logging) */
	onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

/**
 * Error boundary to catch render errors in child components and show a fallback
 * instead of crashing the whole page. Use around major UI sections (e.g. form, chat, documents).
 */
export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
		this.props.onError?.(error, errorInfo);
	}

	render(): ReactNode {
		if (this.state.hasError && this.state.error) {
			if (this.props.fallback) {
				return this.props.fallback;
			}
			const section = this.props.sectionName ?? "This section";
			return (
				<div
					className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 p-4 text-red-800 dark:text-red-200"
					role="alert"
				>
					<p className="font-medium">{section} failed to load.</p>
					<p className="mt-1 text-sm opacity-90">
						{this.state.error.message}
					</p>
					<button
						type="button"
						onClick={() =>
							this.setState({ hasError: false, error: null })
						}
						className="mt-3 text-sm font-medium underline focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
					>
						Try again
					</button>
				</div>
			);
		}
		return this.props.children;
	}
}
