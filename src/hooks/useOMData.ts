// src/hooks/useOMData.ts
import { useState, useEffect } from 'react';
import { getLatestOM, getOMValue } from '@/lib/om-queries';

export function useOMData(projectId: string) {
  const [omData, setOmData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchOMData() {
      try {
        setIsLoading(true);
        const data = await getLatestOM(projectId);
        if (mounted) {
          setOmData(data);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
          setOmData(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    if (projectId) {
      fetchOMData();
    }

    return () => {
      mounted = false;
    };
  }, [projectId]);

  return { omData, isLoading, error, getOMValue };
}

