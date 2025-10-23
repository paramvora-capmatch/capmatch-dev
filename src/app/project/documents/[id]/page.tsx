// src/app/project/documents/[id]/page.tsx
'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ProjectDocumentsRedirectPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params?.id as string;
    
    useEffect(() => {
        if (projectId) {
            // Redirect to the workspace, where documents are now managed
            router.replace(`/project/workspace/${projectId}`);
        }
    }, [projectId, router]);
    
    return null; // Or a loading spinner
}