// src/app/documents/page.tsx
"use client";

import React from "react";
import { RoleBasedRoute } from "../../components/auth/RoleBasedRoute";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { useAuth } from '@/hooks/useAuth';
import { DocumentManager } from "@/components/documents/DocumentManager";
import { Loader2 } from "lucide-react";

export default function DocumentsPage() {
	const { user, isLoading } = useAuth();

	return (
		<RoleBasedRoute roles={["borrower"]}>
			<DashboardLayout title="My Documents">
				{isLoading || !user ? (
					<div className="flex justify-center items-center h-64">
						<Loader2 className="h-8 w-8 animate-spin text-blue-600" />
					</div>
				) : (
					<>
						<div className="mb-6 p-4 bg-white rounded shadow-sm border">
							<p className="text-gray-600">
								Manage documents related to you as a borrower, such as Personal Financial Statements (PFS), Schedule of Real Estate Owned (SREO), and entity documents. These documents can be used across multiple projects.
							</p>
						</div>
						<DocumentManager
							projectId={null}
							resourceId="BORROWER_ROOT"
							title="General Borrower Documents"
						/>
					</>
				)}
			</DashboardLayout>
		</RoleBasedRoute>
	);
}