// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { ClientAppProviders } from "../components/providers/ClientAppProviders";
import { ConsoleSilencer } from "../components/utils/ConsoleSilencer";

export const metadata: Metadata = {
	title: "CapMatch | Lender Matching Platform",
	description:
		"Connect with the right lenders for your commercial real estate projects",
	icons: {
		icon: "/CapMatchLogo.png",
		shortcut: "/CapMatchLogo.png",
		apple: "/CapMatchLogo.png",
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
