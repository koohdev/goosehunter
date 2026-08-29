import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Goose Hunter - Motion-Controlled Web Arcade Game",
  description: "Cross-device arcade shooter powered by smartphone motion gyroscope and WebSockets.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-black antialiased" suppressHydrationWarning>
      <head>
        {/* High priority preload for the arena background */}
        <link rel="preload" as="image" href="/images/background.png" fetchPriority="high" />
        <link rel="preload" as="image" href="/images/background-4.png" />
        <link rel="preload" as="image" href="/images/background-selection-4.png" />
        <link rel="preload" as="image" href="/images/bullet.png" />
        <link rel="preload" as="image" href="/images/crosshair062.png" />
      </head>
      <body
        className="min-h-full flex flex-col bg-zinc-950 text-white selection:bg-emerald-500 selection:text-black"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
