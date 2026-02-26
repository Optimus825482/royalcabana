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
  title: "Royal Cabana",
  description: "Royal Cabana Yönetim Sistemi",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Royal Cabana",
  },
  icons: {
    icon: [
      { url: "/icons/Icon-32.png", sizes: "32x32" },
      { url: "/icons/Icon-96.png", sizes: "96x96" },
      { url: "/icons/Icon-192.png", sizes: "192x192" },
    ],
    apple: [
      { url: "/icons/Icon-180.png", sizes: "180x180" },
      { url: "/icons/Icon-152.png", sizes: "152x152" },
      { url: "/icons/Icon-120.png", sizes: "120x120" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <head>
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/icons/Icon-180.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="152x152"
          href="/icons/Icon-152.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="120x120"
          href="/icons/Icon-120.png"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
