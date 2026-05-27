import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { displayFont } from "@/lib/fonts";
import TrackVisit from "@/components/TrackVisit";

export const metadata: Metadata = {
  title: "Release or Retain | IPL 2026",
  description: "Swipe to vote — should IPL teams retain or release their players?",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={displayFont.variable} style={{ backgroundColor: "#080C18" }}>
      <body className="overflow-x-hidden bg-transparent">
        <Suspense fallback={null}>
          <TrackVisit />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
