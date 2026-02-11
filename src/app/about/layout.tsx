import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "About Us | CapMatch",
	description:
		"CapMatch vertically integrates the CRE debt lifecycle into a single, AI-native operating company. Meet our leadership team and learn why we compete on outcomes, not licenses.",
};

export default function AboutLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <>{children}</>;
}
