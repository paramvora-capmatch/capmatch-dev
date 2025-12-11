'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useOMData } from '@/hooks/useOMData';

export function useOmContent() {
  const params = useParams();
  const projectId = params?.id as string;
  const { omData, isLoading, error } = useOMData(projectId || '');

  // Memoize content to prevent object recreation on every render
  const content = useMemo(() => {
    return omData?.content ?? {};
  }, [omData?.content]);

  return {
    projectId,
    content,
    isLoading,
    error,
  };
}

