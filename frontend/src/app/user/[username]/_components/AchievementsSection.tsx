"use client";

import { useQuery } from "@tanstack/react-query";
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold flex items-center gap-2">
          🏆 Achievements
        </h2>
        <span className="text-xs text-gray-500">
          {earned.length}/{achievements.length} earned
        </span>
      </div>

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
          <p className="text-xs text-gray-600 mb-2">Locked</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {locked.map((a) => (
              <AchievementBadge key={a.type} achievement={a} locked />
            ))}
          </div>
        </>
      )}

      {earned.length === 0 && !isMe && (
        <p className="text-gray-600 text-sm text-center py-4">No achievements yet.</p>
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
        <p className={`text-xs font-semibold truncate ${locked ? "text-gray-500" : "text-white"}`}>
          {achievement.name}
        </p>
        <p className={`text-xs truncate ${locked ? "text-gray-700" : "text-gray-500"}`}>
          {achievement.description}
        </p>
      </div>
    </div>
  );
}
