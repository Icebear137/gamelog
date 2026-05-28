"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Heart, MessageCircle, UserPlus, AtSign } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDistanceToNow } from "@/lib/utils";
import Avatar from "@/components/Avatar";

interface Notification {
  id: string;
  type: "LIKE" | "COMMENT" | "FOLLOW" | "MENTION";
  read: boolean;
  createdAt: string;
  actor: { id: string; username: string; avatar?: string };
  activity?: {
    id: string;
    gameEntry: { game: { name: string; rawgId: number } };
  };
}

const typeIcon: Record<Notification["type"], React.ReactNode> = {
  LIKE: <Heart size={14} className="text-red-400" fill="currentColor" />,
  COMMENT: <MessageCircle size={14} className="text-violet-400" />,
  FOLLOW: <UserPlus size={14} className="text-green-400" />,
  MENTION: <AtSign size={14} className="text-sky-400" />,
};

function notifText(n: Notification): { text: string; href: string } {
  if (n.type === "FOLLOW") {
    return { text: "started following you", href: `/user/${n.actor.username}` };
  }
  const game = n.activity?.gameEntry.game;
  if (n.type === "LIKE") {
    return {
      text: `liked your activity on ${game?.name ?? "a game"}`,
      href: n.activity ? `/activity/${n.activity.id}` : "/",
    };
  }
  if (n.type === "MENTION") {
    return {
      text: `mentioned you in a comment on ${game?.name ?? "a game"}`,
      href: n.activity ? `/activity/${n.activity.id}` : "/",
    };
  }
  return {
    text: `commented on your activity on ${game?.name ?? "a game"}`,
    href: n.activity ? `/activity/${n.activity.id}` : "/",
  };
}

export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: () => api.get("/api/notifications").then((r) => r.data),
    enabled: !!user,
  });

  const hasMarkedRead = useRef(false);

  const readAllMutation = useMutation({
    mutationFn: () => api.post("/api/notifications/read-all"),
    onSuccess: () => {
      // Only update the count badge — don't invalidate "notifications" or
      // the effect would re-run and create an infinite loop.
      qc.invalidateQueries({ queryKey: ["notif-count"] });
    },
  });

  // Mark all as read once on page mount (not on every re-fetch)
  useEffect(() => {
    if (!hasMarkedRead.current && notifications.some((n) => !n.read)) {
      hasMarkedRead.current = true;
      readAllMutation.mutate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications]);

  if (loading || !user) return null;

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell size={22} />
          Notifications
        </h1>
      </div>

      {isLoading && <div className="text-gray-500 text-sm">Loading...</div>}

      {!isLoading && notifications.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <Bell size={36} className="mx-auto mb-3 opacity-30" />
          <p>No notifications yet.</p>
        </div>
      )}

      <div className="space-y-1">
        {notifications.map((n) => {
          const { text, href } = notifText(n);
          return (
            <Link
              key={n.id}
              href={href}
              className={`flex items-start gap-3 p-3 rounded-xl transition-colors hover:bg-white/8 ${
                !n.read ? "bg-white/5 backdrop-blur-sm border border-white/10" : "bg-white/5 backdrop-blur-sm/50"
              }`}
            >
              <div className="relative shrink-0">
                <Avatar src={n.actor.avatar} username={n.actor.username} size="sm" />
                <span className="absolute -bottom-0.5 -right-0.5 bg-gray-950 rounded-full p-0.5">
                  {typeIcon[n.type]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-200">
                  <span className="font-semibold text-white">{n.actor.username}</span>{" "}
                  {text}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{formatDistanceToNow(n.createdAt)}</p>
              </div>
              {!n.read && <span className="w-2 h-2 rounded-full bg-violet-500 mt-1.5 shrink-0" />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

