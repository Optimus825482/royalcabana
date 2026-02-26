import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#f59e0b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "Royal Cabana",
    template: "%s | Royal Cabana",
  },
  description: "Royal Cabana Yönetim Sistemi",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Royal Cabana",
  },
  icons: {
    icon: [
      { url: "/logo.ico", sizes: "any" },
      { url: "/icons/Icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/Icon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/Icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icons/Icon-180.png", sizes: "180x180", type: "image/png" },
      { url: "/icons/Icon-152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/Icon-120.png", sizes: "120x120", type: "image/png" },
    ],
    shortcut: "/icons/Icon-96.png",
  },
  openGraph: {
    title: "Royal Cabana",
    description: "Royal Cabana Yönetim Sistemi",
    siteName: "Royal Cabana",
    url: "https://royalcabana.erkanerdem.net",
    locale: "tr_TR",
    type: "website",
    images: [
      {
        url: "https://royalcabana.erkanerdem.net/logo.png",
        width: 1088,
        height: 960,
        alt: "Royal Cabana Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Royal Cabana",
    description: "Royal Cabana Yönetim Sistemi",
    images: ["https://royalcabana.erkanerdem.net/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
