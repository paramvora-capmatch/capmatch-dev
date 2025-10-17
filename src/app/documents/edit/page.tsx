"use client";

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { OnlyOfficeEditor } from '@/components/documents/OnlyOfficeEditor';
import { Loader2 } from 'lucide-react';

function EditorPageContent() {
    const searchParams = useSearchParams();
    const bucketId = searchParams.get('bucket');
    const filePath = searchParams.get('path');
  
    if (!bucketId || !filePath) {
      return (
        <div className="h-screen w-screen flex items-center justify-center">
          <div className="text-red-500">
            Missing required parameters (bucket or path) in URL.
          </div>
        </div>
      );
    }
  
    return <OnlyOfficeEditor bucketId={bucketId} filePath={decodeURIComponent(filePath)} />;
}

export default function DocumentEditPage() {
  return (
    <Suspense fallback={ <div className="h-screen w-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div> }>
      <EditorPageContent />
    </Suspense>
  );
}