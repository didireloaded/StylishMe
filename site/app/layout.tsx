import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { PwaRegistration } from "./PwaRegistration";
import "./globals.css";
import "./seller.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b1218",
};

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    metadataBase: new URL(origin),
    applicationName: "StylishMe",
    title: "StylishMe — Fashion from Namibia",
    description: "Discover Namibian designers, shop real stock, find your fit, and track every order.",
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "StylishMe" },
    formatDetection: { telephone: false },
    icons: {
      icon: [{ url: "/icons/stylishme-192.png", sizes: "192x192", type: "image/png" }],
      apple: [{ url: "/icons/stylishme-192.png", sizes: "192x192", type: "image/png" }],
    },
    openGraph: {
      title: "StylishMe — Fashion from Namibia",
      description: "Local discovery, fit confidence and transparent delivery in one premium fashion destination.",
      type: "website",
      url: origin,
      images: [{ url: `${origin}/og.png`, width: 1672, height: 941, alt: "StylishMe premium Namibian fashion" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "StylishMe — Fashion from Namibia",
      description: "Discover local designers, confident fit guidance and clear delivery across Namibia.",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <PwaRegistration />
      </body>
    </html>
  );
}
