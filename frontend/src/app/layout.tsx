import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "@radix-ui/themes/styles.css";
import "./globals.css";
import { ReactQueryProvider } from "@/lib/query-client";
import { ThemeProvider } from "@/components/ThemeProvider";
import AuthInitializer from "@/components/AuthInitializer";
import NotificationStream from "@/components/NotificationStream";
import Navbar from "@/components/Navbar";
import Toaster from "@/components/Toaster";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GameLog — Social Gaming Journal",
  description: "Track your games, share with friends",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.className} text-white min-h-screen`}>
        <ReactQueryProvider>
          <ThemeProvider>
            <AuthInitializer />
            <NotificationStream />
            <Navbar />
            <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
            <Toaster />
          </ThemeProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
