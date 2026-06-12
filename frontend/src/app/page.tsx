"use client";

import { useAuth } from "@/lib/auth-context";
import FeedSection from "./_components/FeedSection";
import GlobalActivity from "./_components/GlobalActivity";
import LandingPage from "./_components/LandingPage";
import NewAndUpcoming from "./_components/NewAndUpcoming";

export default function HomePage() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="hm-loader" style={{ paddingTop: 80 }}>
      <div
        style={{
          width: 24, height: 24, borderRadius: "50%",
          border: "2px solid rgba(124,58,237,0.2)",
          borderTopColor: "#7C3AED",
          animation: "spin 0.8s linear infinite",
        }}
      />
    </div>
  );

  if (!user) return <LandingPage />;

  return (
    <div className="flex flex-col gap-5">
      {/* Game discovery strip */}
      <NewAndUpcoming />

      {/* Main two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Feed — 2/3 width */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <FeedSection />
        </div>

        {/* Global Pulse sidebar — 1/3 width */}
        <div className="lg:col-span-1">
          <GlobalActivity />
        </div>
      </div>
    </div>
  );
}
