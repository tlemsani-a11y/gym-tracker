import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "@fontsource-variable/inter";
import "./globals.css";
import { getActiveProfile } from "@/lib/profile-session";
import { AppProviders } from "@/components/AppProviders";
import { Header } from "@/components/Header";
import { TabBar } from "@/components/TabBar";
import { Sidebar } from "@/components/Sidebar";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const jetbrainsMono = localFont({
  src: [
    { path: "../fonts/jetbrainsmono-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/jetbrainsmono-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gym Tracker",
  description: "Offline-friendly gym tracker: programs, sessions, PRs, plate calculator.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Gym Tracker",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const profile = await getActiveProfile();

  return (
    <html lang="en">
      <body className={jetbrainsMono.variable}>
        <ServiceWorkerRegister />
        <AppProviders>
          <div className="app-shell">
            <Sidebar profileName={profile.name} />
            <div className="content-area">
              <Header profileName={profile.name} />
              <main id="app">{children}</main>
            </div>
          </div>
          <TabBar />
        </AppProviders>
      </body>
    </html>
  );
}
