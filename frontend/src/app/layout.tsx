import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "@radix-ui/themes/styles.css";
import "./globals.css";
import { ReactQueryProvider } from "@/lib/query-client";
import { ThemeProvider } from "@/components/ThemeProvider";
import AuthInitializer from "@/components/AuthInitializer";
import NotificationStream from "@/components/NotificationStream";
import Toaster from "@/components/Toaster";
import { ClientLayout } from "./_components/ClientLayout";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GameLog — Social Gaming Journal",
  description: "Track your games, share with friends",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${geist.className} text-white min-h-screen`}>
        <ReactQueryProvider>
          <ThemeProvider>
            <AuthInitializer />
            <NotificationStream />
            <ClientLayout>{children}</ClientLayout>
            <Toaster />
          </ThemeProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
