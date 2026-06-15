"use client";

import { useAuth } from "@/lib/auth-context";
import LeftSidebar from "./_components/home/LeftSidebar";
import RightSidebar from "./_components/home/RightSidebar";
import TrendingSection from "./_components/home/TrendingSection";
import SocialFeed from "./_components/home/SocialFeed";
import LandingPage from "./_components/LandingPage";

export default function HomePage() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "calc(100vh - 64px)" }}>
      <div style={{
        width: 24, height: 24, borderRadius: "50%",
        border: "2px solid var(--gx-amber-dim)",
        borderTopColor: "var(--gx-amber)",
        animation: "spin 0.8s linear infinite",
      }} />
    </div>
  );

  if (!user) return <LandingPage />;

  return (
    <div className="w-full max-w-full bg-gx-navy">
      <div className="grid grid-cols-[240px_1fr_300px] w-full max-w-full m-0 items-start min-h-[calc(100vh-64px)] max-[1200px]:grid-cols-[200px_1fr_260px] max-[1024px]:grid-cols-[200px_1fr] max-[768px]:grid-cols-1">

        {/* ── Left Sidebar: profile + nav ── */}
        <aside className="sticky top-16 max-h-[calc(100vh-64px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gx-border scrollbar-track-transparent flex flex-col gap-1 py-5 px-3.5 border-r border-gx-border [&::-webkit-scrollbar]:w-0.75 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gx-border [&::-webkit-scrollbar-thumb]:rounded-xs max-[768px]:hidden">
          <LeftSidebar />
        </aside>

        {/* ── Center: discovery + feed + recommendations ── */}
        <main className="py-5 px-6 flex flex-col gap-7 min-w-0">
          <TrendingSection />
          <SocialFeed />
        </main>

        {/* ── Right Sidebar: live pulse + people + tags ── */}
        <aside className="sticky top-16 max-h-[calc(100vh-64px)] overflow-y-auto scrollbar-thin flex flex-col gap-1 py-5 px-3.5 border-l border-gx-border [&::-webkit-scrollbar]:w-0.75 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gx-border [&::-webkit-scrollbar-thumb]:rounded-xs max-[1024px]:hidden">
          <RightSidebar />
        </aside>

      </div>
    </div>
  );
}
