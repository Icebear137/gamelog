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
    <div className="group flex items-center gap-3 rounded-xl border border-gx-border bg-gx-surface px-3.5 py-3 transition-colors hover:border-gx-border-md">
      <Link href={`/user/${su.username}`} style={{ flexShrink: 0 }}>
        <Avatar src={su.avatar} username={su.username} />
      </Link>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link href={`/user/${su.username}`} style={{ textDecoration: "none" }}>
          <p className="text-[13px] font-bold text-gx-text-1 transition-colors group-hover:text-gx-amber">{su.username}</p>
        </Link>
        {su.bio && <p className="truncate text-[11px] text-gx-text-2">{su.bio}</p>}
        <p className="mt-0.5 text-[10px] font-semibold text-gx-teal">
          {su.commonGames} game{su.commonGames !== 1 ? "s" : ""} in common
        </p>
      </div>
      <button
        onClick={() => followMutation.mutate()}
        disabled={followMutation.isPending}
        className="gx-btn-primary"
        style={{ fontSize: 11, padding: "6px 14px", flexShrink: 0 }}
      >
        {followMutation.isPending ? "…" : "Follow"}
      </button>
    </div>
  );
});
