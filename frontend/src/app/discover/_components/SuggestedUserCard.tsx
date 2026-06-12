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
    <div className="gx-person-card">
      <Link href={`/user/${su.username}`} style={{ flexShrink: 0 }}>
        <Avatar src={su.avatar} username={su.username} />
      </Link>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link href={`/user/${su.username}`} style={{ textDecoration: "none" }}>
          <p className="gx-person-name">{su.username}</p>
        </Link>
        {su.bio && <p className="gx-person-bio">{su.bio}</p>}
        <p className="gx-person-common">
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
