"use client";

import { memo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { dispatchToast } from "@/lib/toast";
import Avatar from "@/components/Avatar";

export interface SuggestedUser {
  id: string;
  username: string;
  avatar?: string;
  bio?: string;
  commonGames: number;
}

export default memo(function SuggestedUserCard({ user: su }: { user: SuggestedUser }) {
  const qc = useQueryClient();

  const followMutation = useMutation({
    mutationFn: () => api.post(`/api/users/${su.username}/follow`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["discover-people"] });
      dispatchToast(`Following ${su.username}`, "success");
    },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed", "error"),
  });

  return (
    <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm border border-white/8 rounded-xl p-4">
      <Link href={`/user/${su.username}`} className="shrink-0">
        <Avatar src={su.avatar} username={su.username} />
      </Link>
      <div className="flex-1 min-w-0">
        <Link
          href={`/user/${su.username}`}
          className="text-white font-semibold text-sm hover:text-violet-300 transition-colors"
        >
          {su.username}
        </Link>
        {su.bio && <p className="text-gray-500 text-xs truncate">{su.bio}</p>}
        <p className="text-violet-400 text-xs mt-0.5">
          {su.commonGames} game{su.commonGames !== 1 ? "s" : ""} in common
        </p>
      </div>
      <button
        onClick={() => followMutation.mutate()}
        disabled={followMutation.isPending}
        className="shrink-0 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
      >
        {followMutation.isPending ? "..." : "Follow"}
      </button>
    </div>
  );
});

