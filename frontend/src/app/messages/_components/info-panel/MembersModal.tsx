"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Users } from "lucide-react";
import { Text } from "@radix-ui/themes";
import { api } from "@/lib/api";
import { dispatchToast } from "@/lib/toast";
import type { GroupMember } from "@/lib/types";
import { AddMemberSearch } from "./AddMemberSearch";
import { MemberItem } from "./MemberItem";

interface UserResult { id: string; username: string; avatar?: string | null }

interface Props {
  conversationId: string;
  members: GroupMember[];
  isAdmin: boolean;
  meId: string;
  onClose: () => void;
}

export function MembersModal({ conversationId, members, isAdmin, meId, onClose }: Props) {
  const qc = useQueryClient();
  const router = useRouter();

  const [addOpen, setAddOpen] = useState(false);
  const [addQuery, setAddQuery] = useState("");
  const [addResults, setAddResults] = useState<UserResult[]>([]);
  const [addSearching, setAddSearching] = useState(false);
  const [editingNicknameFor, setEditingNicknameFor] = useState<string | null>(null);
  const [nicknameInput, setNicknameInput] = useState("");

  const nicknameInputRef = useRef<HTMLInputElement>(null);
  const addDebounceRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const memberIds = new Set(members.map((m) => m.id));

  const { data: nicknamesRaw = [] } = useQuery<{ userId: string; nickname: string }[]>({
    queryKey: ["nicknames", conversationId],
    queryFn: () => api.get(`/api/messages/conversations/${conversationId}/nicknames`).then((r) => r.data),
    staleTime: 30_000,
  });
  const nicknames = new Map(nicknamesRaw.map((n) => [n.userId, n.nickname]));

  useEffect(() => { if (editingNicknameFor) nicknameInputRef.current?.focus(); }, [editingNicknameFor]);

  useEffect(() => {
    if (addDebounceRef.current) clearTimeout(addDebounceRef.current);
    const q = addQuery.trim();
    if (!q) { setAddResults([]); return; }
    addDebounceRef.current = setTimeout(async () => {
      setAddSearching(true);
      try {
        const res = await api.get(`/api/users/search?q=${encodeURIComponent(q)}`);
        setAddResults((res.data as UserResult[]).filter((u) => !memberIds.has(u.id)));
      } catch { setAddResults([]); }
      finally { setAddSearching(false); }
    }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addQuery]);

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const addMemberMutation = useMutation({
    mutationFn: (userId: string) =>
      api.post(`/api/messages/conversations/${conversationId}/members`, { userId }),
    onSuccess: (_, userId) => {
      const added = addResults.find((u) => u.id === userId);
      setAddQuery(""); setAddResults([]); setAddOpen(false);
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-2">
            <Users size={15} className="text-violet-400" />
            <Text size="2" weight="bold">Members ({members.length})</Text>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-white/8 rounded-lg transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Add member */}
        {isAdmin && (
          <div className="px-3 pt-3 pb-2 border-b border-white/8 shrink-0">
            <AddMemberSearch
              open={addOpen}
              query={addQuery}
              results={addResults}
              searching={addSearching}
              addingId={addMemberMutation.isPending ? (addMemberMutation.variables as string) : undefined}
              onOpen={() => setAddOpen(true)}
              onClose={() => { setAddOpen(false); setAddQuery(""); setAddResults([]); }}
              onQueryChange={setAddQuery}
              onAdd={(userId) => addMemberMutation.mutate(userId)}
            />
          </div>
        )}

        {/* Member list */}
        <div className="overflow-y-auto px-3 py-2 space-y-0.5">
          {members.map((m) => (
            <MemberItem
              key={m.id}
              member={m}
              isMe={m.id === meId}
              isAdmin={isAdmin}
              currentNickname={nicknames.get(m.id)}
              editingNickname={editingNicknameFor === m.id}
              nicknameInput={nicknameInput}
              nicknameInputRef={nicknameInputRef}
              nicknamePending={nicknameMutation.isPending}
              roleChangePending={changeRoleMutation.isPending && changeRoleMutation.variables?.userId === m.id}
              kickPending={kickMutation.isPending && kickMutation.variables === m.id}
              onStartEditNickname={() => { setEditingNicknameFor(m.id); setNicknameInput(nicknames.get(m.id) ?? ""); }}
              onNicknameChange={setNicknameInput}
              onSaveNickname={() => nicknameMutation.mutate({ userId: m.id, nickname: nicknameInput })}
              onCancelNickname={() => setEditingNicknameFor(null)}
              onViewProfile={() => { router.push(`/user/${m.username}`); onClose(); }}
              onToggleRole={() => changeRoleMutation.mutate({ userId: m.id, role: m.role === "admin" ? "member" : "admin" })}
              onKick={() => kickMutation.mutate(m.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
