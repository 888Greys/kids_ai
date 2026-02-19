import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kids AI",
  description: "AI learning platform for Grade 4 math"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
