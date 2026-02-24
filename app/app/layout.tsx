import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import SolanaProvider from "@/components/solana-provider";
import Navbar from "@/components/navbar";
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
  title: "Chain Vote | Governance Voting Protocol",
  description:
    "Commit-reveal Solana governance voting protocol built with Anchor",
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
      </body>
    </html>
  );
}
