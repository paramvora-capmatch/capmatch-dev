"use client";

import React, { createContext, useContext, ReactNode } from "react";

// Type matching the return type from useOMData
export interface OMData {
	id: string;
	project_id: string;
	content: Record<string, any>;
	insights: Record<string, any>;
	insights_metadata: {
		resume_version_id: string | null;
		generated_at: string | null;
	} | null;
	created_at: string;
	updated_at: string;
}

interface OMDataContextType {
	omData: OMData | null;
	isLoading: boolean;
	error: Error | null;
}

const OMDataContext = createContext<OMDataContextType | undefined>(undefined);

interface OMDataProviderProps {
	children: ReactNode;
	omData: OMData | null;
	isLoading: boolean;
	error: Error | null;
}

export const OMDataProvider: React.FC<OMDataProviderProps> = ({
	children,
	omData,
	isLoading,
	error,
}) => {
	return (
		<OMDataContext.Provider value={{ omData, isLoading, error }}>
			{children}
		</OMDataContext.Provider>
	);
};

export const useOMDataContext = (): OMDataContextType => {
	const context = useContext(OMDataContext);
	if (context === undefined) {
		throw new Error(
			"useOMDataContext must be used within an OMDataProvider"
		);
	}
	return context;
};
