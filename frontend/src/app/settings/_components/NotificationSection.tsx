"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, UserPlus, Heart, MessageCircle, AtSign, Save } from "lucide-react";
import { Text, Heading, Flex } from "@radix-ui/themes";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { dispatchToast } from "@/lib/toast";
import type { AuthUser } from "@/lib/stores/auth";

const NOTIF_SETTINGS = [
  {
    key: "notifFollow" as const,
    icon: <UserPlus size={15} className="text-violet-400 shrink-0" />,
    label: "New follower",
    desc: "When someone follows you",
  },
  {
    key: "notifLike" as const,
    icon: <Heart size={15} className="text-red-400 shrink-0" />,
    label: "Likes",
    desc: "When someone likes your activity",
  },
  {
    key: "notifComment" as const,
    icon: <MessageCircle size={15} className="text-blue-400 shrink-0" />,
    label: "Comments",
    desc: "When someone comments on your activity",
  },
  {
    key: "notifMention" as const,
    icon: <AtSign size={15} className="text-green-400 shrink-0" />,
    label: "Mentions",
    desc: "When someone mentions you in a comment",
  },
];

type NotifKey = "notifFollow" | "notifLike" | "notifComment" | "notifMention";

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${checked ? "bg-violet-600" : "bg-gray-700"}`}
    >
      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

export function NotificationSection({ user }: { user: AuthUser }) {
  const { login, token } = useAuth();
  const qc = useQueryClient();

  const [prefs, setPrefs] = useState<Record<NotifKey, boolean>>({
    notifFollow:  user.notifFollow  ?? true,
    notifLike:    user.notifLike    ?? true,
    notifComment: user.notifComment ?? true,
    notifMention: user.notifMention ?? true,
  });

  useEffect(() => {
    setPrefs({
      notifFollow:  user.notifFollow  ?? true,
      notifLike:    user.notifLike    ?? true,
      notifComment: user.notifComment ?? true,
      notifMention: user.notifMention ?? true,
    });
  }, [user.notifFollow, user.notifLike, user.notifComment, user.notifMention]);

  const mutation = useMutation({
    mutationFn: () => api.patch("/api/users/me", prefs),
    onSuccess: (res) => {
      login(token!, { ...user, ...res.data });
      qc.invalidateQueries({ queryKey: ["profile", user.username] });
      dispatchToast("Notification preferences saved", "success");
    },
    onError: (err: any) => {
      dispatchToast(err?.response?.data?.error ?? "Failed to save preferences", "error");
    },
  });

  function toggle(key: NotifKey) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl p-6">
      <Heading size="4" as="h2" className="mb-5">
        <Flex align="center" gap="2">
          <Bell size={18} />
          Notification Preferences
        </Flex>
      </Heading>

      <div className="flex flex-col gap-4">
        {NOTIF_SETTINGS.map(({ key, icon, label, desc }) => (
          <Flex key={key} align="center" justify="between" gap="4">
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5">{icon}</div>
              <div>
                <Text as="p" size="2" className="font-medium text-white">{label}</Text>
                <Text as="p" size="1" color="gray" className="mt-0.5">{desc}</Text>
              </div>
            </div>
            <Toggle checked={prefs[key]} onChange={() => toggle(key)} />
          </Flex>
        ))}
      </div>

      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="mt-5 flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        <Save size={15} />
        {mutation.isPending ? "Saving..." : "Save Preferences"}
      </button>
    </div>
  );
}
