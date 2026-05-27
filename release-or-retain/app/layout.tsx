import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Release or Retain | IPL 2026",
  description: "Swipe to vote — should IPL teams retain or release their players?",
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
    <html lang="en" style={{ backgroundColor: "#080C18" }}>
      <body className="overflow-x-hidden bg-transparent">{children}</body>
    </html>
  );
}
