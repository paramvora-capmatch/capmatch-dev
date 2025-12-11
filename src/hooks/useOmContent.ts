'use client';

import { useParams } from 'next/navigation';
import { useOMDataContext } from '@/contexts/OMDataContext';

export function useOmContent() {
  const params = useParams();
  const projectId = params?.id as string;
  // Consume OM data from context instead of fetching independently
  const { omData, isLoading, error } = useOMDataContext();

  return {
    projectId,
    content: omData?.content ?? {},
    insights: omData?.insights ?? {},
    insights_metadata: omData?.insights_metadata ?? null,
    isLoading,
    error,
  };
}

