import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "What's Bitcoin's Price?",
  description:
    "A one stop shop for all things Bitcoin. What's the price now? What's the price in the past? What's the price in the future? What's the price in the past? What're the trends?"
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
