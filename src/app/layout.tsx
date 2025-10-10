// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import { ClientAppProviders } from "../components/providers/ClientAppProviders";

const inter = Inter({
	variable: "--font-sans",
	subsets: ["latin"],
});

const manrope = Manrope({
	variable: "--font-display",
	subsets: ["latin"],
});

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
			<body
				className={`${inter.variable} ${manrope.variable} antialiased`}
			>
				<ClientAppProviders>{children}</ClientAppProviders>
			</body>
		</html>
	);
}
