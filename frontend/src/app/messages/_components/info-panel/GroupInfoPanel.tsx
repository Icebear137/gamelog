"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import * as Separator from "@radix-ui/react-separator";
import { Text } from "@radix-ui/themes";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui";
import { dispatchToast } from "@/lib/toast";
import type { Conversation, GroupMember, GameNightData } from "@/lib/types";
import { GroupHeader } from "./GroupHeader";
import { AddMemberSearch } from "./AddMemberSearch";
import { MemberItem } from "./MemberItem";
import { UpcomingEvents } from "./UpcomingEvents";

interface UserResult { id: string; username: string; avatar?: string | null }

interface Props {
  conversationId: string;
  conv: Conversation;
  members: GroupMember[];
}

export function GroupInfoPanel({ conversationId, conv, members }: Props) {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();

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

  const { data: nicknamesRaw = [] } = useQuery<{ userId: string; nickname: string }[]>({
    queryKey: ["nicknames", conversationId],
    queryFn: () => api.get(`/api/messages/conversations/${conversationId}/nicknames`).then((r) => r.data),
    staleTime: 30_000,
  });
  const nicknames = new Map(nicknamesRaw.map((n) => [n.userId, n.nickname]));

  const { data: gameNights = [] } = useQuery<GameNightData[]>({
    queryKey: ["game-nights", conversationId],
    queryFn: () => api.get(`/api/messages/conversations/${conversationId}/game-nights`).then((r) => r.data),
    staleTime: 60_000,
  });

  useEffect(() => { if (editingName) nameInputRef.current?.focus(); }, [editingName]);
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

  const renameMutation = useMutation({
    mutationFn: (name: string) => api.patch(`/api/messages/conversations/${conversationId}/group`, { name }),
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

  const leaveMutation = useMutation({
    mutationFn: () => api.delete(`/api/messages/conversations/${conversationId}/members/${me!.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      router.push("/messages");
    },
    onError: () => dispatchToast("Failed to leave group", "error"),
  });

  return (
    <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden">
      <GroupHeader
        conv={conv}
        isAdmin={isAdmin}
        membersCount={members.length}
        editingName={editingName}
        nameInput={nameInput}
        nameInputRef={nameInputRef}
        renamePending={renameMutation.isPending}
        uploadPending={uploadAvatarMutation.isPending}
        fileInputRef={fileInputRef}
        onNameChange={setNameInput}
        onStartEdit={() => { setNameInput(conv.name ?? ""); setEditingName(true); }}
        onCancelEdit={() => { setEditingName(false); setNameInput(conv.name ?? ""); }}
        onConfirmEdit={() => { if (nameInput.trim()) renameMutation.mutate(nameInput.trim()); }}
        onAvatarFileChange={(file) => uploadAvatarMutation.mutate(file)}
      />

      <Separator.Root className="h-px bg-white/8 mx-4" />

      {isAdmin && (
        <div className="px-3 pt-3 pb-2">
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

      <div className="px-3 py-2 flex-1">
        <Text as="p" className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider px-1 mb-1.5">Members</Text>
        <div className="space-y-0.5">
          {members.map((m) => (
            <MemberItem
              key={m.id}
              member={m}
              isMe={m.id === me?.id}
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
              onViewProfile={() => router.push(`/user/${m.username}`)}
              onToggleRole={() => changeRoleMutation.mutate({ userId: m.id, role: m.role === "admin" ? "member" : "admin" })}
              onKick={() => kickMutation.mutate(m.id)}
            />
          ))}
        </div>
      </div>

      <Separator.Root className="h-px bg-white/8 mx-4" />

      <UpcomingEvents gameNights={gameNights} />
      {gameNights.length > 0 && <Separator.Root className="h-px bg-white/8 mx-4" />}

      <div className="px-4 py-3">
        <Button
          variant="danger"
          size="sm"
          loading={leaveMutation.isPending}
          onClick={() => leaveMutation.mutate()}
          className="w-full justify-center"
          icon={<LogOut size={12} />}
        >
          Leave group
        </Button>
      </div>
    </div>
  );
}
