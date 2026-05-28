"use client";

import { useAuth } from "@/lib/auth-context";
import FeedSection from "./_components/FeedSection";
import GlobalActivity from "./_components/GlobalActivity";
import LandingPage from "./_components/LandingPage";

export default function HomePage() {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>;

  if (!user) return <LandingPage />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <FeedSection />
      </div>
      <div>
        <GlobalActivity />
      </div>
    </div>
  );
}
