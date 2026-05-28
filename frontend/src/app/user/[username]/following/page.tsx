"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Users } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import Avatar from "@/components/Avatar";

interface FollowUser {
  id: string;
  username: string;
  avatar?: string;
  bio?: string;
}

export default function FollowingPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);

  const { data: following = [], isLoading } = useQuery<FollowUser[]>({
    queryKey: ["following", username],
    queryFn: () => api.get(`/api/users/${username}/following`).then((r) => r.data),
  });

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href={`/user/${username}`}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold">{username}</h1>
          <p className="text-gray-400 text-sm">Following</p>
        </div>
      </div>

      {isLoading && <div className="text-gray-500 text-sm">Loading...</div>}

      {!isLoading && following.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <Users size={36} className="mx-auto mb-3 opacity-30" />
          <p>Not following anyone yet.</p>
        </div>
      )}

      <div className="space-y-2">
        {following.map((u) => (
          <Link
            key={u.id}
            href={`/user/${u.username}`}
            className="flex items-center gap-3 bg-white/5 backdrop-blur-sm border border-white/8 rounded-xl p-3 hover:border-violet-700 transition-colors"
          >
            <Avatar src={u.avatar} username={u.username} />
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm">{u.username}</p>
              {u.bio && <p className="text-gray-500 text-xs truncate">{u.bio}</p>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
