"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Navbar from "@/components/Navbar";
import AIChatbox from "@/components/AIChatbox";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  // Landing page: navbar + full-width children (no max-w container)
  const isLanding = pathname === "/" && !user;

  return (
    <>
      <Navbar />
      {isLanding ? (
        <>{children}</>
      ) : (
        <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
      )}
      {!isLanding && <AIChatbox />}
    </>
  );
}
