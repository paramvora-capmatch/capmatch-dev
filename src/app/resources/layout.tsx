import React from "react";
import ResourcesLayoutWrapper from "@/components/layout/ResourcesLayoutWrapper";

export default function ResourcesLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <ResourcesLayoutWrapper>{children}</ResourcesLayoutWrapper>;
}
