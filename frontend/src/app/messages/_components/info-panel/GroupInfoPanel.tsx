"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOut, Users, ChevronRight } from "lucide-react";
import * as Separator from "@radix-ui/react-separator";
import { Text } from "@radix-ui/themes";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui";
import { dispatchToast } from "@/lib/toast";
import type { Conversation, GroupMember, GameNightData } from "@/lib/types";
import { GroupHeader } from "./GroupHeader";
import { UpcomingEvents } from "./UpcomingEvents";
import { MembersModal } from "./MembersModal";
import { SharedFilesPanel } from "./SharedFilesPanel";
import { SharedImagesPanel } from "./SharedImagesPanel";
import { NotificationSettings } from "./NotificationSettings";

interface Props {
  conversationId: string;
  conv: Conversation;
  members: GroupMember[];
}

export function GroupInfoPanel({ conversationId, conv, members }: Props) {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();

  const [editingName, setEditingName]     = useState(false);
  const [nameInput, setNameInput]         = useState(conv.name ?? "");
  const [membersOpen, setMembersOpen]     = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const myRole  = members.find((m) => m.id === me?.id)?.role ?? "member";
  const isAdmin = myRole === "admin";

  const { data: gameNights = [] } = useQuery<GameNightData[]>({
    queryKey: ["game-nights", conversationId],
    queryFn: () => api.get(`/api/messages/conversations/${conversationId}/game-nights`).then((r) => r.data),
    staleTime: 60_000,
  });

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

      {/* Members button */}
      <button
        onClick={() => setMembersOpen(true)}
        className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left w-full"
      >
        <div className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center shrink-0">
          <Users size={14} className="text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <Text as="p" size="2" className="text-white font-medium">Members</Text>
          <Text as="p" size="1" color="gray">{members.length} member{members.length !== 1 ? "s" : ""}</Text>
        </div>
        <ChevronRight size={14} className="text-gray-600 shrink-0" />
      </button>

      <Separator.Root className="h-px bg-white/8 mx-4" />

      <UpcomingEvents gameNights={gameNights} />
      {gameNights.length > 0 && <Separator.Root className="h-px bg-white/8 mx-4" />}

      <NotificationSettings conversationId={conversationId} mutedUntil={conv.mutedUntil} />
      <SharedImagesPanel conversationId={conversationId} />
      <SharedFilesPanel conversationId={conversationId} />

      <Separator.Root className="h-px bg-white/8 mx-4" />

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

      {membersOpen && me && (
        <MembersModal
          conversationId={conversationId}
          members={members}
          isAdmin={isAdmin}
          meId={me.id}
          onClose={() => setMembersOpen(false)}
        />
      )}
    </div>
  );
}
