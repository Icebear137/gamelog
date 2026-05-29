"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, Save } from "lucide-react";
import { Text, Heading, Flex } from "@radix-ui/themes";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { dispatchToast } from "@/lib/toast";
import { User } from "@/lib/types";

export function EmailSection({ user }: { user: User }) {
  const { login, token } = useAuth();
  const qc = useQueryClient();
  const [emailNotifications, setEmailNotifications] = useState((user as any).emailNotifications ?? true);

  useEffect(() => {
    setEmailNotifications((user as any).emailNotifications ?? true);
  }, [(user as any).emailNotifications]);

  const mutation = useMutation({
    mutationFn: () => api.patch("/api/users/me", { emailNotifications }),
    onSuccess: (res) => {
      login(token!, { ...user, ...res.data });
      qc.invalidateQueries({ queryKey: ["profile", user.username] });
      dispatchToast("Email preferences saved", "success");
    },
    onError: (err: any) => {
      dispatchToast(err?.response?.data?.error ?? "Failed to save preferences", "error");
    },
  });

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl p-6">
      <Heading size="4" as="h2" className="mb-4">
        <Flex align="center" gap="2">
          <Mail size={18} />
          Email Notifications
        </Flex>
      </Heading>
      <Flex align="center" justify="between" gap="4">
        <div>
          <Text as="p" size="2" color="gray" className="font-medium">Weekly Digest</Text>
          <Text as="p" size="1" color="gray" className="mt-0.5">
            Receive a weekly summary of your activity — new followers, likes, comments, and feed highlights.
          </Text>
        </div>
        <button
          role="switch"
          aria-checked={emailNotifications}
          onClick={() => setEmailNotifications((v: boolean) => !v)}
          className={`relative w-11 h-6 rounded-full transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${emailNotifications ? "bg-violet-600" : "bg-gray-700"}`}
        >
          <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${emailNotifications ? "translate-x-5" : "translate-x-0"}`} />
        </button>
      </Flex>
      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="mt-4 flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        <Save size={15} />
        {mutation.isPending ? "Saving..." : "Save Preferences"}
      </button>
    </div>
  );
}
