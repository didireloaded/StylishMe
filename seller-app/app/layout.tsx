import type { Metadata } from "next";
import { Cormorant_Garamond, Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const editorial = Cormorant_Garamond({
  variable: "--font-editorial",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://stylishme-seller-namibia.didireloaded.chatgpt.site"),
  title: "StylishMe Seller",
  description: "A refined place for StylishMe sellers to manage collections, stock and customer orders.",
  openGraph: {
    title: "StylishMe Seller",
    description: "Your collection. Beautifully handled.",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "StylishMe Seller" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "StylishMe Seller",
    description: "Your collection. Beautifully handled.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geist.variable} ${editorial.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
