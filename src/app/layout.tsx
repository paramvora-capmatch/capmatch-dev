// src/app/layout.tsx
import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { ClientAppProviders } from "../components/providers/ClientAppProviders";

const poppins = Poppins({
	variable: "--font-sans",
	subsets: ["latin"],
	weight: ["400", "500", "600", "700"],
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
			className={`${poppins.variable} antialiased`}
		>
				<ClientAppProviders>{children}</ClientAppProviders>
			</body>
		</html>
	);
}
