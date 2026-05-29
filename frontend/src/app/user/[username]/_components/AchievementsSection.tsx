"use client";

import { useQuery } from "@tanstack/react-query";
import { Text, Flex } from "@radix-ui/themes";
import { api } from "@/lib/api";
import { formatDistanceToNow } from "@/lib/utils";

interface Achievement {
  type: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt: string | null;
}

interface Props {
  username: string;
  isMe: boolean;
}

export default function AchievementsSection({ username, isMe }: Props) {
  const { data: achievements = [], isLoading } = useQuery<Achievement[]>({
    queryKey: isMe ? ["achievements-me"] : ["achievements", username],
    queryFn: () =>
      isMe
        ? api.get("/api/users/me/achievements").then((r) => r.data)
        : api.get(`/api/users/${username}/achievements`).then((r) => r.data),
    staleTime: 60_000,
  });

  const earned = achievements.filter((a) => a.earned);
  const locked = achievements.filter((a) => !a.earned);

  if (isLoading) return null;
  if (achievements.length === 0) return null;

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl p-5">
      <Flex align="center" justify="between" className="mb-4">
        <Text size="3" weight="bold">🏆 Achievements</Text>
        <Text as="span" size="1" color="gray">
          {earned.length}/{achievements.length} earned
        </Text>
      </Flex>

      {earned.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
          {earned.map((a) => (
            <AchievementBadge key={a.type} achievement={a} />
          ))}
        </div>
      )}

      {isMe && locked.length > 0 && (
        <>
          {earned.length > 0 && <div className="h-px bg-white/8 mb-3" />}
          <Text as="p" size="1" color="gray" className="mb-2">Locked</Text>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {locked.map((a) => (
              <AchievementBadge key={a.type} achievement={a} locked />
            ))}
          </div>
        </>
      )}

      {earned.length === 0 && !isMe && (
        <Text as="p" size="2" color="gray" className="text-center py-4">No achievements yet.</Text>
      )}
    </div>
  );
}

function AchievementBadge({
  achievement,
  locked = false,
}: {
  achievement: Achievement;
  locked?: boolean;
}) {
  return (
    <div
      title={`${achievement.description}${achievement.earnedAt ? `\nEarned ${formatDistanceToNow(achievement.earnedAt)} ago` : ""}`}
      className={`flex items-center gap-2 rounded-xl px-3 py-2 border transition-colors ${
        locked
          ? "bg-white/8/30 border-white/8 opacity-40"
          : "bg-white/8 border-white/15"
      }`}
    >
      <span className="text-lg leading-none shrink-0">{locked ? "🔒" : achievement.icon}</span>
      <div className="min-w-0">
        <Text as="p" size="1" weight="bold" className={`truncate ${locked ? "text-gray-500" : "text-white"}`}>
          {achievement.name}
        </Text>
        <Text as="p" size="1" className={`truncate ${locked ? "text-gray-700" : "text-gray-500"}`}>
          {achievement.description}
        </Text>
      </div>
    </div>
  );
}
