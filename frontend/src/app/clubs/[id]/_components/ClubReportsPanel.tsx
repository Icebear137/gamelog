"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Flag, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";
import { dispatchToast } from "@/lib/toast";
import Avatar from "@/components/Avatar";

interface ClubReport {
  id: string; type: string; reason: string; status: string; createdAt: string;
  reporter: { id: string; username: string; avatar?: string };
  preview: { text?: string; author?: { id: string; username: string; avatar?: string } } | null;
}

export function ClubReportsPanel({ clubId }: { clubId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: reports = [] } = useQuery<ClubReport[]>({
    queryKey: ["club-reports", clubId],
    queryFn: () => api.get(`/api/reports/club/${clubId}?status=PENDING`).then((r) => r.data),
    enabled: open,
    staleTime: 30_000,
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, deleteContent }: { id: string; deleteContent?: boolean }) =>
      api.patch(`/api/reports/${id}`, { status: deleteContent ? "REVIEWED" : "DISMISSED", deleteContent }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["club-reports", clubId] });
      qc.invalidateQueries({ queryKey: ["club-posts", clubId] });
      dispatchToast("Report resolved", "success");
    },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed", "error"),
  });

  return (
    <div style={{ background: "var(--gx-surface)", border: "1px solid var(--gx-border)", borderRadius: 14, padding: 14 }}>
      <button onClick={() => setOpen((v) => !v)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Flag size={13} style={{ color: "#FB923C" }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--gx-text-2)" }}>Reports</span>
        </div>
        <ChevronDown size={11} style={{ color: "var(--gx-text-3)", transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "none" }} />
      </button>

      {open && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {reports.length === 0 && (
            <p style={{ fontSize: 11, color: "var(--gx-text-3)", textAlign: "center", padding: "8px 0" }}>No pending reports</p>
          )}
          {reports.map((r) => (
            <div key={r.id} style={{ background: "rgba(0,0,0,0.2)", borderRadius: 10, padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Avatar src={r.reporter.avatar} username={r.reporter.username} size="sm" />
                <span style={{ fontSize: 11, color: "var(--gx-text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.reporter.username}</span>
              </div>
              <p style={{ fontSize: 10, color: "var(--gx-text-3)", margin: 0 }}>{r.reason} · {r.type.replace("CLUB_", "")}</p>
              {r.preview?.text && (
                <p style={{ fontSize: 10, color: "var(--gx-text-3)", fontStyle: "italic", margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  &ldquo;{r.preview.text}&rdquo;
                </p>
              )}
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => resolveMutation.mutate({ id: r.id })}
                  style={{ flex: 1, padding: "4px 0", borderRadius: 6, fontSize: 10, background: "var(--gx-surface-2)", color: "var(--gx-text-2)", border: "none", cursor: "pointer", transition: "color 0.12s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gx-text-1)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--gx-text-2)")}>
                  Dismiss
                </button>
                {r.preview?.text !== undefined && (
                  <button onClick={() => resolveMutation.mutate({ id: r.id, deleteContent: true })}
                    style={{ flex: 1, padding: "4px 0", borderRadius: 6, fontSize: 10, background: "rgba(239,68,68,0.12)", color: "var(--gx-red)", border: "none", cursor: "pointer", transition: "background 0.12s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.12)")}>
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
