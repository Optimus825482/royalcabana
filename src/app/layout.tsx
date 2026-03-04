import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WebVitalsReporter } from "@/components/WebVitalsReporter";
import PWAInstallPrompt from "@/components/shared/PWAInstallPrompt";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const viewport: Viewport = {
  themeColor: "#f59e0b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="tr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <WebVitalsReporter />
        <PWAInstallPrompt />
        <script
          suppressHydrationWarning
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function() {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
