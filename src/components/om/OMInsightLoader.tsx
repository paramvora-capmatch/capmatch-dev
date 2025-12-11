export function OMInsightLoader({ isGenerating }: { isGenerating: boolean }) {
  if (!isGenerating) return null;
  
  return (
    <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
      <div className="flex items-center gap-2">
        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
        <span>Generating AI insights...</span>
      </div>
    </div>
  );
}

