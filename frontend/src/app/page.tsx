"use client";

import { useAuth } from "@/lib/auth-context";
import { Text, Flex } from "@radix-ui/themes";
import FeedSection from "./_components/FeedSection";
import GlobalActivity from "./_components/GlobalActivity";
import LandingPage from "./_components/LandingPage";
import NewAndUpcoming from "./_components/NewAndUpcoming";

export default function HomePage() {
  const { user, loading } = useAuth();

  if (loading) return (
    <Flex align="center" justify="center" className="h-64">
      <Text size="2" color="gray">Loading...</Text>
    </Flex>
  );

  if (!user) return <LandingPage />;

  return (
    <div className="space-y-6">
      <NewAndUpcoming />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <FeedSection />
        </div>
        <div className="lg:col-span-2">
          <GlobalActivity />
        </div>
      </div>
    </div>
  );
}
