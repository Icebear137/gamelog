"use client";

import { use, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Lock, UserPlus, Send, TrendingUp, Clock, Heart, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { dispatchToast } from "@/lib/toast";
import { gx } from "@/lib/gx-styles";
import Avatar from "@/components/Avatar";
import { ClubRichEditor } from "@/components/ClubRichEditor";
import { useClubSocket } from "./_hooks/useClubSocket";
import { useClubPosts } from "./_hooks/useClubPosts";
import { ClubInfoPanel } from "./_components/ClubInfoPanel";
import { PostCard } from "./_components/PostCard";
import { MembersSidebar } from "./_components/MembersSidebar";
import { JoinRequestModal } from "./_components/JoinRequestModal";
import { ApplicationsPanel } from "./_components/ApplicationsPanel";
import { ClubReportsPanel } from "./_components/ClubReportsPanel";
import type { ClubDetail, ClubPost, Sort } from "./_types";

const SORT_OPTIONS: { key: Sort; label: string; icon: React.ReactNode }[] = [
  { key: "newest",   label: "Newest",   icon: <Clock size={13} /> },
  { key: "popular",  label: "Popular",  icon: <Heart size={13} /> },
  { key: "trending", label: "Trending", icon: <TrendingUp size={13} /> },
];

export default function ClubDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();

  const [postHtml, setPostHtml] = useState("");
  const [editorKey, setEditorKey] = useState(0);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const handleEditorChange = useCallback((html: string) => setPostHtml(html), []);

  const { data: club, isLoading, refetch: refetchClub } = useQuery<ClubDetail>({
    queryKey: ["club", id],
    queryFn: () => api.get(`/api/clubs/${id}`).then((r) => r.data),
    staleTime: 30_000,
  });

  const onlineSet = useClubSocket(club?.members);
  const { sort, setSort, allPosts, addPost, updatePost, deletePost } = useClubPosts(id, !!club);

  const joinMutation = useMutation({
    mutationFn: () => club?.isMember ? api.delete(`/api/clubs/${id}/join`) : api.post(`/api/clubs/${id}/join`),
    onSuccess: () => refetchClub(),
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed", "error"),
  });

  const cancelRequestMutation = useMutation({
    mutationFn: (reqId: string) => api.delete(`/api/clubs/${id}/requests/${reqId}`),
    onSuccess: () => { refetchClub(); dispatchToast("Request cancelled", "info"); },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed", "error"),
  });

  const postMutation = useMutation({
    mutationFn: () => api.post(`/api/clubs/${id}/posts`, { body: postHtml.trim() }),
    onSuccess: (res) => {
      addPost(res.data);
      setPostHtml("");
      setEditorKey((k) => k + 1);
    },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Join the club to post", "error"),
  });

  const pinMutation = useMutation({
    mutationFn: (postId: string) => api.post(`/api/clubs/${id}/pin/${postId}`),
    onSuccess: () => refetchClub(),
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed", "error"),
  });

  if (isLoading) return (
    <div style={{ padding: "64px 0", textAlign: "center", fontSize: 13, color: "var(--gx-text-3)" }}>Loading…</div>
  );
  if (!club) return (
    <div style={{ padding: "64px 0", textAlign: "center", fontSize: 13, color: "var(--gx-text-3)" }}>Club not found</div>
  );

  if (club.isBanned) return (
    <div style={{ maxWidth: 420, margin: "80px auto", textAlign: "center", display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Shield size={28} style={{ color: "var(--gx-red)" }} />
      </div>
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--gx-red)", marginBottom: 8 }}>You&apos;ve been banned</h2>
        <p style={{ fontSize: 13, color: "var(--gx-text-2)", lineHeight: 1.6 }}>
          You have been banned from <strong style={{ color: "var(--gx-text-1)" }}>{club.name}</strong> and cannot access its content.
        </p>
        <p style={{ fontSize: 12, color: "var(--gx-text-3)", marginTop: 4 }}>
          If you believe this is a mistake, contact a club admin.
        </p>
      </div>
      <button onClick={() => router.push("/clubs")} className={gx.btnGhost} style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <ArrowLeft size={14} /> Back to Clubs
      </button>
    </div>
  );

  const isAdmin = club.myRole === "admin";

  // Private club wall — non-members see locked view
  if (club.isPrivate && !club.isMember) {
    return (
      <div className="flex flex-col px-4 py-6 gap-4">
        <button onClick={() => router.push("/clubs")} className={gx.backBtn}>
          <ArrowLeft size={14} /> All Clubs
        </button>
        <div className="grid grid-cols-[260px_1fr_220px] gap-5 items-start">
        <ClubInfoPanel
          club={club} isAdmin={false} user={user}
          onJoin={() => {}} joinPending={false}
          onUpdate={() => refetchClub()}
          onRequestJoin={() => setShowJoinModal(true)}
          onCancelRequest={(reqId) => cancelRequestMutation.mutate(reqId)}
        />
        <div className="flex flex-col items-center justify-center gap-4 py-20 col-span-2">
          <div className="w-16 h-16 rounded-full bg-gx-amber/10 border border-gx-amber/20 flex items-center justify-center">
            <Lock size={28} style={{ color: "var(--gx-amber)" }} />
          </div>
          <div className="text-center">
            <h2 className="text-[18px] font-bold text-gx-text-1 m-0 mb-1">This is a private club</h2>
            <p className="text-[13px] text-gx-text-2 m-0">Only members can view posts and discussions.</p>
          </div>
          {user && !club.myRequest && (
            <button
              onClick={() => setShowJoinModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold bg-gx-amber/13 text-gx-amber border border-gx-amber/30 hover:bg-gx-amber/25 transition-colors cursor-pointer"
            >
              <UserPlus size={14} /> Request to Join
            </button>
          )}
        </div>
        {showJoinModal && <JoinRequestModal clubId={id} onClose={() => setShowJoinModal(false)} onSuccess={() => refetchClub()} />}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col px-4 py-6 gap-4">
      <button onClick={() => router.push("/clubs")} className={gx.backBtn}>
        <ArrowLeft size={14} /> All Clubs
      </button>
      <div className="grid grid-cols-[260px_1fr_220px] gap-5 items-start">
      {/* Left */}
      <ClubInfoPanel
        club={club} isAdmin={isAdmin} user={user}
        onJoin={() => joinMutation.mutate()} joinPending={joinMutation.isPending}
        onUpdate={() => refetchClub()}
        onRequestJoin={() => setShowJoinModal(true)}
        onCancelRequest={(reqId) => cancelRequestMutation.mutate(reqId)}
      />
      {showJoinModal && <JoinRequestModal clubId={id} onClose={() => setShowJoinModal(false)} onSuccess={() => refetchClub()} />}

      {/* Center: posts feed */}
      <div className="flex flex-col gap-4 min-w-0">
        {club.pinnedPost && (
          <PostCard
            post={club.pinnedPost as ClubPost} clubId={id} currentUserId={user?.id}
            isAdmin={isAdmin} isPinned
            onPin={() => pinMutation.mutate(club.pinnedPost!.id)}
            onUpdate={updatePost}
            onDelete={() => { deletePost(club.pinnedPost!.id); refetchClub(); }}
          />
        )}

        {user && club.isMember && (
          <div className="bg-gx-surface border border-gx-border rounded-[14px] p-4">
            <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <Avatar src={user.avatar} username={user.username} size="sm" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <ClubRichEditor key={editorKey} content="" onChange={handleEditorChange} placeholder="Share something with the club…" minHeight={100} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => postMutation.mutate()} disabled={!postHtml.trim() || postMutation.isPending}
                className="inline-flex items-center gap-1.75 px-5 py-2 bg-gx-amber border-none rounded-[9px] text-gx-ink text-[13px] font-bold cursor-pointer transition-colors hover:bg-[#f5a33a] disabled:opacity-40 disabled:cursor-not-allowed">
                <Send size={13} /> Post
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 6 }}>
            {SORT_OPTIONS.map(({ key, label, icon }) => (
              <button key={key} onClick={() => setSort(key)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.75 rounded-[10px] text-[12px] font-semibold bg-gx-surface border border-gx-border text-gx-text-2 cursor-pointer transition-all data-[active=true]:bg-gx-amber data-[active=true]:border-gx-amber data-[active=true]:text-gx-ink"
                data-active={sort === key}>
                {icon} {label}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 12, color: "var(--gx-text-3)" }}>
            {allPosts.length} post{allPosts.length !== 1 ? "s" : ""}
          </span>
        </div>

        {allPosts.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 24px", background: "var(--gx-surface)", border: "1px solid var(--gx-border)", borderRadius: 14 }}>
            <p style={{ fontSize: 13, color: "var(--gx-text-3)" }}>
              {club.isMember ? "No posts yet — start the discussion!" : "Join the club to see and post discussions."}
            </p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {allPosts.filter((p) => p.id !== club.pinnedPostId).map((p) => (
            <PostCard key={p.id} post={p} clubId={id} currentUserId={user?.id}
              isAdmin={isAdmin} isPinned={false}
              onPin={() => pinMutation.mutate(p.id)}
              onUpdate={updatePost}
              onDelete={() => deletePost(p.id)}
            />
          ))}
        </div>
      </div>

      {/* Right */}
      <aside className="flex flex-col gap-3 sticky top-18">
        <MembersSidebar club={club} currentUserId={user?.id} onUpdate={() => refetchClub()} onlineSet={onlineSet} />
        {isAdmin && <ApplicationsPanel clubId={id} onApproved={() => refetchClub()} />}
        {isAdmin && <ClubReportsPanel clubId={id} />}
      </aside>
      </div>
    </div>
  );
}
