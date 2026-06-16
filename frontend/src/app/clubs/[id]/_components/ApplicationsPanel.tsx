"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, CheckCircle2, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { dispatchToast } from "@/lib/toast";
import { formatDistanceToNow } from "@/lib/utils";
import Avatar from "@/components/Avatar";
import type { ClubJoinRequest } from "@/lib/types";

export function ApplicationsPanel({ clubId, onApproved }: { clubId: string; onApproved: () => void }) {
  const qc = useQueryClient();
  const { data: requests = [], isLoading } = useQuery<ClubJoinRequest[]>({
    queryKey: ["club-requests", clubId],
    queryFn: () => api.get(`/api/clubs/${clubId}/requests`).then((r) => r.data),
    refetchInterval: 30_000,
  });

  const resolveMutation = useMutation({
    mutationFn: ({ reqId, action, rejectionNote }: { reqId: string; action: "approve" | "reject"; rejectionNote?: string }) =>
      api.patch(`/api/clubs/${clubId}/requests/${reqId}`, { action, rejectionNote }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["club-requests", clubId] });
      if (vars.action === "approve") onApproved();
      dispatchToast(vars.action === "approve" ? "Approved!" : "Request rejected", vars.action === "approve" ? "success" : "info");
    },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed", "error"),
  });

  if (isLoading) return null;
  if (requests.length === 0) return (
    <div className="bg-gx-surface border border-gx-border rounded-[14px] px-4 py-5 flex flex-col items-center gap-2">
      <ClipboardList size={18} style={{ color: "var(--gx-text-3)" }} />
      <p className="text-[12px] text-gx-text-3 m-0">No pending requests</p>
    </div>
  );

  return (
    <div className="bg-gx-surface border border-gx-border rounded-[14px] overflow-hidden">
      <div className="px-4 py-3 border-b border-gx-border flex items-center gap-2">
        <ClipboardList size={13} style={{ color: "var(--gx-amber)" }} />
        <span className="text-[12px] font-bold text-gx-text-1">Join Requests</span>
        <span className="ml-auto bg-gx-amber/13 text-gx-amber text-[10px] font-bold px-1.5 py-0.25 rounded-full">{requests.length}</span>
      </div>
      <div className="flex flex-col divide-y divide-gx-border">
        {requests.map((req) => (
          <div key={req.id} className="px-4 py-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Avatar src={req.user.avatar} username={req.user.username} size="xs" />
              <span className="text-[12px] font-bold text-gx-text-1 flex-1">{req.user.username}</span>
              <span className="text-[10px] text-gx-text-3">{formatDistanceToNow(req.createdAt)}</span>
            </div>
            {req.answers.length > 0 && (
              <div className="flex flex-col gap-1.5 bg-gx-surface-2 rounded-[8px] px-3 py-2">
                {req.answers.map((a, i) => (
                  <div key={i}>
                    <p className="text-[10px] text-gx-text-3 font-semibold m-0 mb-0.5">{a.question.question}</p>
                    <p className="text-[11px] text-gx-text-2 m-0 leading-[1.5]">{a.answer}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-1.5">
              <button
                onClick={() => resolveMutation.mutate({ reqId: req.id, action: "approve" })}
                disabled={resolveMutation.isPending}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-[8px] text-[11px] font-semibold bg-gx-green/13 text-gx-green border-none cursor-pointer hover:bg-gx-green/25 transition-colors disabled:opacity-40"
              >
                <CheckCircle2 size={11} /> Approve
              </button>
              <button
                onClick={() => resolveMutation.mutate({ reqId: req.id, action: "reject" })}
                disabled={resolveMutation.isPending}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-[8px] text-[11px] font-semibold bg-gx-red/8 text-gx-red border-none cursor-pointer hover:bg-gx-red/15 transition-colors disabled:opacity-40"
              >
                <XCircle size={11} /> Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
