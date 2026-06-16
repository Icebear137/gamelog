"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  X, UserPlus, UserMinus, Pencil, Check, Shield,
  Users, Tag, MessageCircle, Trash2, Flag, Lock, Clock,
  AlertCircle, Image as ImageIcon,
} from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import { api } from "@/lib/api";
import { dispatchToast } from "@/lib/toast";
import Avatar from "@/components/Avatar";
import { ReportModal } from "@/components/ReportModal";
import { gx } from "@/lib/gx-styles";
import { GamePickerInline } from "./GamePickerInline";
import { JoinQuestionsManager } from "./JoinQuestionsManager";
import type { ClubDetail, GameOption } from "../_types";

export function ClubInfoPanel({ club, isAdmin, user, onJoin, joinPending, onUpdate, onRequestJoin, onCancelRequest }: {
  club: ClubDetail;
  isAdmin: boolean;
  user: { id: string; username: string; avatar?: string } | null;
  onJoin: () => void;
  joinPending: boolean;
  onUpdate: () => void;
  onRequestJoin: () => void;
  onCancelRequest: (reqId: string) => void;
}) {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing]       = useState(false);
  const [name, setName]             = useState(club.name);
  const [desc, setDesc]             = useState(club.description ?? "");
  const [genre, setGenre]           = useState(club.genre ?? "");
  const [isPrivate, setIsPrivate]   = useState(club.isPrivate);
  const [linkedGame, setLinkedGame] = useState<GameOption | null>(
    club.game ? { id: "", rawgId: club.game.rawgId, name: club.game.name, coverImage: club.game.coverImage } : null
  );
  const [uploading, setUploading]   = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reportingClub, setReportingClub] = useState(false);

  useEffect(() => {
    if (!editing) {
      setName(club.name);
      setDesc(club.description ?? "");
      setGenre(club.genre ?? "");
      setIsPrivate(club.isPrivate);
      setLinkedGame(club.game
        ? { id: "", rawgId: club.game.rawgId, name: club.game.name, coverImage: club.game.coverImage }
        : null
      );
    }
  }, [club.name, club.description, club.genre, club.game, club.isPrivate, editing]);

  const saveMutation = useMutation({
    mutationFn: () => api.patch(`/api/clubs/${club.id}`, {
      name: name.trim() || undefined,
      description: desc.trim() || undefined,
      genre: genre.trim() || undefined,
      isPrivate,
      rawgId: linkedGame?.rawgId || undefined,
      gameId: linkedGame ? undefined : null,
    }),
    onSuccess: () => { setEditing(false); onUpdate(); dispatchToast("Club updated", "success"); },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/clubs/${club.id}`),
    onSuccess: () => { dispatchToast("Club deleted", "success"); window.location.href = "/clubs"; },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed to delete", "error"),
  });

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const form = new FormData();
      form.append("avatar", file);
      await api.post(`/api/clubs/${club.id}/avatar`, form, { headers: { "Content-Type": "multipart/form-data" } });
      onUpdate();
      dispatchToast("Avatar updated", "success");
    } catch (err: any) {
      dispatchToast(err?.response?.data?.error ?? "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  }

  const coverImage = club.game?.coverImage ?? club.avatar ?? null;

  return (
    <aside className="flex flex-col gap-3 sticky top-18">
      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

      <div className="bg-gx-surface border border-gx-border rounded-[14px]">
        {/* Banner */}
        <div className="relative h-22 bg-gx-surface-2 overflow-hidden rounded-t-[13px]">
          {coverImage ? (
            <>
              <img src={coverImage} alt="" className="absolute inset-0 w-full h-full object-cover scale-110 opacity-[0.35] blur-sm" />
              <div className="absolute inset-0 bg-linear-to-b from-transparent to-gx-surface/85" />
            </>
          ) : (
            <div className="absolute inset-0 bg-linear-to-br from-gx-amber/8 to-transparent" />
          )}
        </div>

        {/* Avatar */}
        <div className="px-4 -mt-5.5 mb-1">
          <div className="relative w-11 h-11">
            {club.avatar || club.game?.coverImage ? (
              <img
                src={club.avatar ?? club.game!.coverImage!}
                alt={club.name}
                className="w-11 h-11 rounded-xl object-cover border-2 border-gx-surface block"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-gx-amber/13 border-2 border-gx-surface flex items-center justify-center">
                <Users size={18} style={{ color: "var(--gx-amber)" }} />
              </div>
            )}
            {isAdmin && (
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 rounded-xl bg-[rgba(0,0,0,0.55)] opacity-0 flex items-center justify-center transition-opacity hover:opacity-100"
                title="Change avatar"
              >
                {uploading
                  ? <span style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.6s linear infinite", display: "block" }} />
                  : <ImageIcon size={12} style={{ color: "#fff" }} />}
              </button>
            )}
          </div>
        </div>

        {/* Card body */}
        <div className="px-4 pb-4 flex flex-col gap-3">
          {editing ? (
            <div className="flex flex-col gap-2.5">
              <input
                value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Club name"
                className="w-full bg-gx-surface-2 border border-gx-border rounded-[10px] px-3 py-2.25 text-[13px] text-gx-text-1 outline-none transition-colors focus:border-gx-amber/30 placeholder:text-gx-text-3"
                style={{ fontWeight: 700 }}
              />
              <textarea
                value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={500} rows={3} placeholder="Description (optional)"
                className="w-full bg-gx-surface-2 border border-gx-border rounded-[10px] px-3 py-2.25 text-[13px] text-gx-text-1 outline-none transition-colors focus:border-gx-amber/30 placeholder:text-gx-text-3"
                style={{ resize: "none" }}
              />
              <input
                value={genre} onChange={(e) => setGenre(e.target.value)} maxLength={40} placeholder="Genre / Topic (e.g. RPG, Action…)"
                className="w-full bg-gx-surface-2 border border-gx-border rounded-[10px] px-3 py-2.25 text-[13px] text-gx-text-1 outline-none transition-colors focus:border-gx-amber/30 placeholder:text-gx-text-3"
              />
              <GamePickerInline selected={linkedGame} onSelect={setLinkedGame} />
              {/* Private toggle */}
              <button
                type="button"
                onClick={() => setIsPrivate((v) => !v)}
                className={clsx(
                  "w-full flex items-center gap-2 px-3 py-2.25 rounded-[10px] text-[12px] border transition-colors cursor-pointer",
                  isPrivate
                    ? "bg-gx-amber/10 border-gx-amber/30 text-gx-amber"
                    : "bg-gx-surface-2 border-gx-border text-gx-text-2 hover:border-gx-border-md"
                )}
              >
                <Lock size={11} />
                <span className="flex-1 text-left font-semibold">{isPrivate ? "Private Club" : "Public Club"}</span>
                <span className={clsx("w-8 h-4 rounded-full relative transition-colors", isPrivate ? "bg-gx-amber" : "bg-gx-surface-3")}>
                  <span className={clsx("absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all", isPrivate ? "right-0.5" : "left-0.5")} />
                </span>
              </button>
              {isPrivate && <JoinQuestionsManager clubId={club.id} />}
              <div className="flex gap-2">
                <button
                  onClick={() => saveMutation.mutate()}
                  disabled={!name.trim() || saveMutation.isPending}
                  className={gx.btnPrimary}
                  style={{ padding: "6px 16px", flex: 1, justifyContent: "center" }}
                >
                  <Check size={13} /> Save
                </button>
                <button
                  onClick={() => setEditing(false)}
                  style={{ padding: "6px 14px", borderRadius: 8, fontSize: 13, color: "var(--gx-text-2)", background: "none", border: "none", cursor: "pointer" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <h1 className="font-bebas text-[22px] tracking-[0.04em] text-gx-text-1 leading-[1.15] m-0">{club.name}</h1>
                  {club.isPrivate && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gx-amber bg-gx-amber/10 border border-gx-amber/25 rounded-full px-2 py-0.5 w-fit">
                      <Lock size={9} /> Private
                    </span>
                  )}
                </div>
                {isAdmin && (
                  <button
                    onClick={() => setEditing(true)}
                    style={{ padding: 4, color: "var(--gx-text-3)", background: "none", border: "none", cursor: "pointer", flexShrink: 0, transition: "color 0.15s", marginTop: 2 }}
                    title="Edit club info"
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gx-amber)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--gx-text-3)")}
                  >
                    <Pencil size={12} />
                  </button>
                )}
              </div>

              {club.description && (
                <p className="text-[12px] text-gx-text-2 leading-[1.6] m-0">{club.description}</p>
              )}

              <div className="flex flex-col gap-1.5">
                {club.genre && (
                  <span className="flex items-center gap-1.5 text-[11px] text-gx-text-3">
                    <Tag size={10} /> {club.genre}
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-[11px] text-gx-text-3">
                  <Users size={10} /> {club._count.members} members
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-gx-text-3">
                  <MessageCircle size={10} /> {club._count.posts} posts
                </span>
                {isAdmin && (
                  <span className="flex items-center gap-1.5 text-[11px] text-gx-amber">
                    <Shield size={10} /> Admin
                  </span>
                )}
              </div>
            </>
          )}

          {/* Join / Leave / Request */}
          {!editing && user && (
            club.isMember ? (
              <button
                onClick={onJoin} disabled={joinPending}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-bold cursor-pointer transition-all border bg-gx-surface-2 text-gx-text-2 border-gx-border-md hover:border-gx-red/30 hover:text-gx-red"
              >
                <UserMinus size={14} /> Leave Club
              </button>
            ) : club.isPrivate ? (
              club.myRequest?.status === "PENDING" ? (
                <div className="flex flex-col gap-1.5">
                  <div className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-semibold border bg-gx-surface-2 text-gx-text-3 border-gx-border-md">
                    <Clock size={13} /> Request Pending…
                  </div>
                  <button
                    onClick={() => onCancelRequest(club.myRequest!.id)}
                    className="text-[11px] text-gx-text-3 bg-transparent border-none cursor-pointer hover:text-gx-red transition-colors text-center"
                  >
                    Cancel request
                  </button>
                </div>
              ) : club.myRequest?.status === "REJECTED" ? (
                <div className="flex flex-col gap-1.5">
                  <div className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] border bg-gx-red/8 text-gx-red border-gx-red/20">
                    <AlertCircle size={12} /> Request Rejected
                  </div>
                  {club.myRequest.rejectionNote && (
                    <p className="text-[10px] text-gx-text-3 m-0 leading-[1.5] px-1">{club.myRequest.rejectionNote}</p>
                  )}
                  <button
                    onClick={onRequestJoin}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-semibold cursor-pointer transition-all border bg-gx-amber/10 text-gx-amber border-gx-amber/25 hover:bg-gx-amber/20"
                  >
                    <UserPlus size={13} /> Re-apply
                  </button>
                </div>
              ) : (
                <button
                  onClick={onRequestJoin}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-bold cursor-pointer transition-all border bg-gx-amber/13 text-gx-amber border-gx-amber/30 hover:bg-gx-amber/25"
                >
                  <Lock size={13} /> Request to Join
                </button>
              )
            ) : (
              <button
                onClick={onJoin} disabled={joinPending}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-bold cursor-pointer transition-all border bg-gx-amber/13 text-gx-amber border-gx-amber/30 hover:bg-gx-amber/25"
              >
                <UserPlus size={14} /> Join Club
              </button>
            )
          )}

          {/* Report */}
          {!editing && user && !isAdmin && club.isMember && (
            <button
              onClick={() => setReportingClub(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] text-gx-text-3 border border-gx-border bg-transparent cursor-pointer transition-all hover:text-gx-amber hover:border-gx-amber/30"
            >
              <Flag size={12} /> Report Club
            </button>
          )}
          {reportingClub && <ReportModal type="CLUB" targetId={club.id} onClose={() => setReportingClub(false)} />}

          {/* Delete */}
          {!editing && isAdmin && !confirmDelete && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] text-gx-red border border-gx-red/20 bg-transparent cursor-pointer transition-all hover:bg-gx-red/8"
            >
              <Trash2 size={12} /> Delete Club
            </button>
          )}
          {!editing && isAdmin && confirmDelete && (
            <div style={{ padding: 12, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              <p style={{ fontSize: 12, color: "var(--gx-red)", fontWeight: 600, margin: 0 }}>Delete this club?</p>
              <p style={{ fontSize: 10, color: "var(--gx-text-3)", margin: 0 }}>All posts and members will be removed.</p>
              <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                <button
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  style={{ flex: 1, padding: "5px 0", borderRadius: 7, fontSize: 11, background: "#DC2626", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600, opacity: deleteMutation.isPending ? 0.5 : 1 }}
                >
                  {deleteMutation.isPending ? "Deleting…" : "Delete"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{ flex: 1, padding: "5px 0", borderRadius: 7, fontSize: 11, background: "var(--gx-surface-2)", color: "var(--gx-text-2)", border: "none", cursor: "pointer" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Linked game card */}
      {club.game && !editing && (
        <div className={gx.sectionCard}>
          <p className={gx.sectionCardTitle}>Linked Game</p>
          <Link href={`/game/${club.game.rawgId}`} className="flex items-center gap-2.5 no-underline group">
            {club.game.coverImage && (
              <img src={club.game.coverImage} alt={club.game.name} className="w-7.5 h-10 rounded-[5px] object-cover shrink-0" />
            )}
            <span className="text-[12px] font-semibold text-gx-text-2 transition-colors group-hover:text-gx-amber leading-[1.4]">
              {club.game.name}
            </span>
          </Link>
        </div>
      )}

      {/* Creator card */}
      <div className={gx.sectionCard}>
        <p className={gx.sectionCardTitle}>Created By</p>
        <Link href={`/user/${club.creator.username}`} className="flex items-center gap-2 no-underline group">
          <Avatar src={club.creator.avatar} username={club.creator.username} size="sm" />
          <span className="text-[13px] font-semibold text-gx-text-2 transition-colors group-hover:text-gx-amber">
            {club.creator.username}
          </span>
        </Link>
      </div>
    </aside>
  );
}
