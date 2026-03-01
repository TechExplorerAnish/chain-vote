import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import SolanaProvider from "@/components/solana-provider";
import Navbar from "@/components/navbar";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://chain-vote.vercel.app'),
  title: {
    default: "Chain Vote | Decentralized Governance Voting Protocol",
    template: "%s | Chain Vote",
  },
  description:
    "Secure blockchain-based governance voting protocol with commit-reveal privacy. Built on Solana with Anchor framework for transparent, tamper-proof elections and multisig governance.",
  keywords: [
    "blockchain voting",
    "Solana governance",
    "commit-reveal voting",
    "decentralized voting",
    "on-chain governance",
    "Anchor framework",
    "multisig governance",
    "transparent voting",
    "Web3 governance",
    "cryptographic voting",
  ],
  authors: [{ name: "Chain Vote Team" }],
  creator: "Chain Vote",
  publisher: "Chain Vote",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "Chain Vote | Decentralized Governance Voting Protocol",
    description:
      "Secure blockchain-based governance voting protocol with commit-reveal privacy. Built on Solana with Anchor framework for transparent, tamper-proof elections.",
    siteName: "Chain Vote",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Chain Vote - Decentralized Governance Voting Protocol",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Chain Vote | Decentralized Governance Voting Protocol",
    description:
      "Secure blockchain voting with commit-reveal privacy on Solana. Transparent, tamper-proof governance elections.",
    images: ["/og-image.png"],
    creator: "@chainvote",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SolanaProvider>
          <Navbar />
          <main className="min-h-[calc(100dvh-3.5rem)]">{children}</main>
          <Toaster richColors closeButton />
        </SolanaProvider>
        <Analytics />
      </body>
    </html>
  );
}
