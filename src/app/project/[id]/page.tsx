// src/app/project/[id]/page.tsx
'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ProjectRedirectPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params?.id as string;
    
    useEffect(() => {
        if (projectId) {
            router.replace(`/project/workspace/${projectId}`);
        }
    }, [projectId, router]);
    
    return null; // Or a loading spinner
}