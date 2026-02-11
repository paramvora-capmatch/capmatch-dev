// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { ClientAppProviders } from "../components/providers/ClientAppProviders";
import { ConsoleSilencer } from "../components/utils/ConsoleSilencer";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
const ogImageUrl = siteUrl ? `${siteUrl.replace(/\/$/, "")}/small_logo.jpg` : "/small_logo.jpg";

export const metadata: Metadata = {
	title: "CapMatch | Lender Matching Platform",
	description:
		"Connect with the right lenders for your commercial real estate projects",
	icons: {
		icon: "/small_logo.jpg",
		shortcut: "/small_logo.jpg",
		apple: "/small_logo.jpg",
	},
	openGraph: {
		title: "CapMatch | Lender Matching Platform",
		description:
			"Connect with the right lenders for your commercial real estate projects",
		url: siteUrl || undefined,
		siteName: "CapMatch",
		images: [
			{
				url: ogImageUrl,
				width: 512,
				height: 512,
				alt: "CapMatch – Connect real estate with capital",
			},
		],
		type: "website",
	},
	twitter: {
		card: "summary",
		title: "CapMatch | Lender Matching Platform",
		description:
			"Connect with the right lenders for your commercial real estate projects",
		images: [ogImageUrl],
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className="antialiased font-sans">
				{/* Silence dev console noise in production browser builds */}
				<ConsoleSilencer />
				<ClientAppProviders>{children}</ClientAppProviders>
			</body>
		</html>
	);
}
