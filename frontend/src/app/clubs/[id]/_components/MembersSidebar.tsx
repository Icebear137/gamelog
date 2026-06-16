"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useMutation } from "@tanstack/react-query";
import { Users, Crown, Shield, MoreHorizontal, UserX, UserCheck, ChevronDown } from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/api";
import { dispatchToast } from "@/lib/toast";
import Avatar from "@/components/Avatar";
import type { ClubDetail, ClubMember } from "../_types";

interface MemberRowProps {
  m: ClubMember; isOnline: boolean; isAdmin: boolean; isCreator: boolean;
  currentUserId?: string; creatorId: string;
  onKick: (userId: string) => void;
  onBan: (userId: string, banned: boolean) => void;
  onRole: (userId: string, role: string) => void;
}

function MemberRow({ m, isOnline, isAdmin, isCreator, currentUserId, creatorId, onKick, onBan, onRole }: MemberRowProps) {
  const isMe          = m.user.id === currentUserId;
  const isClubCreator = m.user.id === creatorId;
  const canManage     = isCreator && !isMe && !isClubCreator;
  const canAdminManage = isAdmin && !isMe && !isClubCreator && !isCreator;

  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);

  function toggleMenu(e: React.MouseEvent<HTMLButtonElement>) {
    if (menuPos) { setMenuPos(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
  }

  return (
    <div className="flex items-center gap-2 py-1.25 relative group">
      <div style={{ position: "relative", flexShrink: 0 }}>
        <Avatar src={m.user.avatar} username={m.user.username} size="sm" />
        <span className={clsx(
          "absolute bottom-0.75 right-0.75 w-2.25 h-2.25 rounded-full border-[1.5px] border-gx-surface",
          isOnline ? "bg-gx-green" : "bg-gx-text-3"
        )} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--gx-text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {m.user.username}
          </span>
          {isClubCreator && <Crown size={10} style={{ color: "#F59E0B", flexShrink: 0 }} />}
          {m.role === "admin" && !isClubCreator && <Shield size={10} style={{ color: "var(--gx-amber)", flexShrink: 0 }} />}
        </div>
        <p style={{ fontSize: 10, color: "var(--gx-text-3)", margin: 0 }}>{m.user._count.gameEntries} games</p>
      </div>

      {(canManage || canAdminManage) && !m.isBanned && (
        <>
          <button onClick={toggleMenu}
            className="opacity-0 group-hover:opacity-100"
            style={{ padding: 4, color: "var(--gx-text-3)", background: "none", border: "none", cursor: "pointer", borderRadius: 6, flexShrink: 0, transition: "color 0.12s, opacity 0.12s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gx-text-1)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--gx-text-3)")}>
            <MoreHorizontal size={13} />
          </button>
          {menuPos && typeof window !== "undefined" && createPortal(
            <>
              <div className="fixed inset-0 z-200" onClick={() => setMenuPos(null)} />
              <div style={{ position: "fixed", top: menuPos.top, right: menuPos.right, zIndex: 201, background: "var(--gx-surface-2)", border: "1px solid var(--gx-border-md)", borderRadius: 10, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.5)", minWidth: 144 }}>
                {canManage && (
                  <button onClick={() => { onRole(m.user.id, m.role === "admin" ? "member" : "admin"); setMenuPos(null); }}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", fontSize: 13, color: "var(--gx-text-2)", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
                    {m.role === "admin" ? <><UserCheck size={12} /> Remove admin</> : <><Shield size={12} /> Make admin</>}
                  </button>
                )}
                <button onClick={() => { onKick(m.user.id); setMenuPos(null); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", fontSize: 13, color: "#FB923C", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(251,146,60,0.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
                  <UserX size={12} /> Kick
                </button>
                <button onClick={() => { onBan(m.user.id, false); setMenuPos(null); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", fontSize: 13, color: "var(--gx-red)", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
                  <UserX size={12} /> Ban
                </button>
              </div>
            </>,
            document.body
          )}
        </>
      )}
      {m.isBanned && isAdmin && (
        <button onClick={() => onBan(m.user.id, true)}
          style={{ fontSize: 10, color: "var(--gx-text-3)", cursor: "pointer", padding: "2px 6px", borderRadius: 5, border: "1px solid var(--gx-border)", background: "none", transition: "color 0.12s, border-color 0.12s" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--gx-green)"; e.currentTarget.style.borderColor = "rgba(74,222,128,0.3)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--gx-text-3)"; e.currentTarget.style.borderColor = "var(--gx-border)"; }}>
          Unban
        </button>
      )}
    </div>
  );
}

export function MembersSidebar({ club, currentUserId, onUpdate, onlineSet }: {
  club: ClubDetail; currentUserId?: string; onlineSet: Set<string>; onUpdate: () => void;
}) {
  const isAdmin   = club.myRole === "admin";
  const isCreator = club.creator.id === currentUserId;

  const kickMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/api/clubs/${club.id}/members/${userId}`),
    onSuccess: () => { onUpdate(); dispatchToast("Member removed", "success"); },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed", "error"),
  });

  const banMutation = useMutation({
    mutationFn: ({ userId, banned }: { userId: string; banned: boolean }) =>
      banned ? api.delete(`/api/clubs/${club.id}/members/${userId}/ban`) : api.post(`/api/clubs/${club.id}/members/${userId}/ban`),
    onSuccess: () => { onUpdate(); dispatchToast("Updated", "success"); },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed", "error"),
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.patch(`/api/clubs/${club.id}/members/${userId}/role`, { role }),
    onSuccess: () => { onUpdate(); dispatchToast("Role updated", "success"); },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed", "error"),
  });

  const isOnline = (m: ClubMember) => onlineSet.has(m.user.id);
  const online  = club.members.filter((m) => isOnline(m)  && !m.isBanned);
  const offline = club.members.filter((m) => !isOnline(m) && !m.isBanned);
  const banned  = isAdmin ? club.members.filter((m) => m.isBanned) : [];

  const rowProps = {
    isAdmin, isCreator, currentUserId, creatorId: club.creator.id,
    onKick: (userId: string) => kickMutation.mutate(userId),
    onBan:  (userId: string, banned: boolean) => banMutation.mutate({ userId, banned }),
    onRole: (userId: string, role: string) => roleMutation.mutate({ userId, role }),
  };

  function Group({ title, members, count }: { title: string; members: ClubMember[]; count?: number }) {
    const [open, setOpen] = useState(true);
    return (
      <div style={{ marginBottom: 8 }}>
        <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between text-[10px] font-semibold tracking-widest uppercase text-gx-text-3 py-1 bg-none border-none cursor-pointer transition-colors hover:text-gx-text-2">
          <span>{title}{count != null ? ` — ${count}` : ""}</span>
          <ChevronDown size={11} style={{ transition: "transform 0.15s", transform: open ? "none" : "rotate(-90deg)" }} />
        </button>
        {open && members.map((m) => (
          <MemberRow key={m.user.id} m={m} isOnline={isOnline(m)} {...rowProps} />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-gx-surface border border-gx-border rounded-[14px] p-3.5">
      <div className="text-[10px] font-bold tracking-[0.12em] uppercase text-gx-text-3 mb-3 flex items-center gap-1.5">
        <Users size={12} style={{ color: "var(--gx-amber)" }} />
        Members
        <span className="ml-auto">{club._count.members}</span>
      </div>
      <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
        {online.length > 0  && <Group title="Online"  members={online}  count={online.length} />}
        {offline.length > 0 && <Group title="Offline" members={offline} />}
        {banned.length > 0  && <Group title="Banned"  members={banned}  count={banned.length} />}
      </div>
    </div>
  );
}
