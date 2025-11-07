import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export const TeamBreadcrumb: React.FC = () => {
  const router = useRouter();

  return (
    <nav className="flex items-center space-x-2 text-2xl mb-2">
      <button
        onClick={() => router.push("/dashboard")}
        className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-gray-300 rounded-md mr-2 transition-colors"
        aria-label="Go back to Dashboard"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <button
        onClick={() => router.push("/dashboard")}
        className="text-gray-500 hover:text-gray-700 font-medium"
      >
        Dashboard
      </button>
      <span className="text-gray-400">/</span>
      <span className="text-gray-800 font-semibold">Team Management</span>
    </nav>
  );
};

