import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "What's Bitcoin's Price?",
  description: "Check Bitcoin prices in your currency and explore the last 30 days of daily closing prices, with clear historical comparisons.",
  openGraph: {
    title: "What's Bitcoin's Price?",
    description: "Bitcoin prices and 30-day historical comparisons.",
    url: "https://whatsbitcoinsprice.com/",
    type: "website"
  }

};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
