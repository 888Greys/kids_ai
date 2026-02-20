import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";

const fontDisplay = Fredoka({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

const fontBody = Nunito({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "BrightPath - AI Math Adventure for Kids",
  description:
    "Your AI buddy Milo makes learning math feel like a game. Practice Grade 4 Math with adaptive AI questions, hints, and rewards.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fontDisplay.variable} ${fontBody.variable}`}>
      <body>{children}</body>
    </html>
  );
}
