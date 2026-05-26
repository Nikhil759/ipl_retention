import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Release or Retain | IPL 2026",
  description: "Swipe to vote — should IPL teams retain or release their players?",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
