import type { Metadata } from "next";
import localFont from "next/font/local";
import "@fontsource-variable/inter";
import "./globals.css";
import { getActiveProfile } from "@/lib/profile-session";
import { AppProviders } from "@/components/AppProviders";
import { Header } from "@/components/Header";
import { TabBar } from "@/components/TabBar";
import { Sidebar } from "@/components/Sidebar";

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
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const profile = await getActiveProfile();

  return (
    <html lang="en">
      <body className={jetbrainsMono.variable}>
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
