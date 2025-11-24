'use client';

import { useEffect } from 'react';
import { useOMDashboard } from '@/contexts/OMDashboardContext';

interface PageHeaderOptions {
  title?: string;
  subtitle?: string;
}

export const useOMPageHeader = (options: PageHeaderOptions) => {
  const { setPageHeader } = useOMDashboard();
  const { title, subtitle } = options;

  useEffect(() => {
    setPageHeader({
      title,
      subtitle,
    });

    return () => {
      setPageHeader({});
    };
  }, [setPageHeader, title, subtitle]);
};

