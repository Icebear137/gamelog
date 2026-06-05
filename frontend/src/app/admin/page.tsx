"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Shield, Flag, Check, Trash2, Eye, ChevronDown, Loader2 } from "lucide-react";
import Link from "next/link";
import { Heading, Text, Flex, Box } from "@radix-ui/themes";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { dispatchToast } from "@/lib/toast";
import { formatDistanceToNow } from "@/lib/utils";
import Avatar from "@/components/Avatar";

type Status = "PENDING" | "REVIEWED" | "DISMISSED";
type ReportType = "REVIEW" | "ACTIVITY_COMMENT" | "LIST_COMMENT" | "CLUB" | "ALL";

const TYPE_LABELS: Record<string, string> = {
  REVIEW:           "Review",
  ACTIVITY_COMMENT: "Activity Comment",
  LIST_COMMENT:     "List Comment",
  CLUB:             "Club",
};

const REASON_LABELS: Record<string, string> = {
  SPAM: "Spam", INAPPROPRIATE: "Inappropriate", HARASSMENT: "Harassment",
  MISINFORMATION: "Misinformation", OTHER: "Other",
};

const REASON_COLORS: Record<string, string> = {
  SPAM: "text-yellow-400", INAPPROPRIATE: "text-red-400",
  HARASSMENT: "text-red-500", MISINFORMATION: "text-orange-400", OTHER: "text-gray-400",
};

interface ReportItem {
  id: string;
  type: string;
  targetId: string;
  reason: string;
  description?: string;
  status: string;
  createdAt: string;
  reporter: { id: string; username: string; avatar?: string };
  preview: {
    text?: string;
    author?: { id: string; username: string; avatar?: string };
    meta?: string;
    clubId?: string;
  } | null;
}

interface Stats { type: string; status: string; _count: number }

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  const [status, setStatus]   = useState<Status>("PENDING");
  const [typeFilter, setType] = useState<ReportType>("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || !(user as any).isAdmin)) router.push("/");
  }, [user, loading, router]);

  const queryKey = ["admin-reports", status, typeFilter];
  const { data: reports = [], isLoading } = useQuery<ReportItem[]>({
    queryKey,
    queryFn: () => api.get(`/api/reports/admin?status=${status}${typeFilter !== "ALL" ? `&type=${typeFilter}` : ""}`).then((r) => r.data),
    enabled: !!(user as any)?.isAdmin,
    staleTime: 30_000,
  });

  const { data: stats = [] } = useQuery<Stats[]>({
    queryKey: ["admin-report-stats"],
    queryFn: () => api.get("/api/reports/admin/stats").then((r) => r.data),
    enabled: !!(user as any)?.isAdmin,
    staleTime: 60_000,
  });


  const resolveMutation = useMutation({
    mutationFn: ({ id, deleteContent }: { id: string; deleteContent?: boolean }) =>
      api.patch(`/api/reports/${id}`, { status: deleteContent ? "REVIEWED" : "DISMISSED", deleteContent }),
    onSuccess: (_, { deleteContent }) => {
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
      qc.invalidateQueries({ queryKey: ["admin-report-stats"] });
      dispatchToast(deleteContent ? "Content deleted & report resolved" : "Report dismissed", "success");
    },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed", "error"),
  });

  if (loading || !user) return null;
  if (!(user as any).isAdmin) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Box>
        <Heading size="6" className="flex items-center gap-2">
          <Shield size={22} className="text-violet-400" />
          Moderation Dashboard
        </Heading>
        <Text as="p" size="2" color="gray" className="mt-1">
          Review and resolve user reports.
        </Text>
      </Box>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["REVIEW", "ACTIVITY_COMMENT", "LIST_COMMENT", "CLUB"] as const).map((t) => {
          const pending = stats.filter((s) => s.type === t && s.status === "PENDING").reduce((a, s) => a + s._count, 0);
          return (
            <button
              key={t}
              onClick={() => { setType(t); setStatus("PENDING"); }}
              className={`bg-white/5 border rounded-xl p-4 text-left transition-colors hover:border-violet-700/50 ${typeFilter === t ? "border-violet-500/50" : "border-white/8"}`}
            >
              <Text as="p" size="4" weight="bold" className={pending > 0 ? "text-orange-400" : "text-white"}>{pending}</Text>
              <Text as="p" size="1" color="gray">{TYPE_LABELS[t]}</Text>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <Flex gap="2" className="flex-wrap">
        <div className="flex gap-1">
          {(["PENDING", "REVIEWED", "DISMISSED"] as Status[]).map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${status === s ? "bg-violet-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(["ALL", "REVIEW", "ACTIVITY_COMMENT", "LIST_COMMENT", "CLUB"] as const).map((t) => (
            <button key={t} onClick={() => setType(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${typeFilter === t ? "bg-white/15 text-white" : "bg-white/5 text-gray-500 hover:text-gray-300"}`}>
              {t === "ALL" ? "All types" : TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </Flex>

      {/* Reports list */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-gray-500" /></div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 bg-white/5 border border-white/8 rounded-2xl">
          <Flag size={36} className="mx-auto mb-3 opacity-20 text-gray-500" />
          <Text as="p" size="2" color="gray">No {status.toLowerCase()} reports{typeFilter !== "ALL" ? ` for ${TYPE_LABELS[typeFilter]}` : ""}.</Text>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className={`bg-white/5 border rounded-2xl overflow-hidden transition-colors ${r.status === "PENDING" ? "border-white/8" : "border-white/4 opacity-70"}`}>
              {/* Row */}
              <div className="flex items-start gap-3 p-4">
                {/* Reporter */}
                <Avatar src={r.reporter.avatar} username={r.reporter.username} size="sm" />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Flex align="center" gap="2" className="flex-wrap">
                    <span className="text-xs font-semibold text-white">{r.reporter.username}</span>
                    <span className="text-xs text-gray-500">reported a</span>
                    <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded text-gray-300">{TYPE_LABELS[r.type] ?? r.type}</span>
                    <span className={`text-xs font-medium ${REASON_COLORS[r.reason] ?? "text-gray-400"}`}>
                      · {REASON_LABELS[r.reason] ?? r.reason}
                    </span>
                    <span className="text-xs text-gray-600 ml-auto">{formatDistanceToNow(r.createdAt)}</span>
                  </Flex>

                  {/* Content preview */}
                  {r.preview && (
                    <div className="mt-2 p-2.5 bg-black/20 rounded-lg border border-white/6">
                      {r.preview.author && (
                        <Flex align="center" gap="1.5" className="mb-1.5">
                          <Avatar src={r.preview.author.avatar} username={r.preview.author.username} size="sm" />
                          <Text as="span" size="1" className="font-semibold text-violet-300">{r.preview.author.username}</Text>
                          {r.preview.meta && <Text as="span" size="1" color="gray">· {r.preview.meta}</Text>}
                        </Flex>
                      )}
                      {r.preview.text ? (
                        <Text as="p" size="1" color="gray" className="line-clamp-3">{r.preview.text}</Text>
                      ) : (
                        <Text as="p" size="1" color="gray" className="italic">Content no longer exists</Text>
                      )}
                    </div>
                  )}

                  {r.description && (
                    <Text as="p" size="1" color="gray" className="mt-1.5 italic">"{r.description}"</Text>
                  )}
                </div>

                {/* Expand */}
                <button onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                  className="p-1 text-gray-600 hover:text-white transition-colors shrink-0">
                  <ChevronDown size={14} className={`transition-transform ${expanded === r.id ? "rotate-180" : ""}`} />
                </button>
              </div>

              {/* Expanded actions */}
              {expanded === r.id && r.status === "PENDING" && (
                <div className="px-4 pb-4 border-t border-white/6 pt-3 flex items-center gap-2 flex-wrap">
                  {/* View content */}
                  {r.type === "REVIEW" && (
                    <Link href={`/reviews`} target="_blank"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-300 bg-white/8 hover:bg-white/12 transition-colors">
                      <Eye size={13} /> View reviews
                    </Link>
                  )}
                  {r.type === "CLUB" && r.preview && (
                    <Link href={`/clubs/${r.targetId}`} target="_blank"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-300 bg-white/8 hover:bg-white/12 transition-colors">
                      <Eye size={13} /> View club
                    </Link>
                  )}
                  {r.type === "CLUB_POST" && r.preview?.clubId && (
                    <Link href={`/clubs/${r.preview.clubId}`} target="_blank"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-300 bg-white/8 hover:bg-white/12 transition-colors">
                      <Eye size={13} /> View club
                    </Link>
                  )}

                  <div className="ml-auto flex gap-2">
                    {/* Dismiss */}
                    <button
                      onClick={() => resolveMutation.mutate({ id: r.id, deleteContent: false })}
                      disabled={resolveMutation.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-400 bg-white/8 hover:bg-white/12 transition-colors disabled:opacity-50"
                    >
                      <Check size={13} /> Dismiss
                    </button>
                    {/* Delete content */}
                    {r.preview?.text !== undefined && (
                      <button
                        onClick={() => {
                          if (confirm(`Delete this ${TYPE_LABELS[r.type]?.toLowerCase()}? This cannot be undone.`)) {
                            resolveMutation.mutate({ id: r.id, deleteContent: true });
                          }
                        }}
                        disabled={resolveMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={13} /> Delete content
                      </button>
                    )}
                  </div>
                </div>
              )}

              {expanded === r.id && r.status !== "PENDING" && (
                <div className="px-4 pb-3 border-t border-white/6 pt-3">
                  <Text as="span" size="1" color="gray" className="italic">
                    {r.status === "REVIEWED" ? "✓ Resolved — content was deleted" : "✓ Dismissed"}
                  </Text>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
