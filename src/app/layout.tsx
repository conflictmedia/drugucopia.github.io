import type { Metadata } from "next";
import { Suspense } from "react";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { AlertTriangle } from "lucide-react";
import "./globals.css";
import { LayoutClient } from "@/components/layout/LayoutClient";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ['400', '500', '600', '700'],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  weight: '400',
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Drugucopia - Dose Logger and Substance Resources",
  description: "Documentation for psychoactive substances including effects, dosages, harm reduction, with a dose logger.",
  keywords: ["psychoactive", "substances", "documentation", "harm reduction", "drug information"],
  authors: [{ name: "conflictmedia @ conflict@cocaine.ninja" }],
  icons: {
    icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/logo.png`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${ibmPlexSans.className} ${ibmPlexMono.className} antialiased text-base-content`}
      >
        <LayoutClient>
          {children}
        </LayoutClient>

        {/* Global disclaimer - rendered in layout client */}
        <div className="hidden md:block fixed bottom-0 inset-x-0 z-30 bg-base-100/95 backdrop-blur-sm border-t border-warning/20">
          <div className="flex items-center justify-center gap-2 px-4 py-1.5 text-xs text-warning">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>Educational and harm reduction purposes only. Always consult medical professionals.</span>
          </div>
        </div>
      </body>
    </html>
  );
}
