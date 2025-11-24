'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

type Scenario = 'base' | 'upside' | 'downside';
type PageHeaderConfig = {
    title?: string;
    subtitle?: string;
};

interface OMDashboardContextType {
    scenario: Scenario;
    setScenario: (scenario: Scenario) => void;
    pageHeader: PageHeaderConfig;
    setPageHeader: (config: PageHeaderConfig) => void;
}

const OMDashboardContext = createContext<OMDashboardContextType | undefined>(undefined);

interface OMDashboardProviderProps {
    children: ReactNode;
}

export const OMDashboardProvider: React.FC<OMDashboardProviderProps> = ({ children }) => {
    const [scenario, setScenario] = useState<Scenario>('base');
    const [pageHeader, setPageHeaderState] = useState<PageHeaderConfig>({});

    const setPageHeader = useCallback((config: PageHeaderConfig) => {
        setPageHeaderState(config);
    }, []);

    return (
        <OMDashboardContext.Provider value={{ scenario, setScenario, pageHeader, setPageHeader }}>
            {children}
        </OMDashboardContext.Provider>
    );
};

export const useOMDashboard = (): OMDashboardContextType => {
    const context = useContext(OMDashboardContext);
    if (context === undefined) {
        throw new Error('useOMDashboard must be used within an OMDashboardProvider');
    }
    return context;
}; 