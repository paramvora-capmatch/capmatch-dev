import React from "react";
import CaseStudyLayoutWrapper from "@/components/layout/CaseStudyLayoutWrapper";

export default function CaseStudiesLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <CaseStudyLayoutWrapper>{children}</CaseStudyLayoutWrapper>;
}
