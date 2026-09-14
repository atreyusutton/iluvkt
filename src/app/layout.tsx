import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { Nav } from "@/components/nav";
import { RecordingProvider } from "@/components/recording-provider";
import { SessionPill } from "@/components/session-pill";
import { TimezoneSync } from "@/components/timezone-sync";
import { isPasswordProtected } from "@/lib/auth";
import { getServiceStatus } from "@/lib/services";
import { getTimezone } from "@/lib/timezone";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "iluvkt · guitar practice", template: "%s · iluvkt" },
  description: "Learning guitar, 30 minutes a day.",
  appleWebApp: { capable: true, title: "iluvkt", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf6ef" },
    { media: "(prefers-color-scheme: dark)", color: "#17120e" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const timezone = await getTimezone();
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} antialiased`}>
      <body className="min-h-dvh font-sans">
        <TimezoneSync serverTimezone={timezone} />
        <RecordingProvider backend={getServiceStatus().recordings}>
          <div className="flex min-h-dvh">
            <Nav passwordProtected={isPasswordProtected()} />
            <main className="min-w-0 flex-1 px-4 pb-28 pt-20 md:px-10 md:pb-12 md:pt-10">
              <div className="mx-auto max-w-6xl">{children}</div>
            </main>
          </div>
          <SessionPill floating />
        </RecordingProvider>
      </body>
    </html>
  );
}
