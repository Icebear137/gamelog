"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ExternalLink, Gamepad2, Users, UserPlus, UserMinus, Loader2,
  Crown, LogOut, Pencil, Check, X, Search, Camera, Shield,
} from "lucide-react";
import Image from "next/image";
import * as Separator from "@radix-ui/react-separator";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Conversation, User, GroupMember } from "@/lib/types";
import { dispatchToast } from "@/lib/toast";
import Avatar from "@/components/Avatar";

// ── Types ──────────────────────────────────────────────────────────────────
interface SharedGame {
  game: { id: string; rawgId: number; name: string; coverImage: string | null };
  me: { status: string; rating: number | null };
  them: { status: string; rating: number | null };
}
interface CompareData {
  stats: { sharedCount: number; myTotal: number; theirTotal: number };
  sharedGames: SharedGame[];
}
interface UserResult {
  id: string;
  username: string;
  avatar?: string | null;
}
interface MessagesQueryData {
  messages: unknown[];
  isGroup: boolean;
  groupName: string | null;
  groupAvatar: string | null;
  members: GroupMember[];
}

// ── Empty state ─────────────────────────────────────────────────────────────
function EmptyPanel() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 px-4 text-center">
      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
        <Users size={18} className="text-gray-600" />
      </div>
      <p className="text-xs text-gray-600 leading-relaxed">
        Select a conversation<br />to see details
      </p>
    </div>
  );
}

// ── Group Info Panel ─────────────────────────────────────────────────────────
function GroupInfoPanel({
  conversationId,
  conv,
  members,
}: {
  conversationId: string;
  conv: Conversation;
  members: GroupMember[];
}) {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();

  // ── Local state ──────────────────────────────────────────────────────────
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(conv.name ?? "");
  const [addOpen, setAddOpen] = useState(false);
  const [addQuery, setAddQuery] = useState("");
  const [addResults, setAddResults] = useState<UserResult[]>([]);
  const [addSearching, setAddSearching] = useState(false);
  const [editingNicknameFor, setEditingNicknameFor] = useState<string | null>(null);
  const [nicknameInput, setNicknameInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const nicknameInputRef = useRef<HTMLInputElement>(null);
  const addDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const myRole = members.find((m) => m.id === me?.id)?.role ?? "member";
  const isAdmin = myRole === "admin";
  const memberIds = new Set(members.map((m) => m.id));

  // ── Nicknames query ──────────────────────────────────────────────────────
  const { data: nicknamesRaw = [] } = useQuery<{ userId: string; nickname: string }[]>({
    queryKey: ["nicknames", conversationId],
    queryFn: () =>
      api.get(`/api/messages/conversations/${conversationId}/nicknames`).then((r) => r.data),
    staleTime: 30_000,
  });
  const nicknames = new Map(nicknamesRaw.map((n) => [n.userId, n.nickname]));

  // Focus name input when editing
  useEffect(() => {
    if (editingName) nameInputRef.current?.focus();
  }, [editingName]);

  // Focus nickname input when editing
  useEffect(() => {
    if (editingNicknameFor) nicknameInputRef.current?.focus();
  }, [editingNicknameFor]);

  // Debounced user search for add-member
  useEffect(() => {
    if (addDebounceRef.current) clearTimeout(addDebounceRef.current);
    const q = addQuery.trim();
    if (!q) { setAddResults([]); return; }
    addDebounceRef.current = setTimeout(async () => {
      setAddSearching(true);
      try {
        const res = await api.get(`/api/users/search?q=${encodeURIComponent(q)}`);
        // Filter out existing members
        setAddResults((res.data as UserResult[]).filter((u) => !memberIds.has(u.id)));
      } catch { setAddResults([]); }
      finally { setAddSearching(false); }
    }, 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addQuery]);

  // ── Mutations ────────────────────────────────────────────────────────────
  const renameMutation = useMutation({
    mutationFn: (name: string) =>
      api.patch(`/api/messages/conversations/${conversationId}/group`, { name }),
    onSuccess: () => {
      setEditingName(false);
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
    },
    onError: () => dispatchToast("Failed to rename group", "error"),
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("avatar", file);
      return api.post(`/api/messages/conversations/${conversationId}/avatar`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
      dispatchToast("Group avatar updated", "success");
    },
    onError: () => dispatchToast("Failed to upload avatar", "error"),
  });

  const addMemberMutation = useMutation({
    mutationFn: (userId: string) =>
      api.post(`/api/messages/conversations/${conversationId}/members`, { userId }),
    onSuccess: (_, userId) => {
      const added = addResults.find((u) => u.id === userId);
      setAddQuery("");
      setAddResults([]);
      setAddOpen(false);
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      if (added) dispatchToast(`${added.username} added to group`, "success");
    },
    onError: () => dispatchToast("Failed to add member", "error"),
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: "admin" | "member" }) =>
      api.patch(`/api/messages/conversations/${conversationId}/members/${userId}/role`, { role }),
    onSuccess: (_, { role, userId }) => {
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
      const target = members.find((m) => m.id === userId);
      dispatchToast(
        role === "admin"
          ? `${target?.username ?? "Member"} is now an admin`
          : `${target?.username ?? "Member"} is now a regular member`,
        "success"
      );
    },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed to change role", "error"),
  });

  const kickMutation = useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/api/messages/conversations/${conversationId}/members/${userId}`),
    onSuccess: (_, userId) => {
      const kicked = members.find((m) => m.id === userId);
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      if (kicked) dispatchToast(`${kicked.username} removed from group`, "success");
    },
    onError: () => dispatchToast("Failed to remove member", "error"),
  });

  const nicknameMutation = useMutation({
    mutationFn: ({ userId, nickname }: { userId: string; nickname: string }) =>
      api.put(`/api/messages/conversations/${conversationId}/nicknames/${userId}`, { nickname }),
    onSuccess: () => {
      setEditingNicknameFor(null);
      qc.invalidateQueries({ queryKey: ["nicknames", conversationId] });
    },
    onError: () => dispatchToast("Failed to save nickname", "error"),
  });

  const leaveMutation = useMutation({
    mutationFn: () =>
      api.delete(`/api/messages/conversations/${conversationId}/members/${me!.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      router.push("/messages");
    },
    onError: () => dispatchToast("Failed to leave group", "error"),
  });

  return (
    <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden">

      {/* ── Avatar + Name ───────────────────────────────────── */}
      <div className="flex flex-col items-center gap-2 px-4 pt-5 pb-4">

        {/* Avatar */}
        <div className="relative group/avatar">
          {conv.avatar ? (
            <div className="w-14 h-14 rounded-full overflow-hidden">
              <Image
                src={conv.avatar}
                alt={conv.name ?? "Group"}
                width={56}
                height={56}
                className="object-cover w-full h-full"
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-full bg-violet-700/40 flex items-center justify-center">
              <Users size={22} className="text-violet-300" />
            </div>
          )}
          {isAdmin && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadAvatarMutation.isPending}
                className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer"
                title="Change group avatar"
              >
                {uploadAvatarMutation.isPending
                  ? <Loader2 size={16} className="animate-spin text-white" />
                  : <Camera size={16} className="text-white" />
                }
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadAvatarMutation.mutate(file);
                  e.target.value = "";
                }}
              />
            </>
          )}
        </div>

        {/* Group name */}
        {editingName ? (
          <div className="flex items-center gap-1.5 w-full px-1">
            <input
              ref={nameInputRef}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && nameInput.trim()) renameMutation.mutate(nameInput.trim());
                if (e.key === "Escape") { setEditingName(false); setNameInput(conv.name ?? ""); }
              }}
              maxLength={64}
              className="flex-1 bg-white/8 border border-violet-500/50 rounded-lg px-2 py-1 text-sm text-white outline-none text-center"
            />
            <button
              onClick={() => { if (nameInput.trim()) renameMutation.mutate(nameInput.trim()); }}
              disabled={renameMutation.isPending || !nameInput.trim()}
              className="p-1 rounded-md text-emerald-400 hover:bg-white/8 disabled:opacity-40 transition-colors"
            >
              {renameMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            </button>
            <button
              onClick={() => { setEditingName(false); setNameInput(conv.name ?? ""); }}
              className="p-1 rounded-md text-gray-500 hover:bg-white/8 transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 min-w-0 max-w-full">
            <p className="font-semibold text-white text-sm truncate">{conv.name ?? "Group"}</p>
            {isAdmin && (
              <button
                onClick={() => { setNameInput(conv.name ?? ""); setEditingName(true); }}
                className="p-1 rounded-md text-gray-600 hover:text-gray-300 hover:bg-white/8 transition-colors shrink-0"
                title="Rename group"
              >
                <Pencil size={11} />
              </button>
            )}
          </div>
        )}

        <p className="text-xs text-gray-500">{members.length} members</p>
      </div>

      <Separator.Root className="h-px bg-white/8 mx-4" />

      {/* ── Add member (admin only) ──────────────────────────── */}
      {isAdmin && (
        <div className="px-3 pt-3 pb-2">
          {!addOpen ? (
            <button
              onClick={() => setAddOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 border border-violet-500/20 hover:border-violet-500/40 transition-all"
            >
              <UserPlus size={13} />
              Add member
            </button>
          ) : (
            <div className="bg-white/4 rounded-xl border border-white/8 overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-white/8">
                <Search size={12} className="text-gray-500 shrink-0" />
                <input
                  autoFocus
                  value={addQuery}
                  onChange={(e) => setAddQuery(e.target.value)}
                  placeholder="Search users…"
                  className="flex-1 bg-transparent text-xs text-white outline-none placeholder-gray-600"
                />
                {addSearching
                  ? <Loader2 size={11} className="animate-spin text-gray-500 shrink-0" />
                  : <button onClick={() => { setAddOpen(false); setAddQuery(""); setAddResults([]); }} className="text-gray-600 hover:text-gray-400 transition-colors shrink-0"><X size={11} /></button>
                }
              </div>
              <div className="max-h-36 overflow-y-auto">
                {addQuery.trim() && !addSearching && addResults.length === 0 && (
                  <p className="py-4 text-center text-[10px] text-gray-600">No users found</p>
                )}
                {!addQuery.trim() && (
                  <p className="py-4 text-center text-[10px] text-gray-600">Type to search</p>
                )}
                {addResults.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => addMemberMutation.mutate(u.id)}
                    disabled={addMemberMutation.isPending}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/6 transition-colors text-left disabled:opacity-50"
                  >
                    <Avatar src={u.avatar ?? undefined} username={u.username} size="sm" />
                    <span className="flex-1 text-xs text-white truncate">{u.username}</span>
                    {addMemberMutation.isPending
                      ? <Loader2 size={11} className="animate-spin text-gray-500 shrink-0" />
                      : <UserPlus size={11} className="text-gray-600 shrink-0" />
                    }
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Members list ─────────────────────────────────────── */}
      <div className="px-3 py-2 flex-1">
        <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider px-1 mb-1.5">Members</p>
        <div className="space-y-0.5">
          {members.map((m) => {
            const isMe = m.id === me?.id;
            const isMemberAdmin = m.role === "admin";
            const currentNickname = nicknames.get(m.id);
            const isEditingThisNickname = editingNicknameFor === m.id;
            return (
              <div key={m.id} className="flex flex-col px-2 py-1.5 rounded-lg hover:bg-white/4 group/member">
                <div className="flex items-center gap-2">
                  <Avatar src={m.avatar ?? undefined} username={m.username} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-white truncate">
                        {m.username}{isMe ? " (you)" : ""}
                      </span>
                      {isMemberAdmin && (
                        <Crown size={9} className="text-amber-400 shrink-0" />
                      )}
                    </div>
                    {currentNickname && (
                      <p className="text-[10px] text-gray-500 truncate">{currentNickname}</p>
                    )}
                  </div>

                  {/* Actions — visible on hover */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover/member:opacity-100 transition-opacity">
                    {/* Set nickname (any participant) */}
                    <button
                      onClick={() => {
                        setEditingNicknameFor(m.id);
                        setNicknameInput(currentNickname ?? "");
                      }}
                      title="Set nickname"
                      className="p-1 rounded text-gray-600 hover:text-violet-400 transition-colors"
                    >
                      <Pencil size={11} />
                    </button>
                    {/* View profile */}
                    {!isMe && (
                      <button
                        onClick={() => router.push(`/user/${m.username}`)}
                        title="View profile"
                        className="p-1 rounded text-gray-600 hover:text-gray-300 transition-colors"
                      >
                        <ExternalLink size={11} />
                      </button>
                    )}
                    {/* Promote / demote (admin only, not on self) */}
                    {isAdmin && !isMe && (
                      <button
                        onClick={() => changeRoleMutation.mutate({
                          userId: m.id,
                          role: isMemberAdmin ? "member" : "admin",
                        })}
                        disabled={changeRoleMutation.isPending}
                        title={isMemberAdmin ? "Remove admin" : "Make admin"}
                        className={`p-1 rounded transition-colors ${isMemberAdmin ? "text-amber-500 hover:text-amber-400" : "text-gray-600 hover:text-amber-400"}`}
                      >
                        <Shield size={11} />
                      </button>
                  )}
                    {/* Kick (admin only, not on self) */}
                    {isAdmin && !isMe && (
                      <button
                        onClick={() => kickMutation.mutate(m.id)}
                        disabled={kickMutation.isPending}
                        title="Remove from group"
                        className="p-1 rounded text-gray-600 hover:text-red-400 transition-colors"
                      >
                        <UserMinus size={11} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline nickname editor */}
                {isEditingThisNickname && (
                  <div className="flex items-center gap-1 mt-1.5 w-full min-w-0">
                    <input
                      ref={nicknameInputRef}
                      value={nicknameInput}
                      onChange={(e) => setNicknameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") nicknameMutation.mutate({ userId: m.id, nickname: nicknameInput });
                        if (e.key === "Escape") setEditingNicknameFor(null);
                      }}
                      placeholder={`Nickname…`}
                      maxLength={50}
                      className="flex-1 min-w-0 bg-white/8 border border-violet-500/40 rounded-lg px-2 py-1 text-xs text-white outline-none placeholder-gray-600 focus:border-violet-500/80 transition-colors"
                    />
                    <button
                      onClick={() => nicknameMutation.mutate({ userId: m.id, nickname: nicknameInput })}
                      disabled={nicknameMutation.isPending}
                      className="p-1 rounded text-emerald-400 hover:bg-white/8 disabled:opacity-40 transition-colors shrink-0"
                    >
                      {nicknameMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                    </button>
                    <button
                      onClick={() => setEditingNicknameFor(null)}
                      className="p-1 rounded text-gray-500 hover:bg-white/8 transition-colors shrink-0"
                    >
                      <X size={11} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Separator.Root className="h-px bg-white/8 mx-4" />

      {/* ── Leave group ─────────────────────────────────────── */}
      <div className="px-4 py-3">
        <button
          onClick={() => leaveMutation.mutate()}
          disabled={leaveMutation.isPending}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-40"
        >
          {leaveMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <LogOut size={12} />}
          Leave group
        </button>
      </div>
    </div>
  );
}

// ── Main panel ──────────────────────────────────────────────────────────────
export default function ConversationInfoPanel() {
  const pathname = usePathname();
  const router = useRouter();
  const { user: me } = useAuth();
  const qc = useQueryClient();

  const conversationId = pathname.startsWith("/messages/")
    ? pathname.split("/messages/")[1]
    : null;

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: () => api.get("/api/messages/conversations").then((r) => r.data),
    enabled: !!me,
    staleTime: 60_000,
  });

  const conv = conversationId ? conversations.find((c) => c.id === conversationId) : null;

  // For group: subscribe to the messages query so members update reactively after mutations
  const { data: messagesData } = useQuery<MessagesQueryData>({
    queryKey: ["messages", conversationId],
    queryFn: () =>
      api.get(`/api/messages/conversations/${conversationId}?limit=30`).then((r) => r.data),
    enabled: !!conversationId && !!conv?.isGroup,
    staleTime: 30_000,
  });

  const otherUser = conv?.otherUser ?? null;

  // Full profile — DM only
  const { data: profile } = useQuery<User>({
    queryKey: ["profile", otherUser?.username],
    queryFn: () => api.get(`/api/users/${otherUser!.username}`).then((r) => r.data),
    enabled: !!otherUser?.username && !conv?.isGroup,
    staleTime: 60_000,
  });

  // Shared games — DM only
  const { data: compareData } = useQuery<CompareData>({
    queryKey: ["compare", otherUser?.username],
    queryFn: () => api.get(`/api/users/${otherUser!.username}/compare`).then((r) => r.data),
    enabled: !!otherUser?.username && !!me && !conv?.isGroup,
    staleTime: 120_000,
  });

  // Follow / Unfollow — DM only
  const followMutation = useMutation({
    mutationFn: (currentlyFollowing: boolean) =>
      currentlyFollowing
        ? api.delete(`/api/users/${otherUser!.username}/follow`)
        : api.post(`/api/users/${otherUser!.username}/follow`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile", otherUser?.username] }),
  });

  if (!conversationId) return <EmptyPanel />;

  // Group conversation
  if (conv?.isGroup) {
    const members: GroupMember[] = messagesData?.members ?? conv.participants.map((p) => ({
      id: p.id,
      username: p.username,
      avatar: p.avatar,
      role: "member" as const,
    }));
    return <GroupInfoPanel conversationId={conversationId} conv={conv} members={members} />;
  }

  // Loading skeleton
  if (!otherUser) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 pt-6 animate-pulse">
        <div className="w-14 h-14 rounded-full bg-white/8" />
        <div className="h-3 w-24 rounded bg-white/8" />
        <div className="h-2 w-32 rounded bg-white/6" />
      </div>
    );
  }

  const isFollowing = profile?.isFollowing ?? false;
  const sharedGames = compareData?.sharedGames.slice(0, 6) ?? [];
  const sharedCount = compareData?.stats.sharedCount ?? 0;

  return (
    <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden">

      {/* ── Profile section ─────────────────────────────────── */}
      <div className="flex flex-col items-center gap-2.5 px-4 pt-6 pb-4">
        <Avatar src={otherUser.avatar} username={otherUser.username} size="lg" />
        <div className="text-center min-w-0 w-full">
          <p className="font-semibold text-white text-sm truncate">{otherUser.username}</p>
          {profile?.bio && (
            <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-3 px-1">{profile.bio}</p>
          )}
        </div>
        <div className="flex gap-2 w-full mt-1">
          {me && me.id !== otherUser.id && (
            <button
              onClick={() => followMutation.mutate(isFollowing)}
              disabled={followMutation.isPending}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isFollowing ? "bg-white/8 hover:bg-white/12 text-gray-300" : "bg-violet-600/80 hover:bg-violet-500 text-white"
              }`}
            >
              {followMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : isFollowing ? <><UserMinus size={11} />Following</> : <><UserPlus size={11} />Follow</>}
            </button>
          )}
          <button
            onClick={() => router.push(`/user/${otherUser.username}`)}
            title="View profile"
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <ExternalLink size={13} />
          </button>
        </div>
      </div>

      <Separator.Root className="h-px bg-white/8 mx-4" />

      {/* ── Stats row ────────────────────────────────────────── */}
      {compareData && (
        <div className="flex items-center justify-around px-4 py-3">
          <div className="text-center">
            <p className="text-sm font-bold text-white">{compareData.stats.myTotal}</p>
            <p className="text-[10px] text-gray-600 mt-0.5">My games</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-violet-400">{sharedCount}</p>
            <p className="text-[10px] text-gray-600 mt-0.5">In common</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-white">{compareData.stats.theirTotal}</p>
            <p className="text-[10px] text-gray-600 mt-0.5">Their games</p>
          </div>
        </div>
      )}
      {compareData && <Separator.Root className="h-px bg-white/8 mx-4" />}

      {/* ── Shared games ─────────────────────────────────────── */}
      <div className="px-4 py-3 flex-1">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <Gamepad2 size={12} className="text-gray-500" />
            <span className="text-xs font-medium text-gray-400">Shared games</span>
          </div>
          {sharedCount > 0 && (
            <button onClick={() => router.push(`/user/${otherUser.username}/compare`)} className="text-[10px] text-violet-400 hover:text-violet-300 transition-colors">
              See all →
            </button>
          )}
        </div>
        {!compareData && (
          <div className="grid grid-cols-3 gap-1.5 animate-pulse">
            {[...Array(6)].map((_, i) => <div key={i} className="aspect-3/4 rounded-md bg-white/8" />)}
          </div>
        )}
        {compareData && sharedGames.length === 0 && (
          <div className="text-center py-4">
            <p className="text-xs text-gray-600">No games in common yet</p>
          </div>
        )}
        {sharedGames.length > 0 && (
          <div className="grid grid-cols-3 gap-1.5">
            {sharedGames.map(({ game }) => (
              <button
                key={game.id}
                onClick={() => router.push(`/game/${game.rawgId}`)}
                title={game.name}
                className="aspect-3/4 rounded-md overflow-hidden bg-white/5 hover:ring-1 hover:ring-violet-500/60 transition-all relative group"
              >
                {game.coverImage ? (
                  <Image src={game.coverImage} alt={game.name} fill className="object-cover group-hover:scale-105 transition-transform duration-200" sizes="64px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Gamepad2 size={14} className="text-gray-600" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
