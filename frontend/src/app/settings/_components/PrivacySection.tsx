"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Lock, Save } from "lucide-react";
import { Text, Heading, Flex } from "@radix-ui/themes";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { dispatchToast } from "@/lib/toast";
import type { AuthUser } from "@/lib/stores/auth";

export function PrivacySection({ user }: { user: AuthUser }) {
  const { login, token } = useAuth();
  const qc = useQueryClient();
  const [isPrivate, setIsPrivate] = useState(user.isPrivate ?? false);

  useEffect(() => { setIsPrivate(user.isPrivate ?? false); }, [user.isPrivate]);

  const mutation = useMutation({
    mutationFn: () => api.patch("/api/users/me", { isPrivate }),
    onSuccess: (res) => {
      login(token!, { ...user, ...res.data });
      qc.invalidateQueries({ queryKey: ["profile", user.username] });
      setIsPrivate(res.data.isPrivate ?? false);
      dispatchToast("Privacy settings saved", "success");
    },
    onError: (err: any) => {
      dispatchToast(err?.response?.data?.error ?? "Failed to save privacy settings", "error");
    },
  });

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl p-6">
      <Heading size="4" as="h2" className="mb-4">
        <Flex align="center" gap="2">
          <Lock size={18} />
          Privacy
        </Flex>
      </Heading>
      <Flex align="center" justify="between" gap="4">
        <div>
          <Text as="p" size="2" color="gray" className="font-medium">Private Profile</Text>
          <Text as="p" size="1" color="gray" className="mt-0.5">
            Only your followers can see your library and activity. Your profile and username remain public.
          </Text>
        </div>
        <button
          role="switch"
          aria-checked={isPrivate}
          onClick={() => setIsPrivate((v) => !v)}
          className={`relative w-11 h-6 rounded-full transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${isPrivate ? "bg-violet-600" : "bg-gray-700"}`}
        >
          <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isPrivate ? "translate-x-5" : "translate-x-0"}`} />
        </button>
      </Flex>
      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="mt-4 flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        <Save size={15} />
        {mutation.isPending ? "Saving..." : "Save Privacy"}
      </button>
    </div>
  );
}
