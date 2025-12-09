'use client';

import { useParams } from 'next/navigation';
import { useOMData } from '@/hooks/useOMData';

export function useOmContent() {
  const params = useParams();
  const projectId = params?.id as string;
  const { omData, isLoading, error } = useOMData(projectId || '');

  return {
    projectId,
    content: omData?.content ?? {},
    isLoading,
    error,
  };
}

