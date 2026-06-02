"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Heading, Flex } from "@radix-ui/themes";
import { useAuth } from "@/lib/auth-context";
import { ProfileSection } from "./_components/ProfileSection";
import { PasswordSection } from "./_components/PasswordSection";
import { PrivacySection } from "./_components/PrivacySection";
import { EmailSection } from "./_components/EmailSection";
import { NotificationSection } from "./_components/NotificationSection";
import { DeleteAccountDialog } from "./_components/DeleteAccountDialog";

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  if (loading || !user) return null;

  return (
    <div className="max-w-xl mx-auto">
      <Heading size="6" className="mb-6">Settings</Heading>
      <Flex direction="column" gap="6">
        <ProfileSection user={user} />
        <PasswordSection />
        <PrivacySection user={user} />
        <NotificationSection user={user} />
        <EmailSection user={user} />
        <DeleteAccountDialog />
      </Flex>
    </div>
  );
}
