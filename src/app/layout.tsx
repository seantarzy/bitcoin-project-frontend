import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://whatsbitcoinsprice.com"),
  title: "What can your Bitcoin buy? · Bitcoin in real life",
  description:
    "Coffee runs or a dream getaway? Turn a hypothetical Bitcoin amount into real-life possibilities. Explore, customize and share your perspective.",
  openGraph: {
    title: "Bitcoin. But make it real life.",
    description:
      "Same bitcoin. A different kind of rich. See what your Bitcoin could buy.",
    url: "https://whatsbitcoinsprice.com/",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bitcoin. But make it real life.",
  },
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
