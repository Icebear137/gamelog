"use client";

import { type RefObject } from "react";
import { ExternalLink, Crown, Pencil, Shield, UserMinus, Check, X } from "lucide-react";
import { Text, Flex, Box } from "@radix-ui/themes";
import { IconButton, Input } from "@/components/ui";
import Avatar from "@/components/Avatar";
import type { GroupMember } from "@/lib/types";

interface Props {
  member: GroupMember;
  isMe: boolean;
  isAdmin: boolean;
  currentNickname?: string;
  editingNickname: boolean;
  nicknameInput: string;
  nicknameInputRef: RefObject<HTMLInputElement | null>;
  nicknamePending: boolean;
  roleChangePending: boolean;
  kickPending: boolean;
  onStartEditNickname: () => void;
  onNicknameChange: (v: string) => void;
  onSaveNickname: () => void;
  onCancelNickname: () => void;
  onViewProfile: () => void;
  onToggleRole: () => void;
  onKick: () => void;
}

export function MemberItem({
  member, isMe, isAdmin, currentNickname, editingNickname, nicknameInput, nicknameInputRef,
  nicknamePending, roleChangePending, kickPending,
  onStartEditNickname, onNicknameChange, onSaveNickname, onCancelNickname, onViewProfile, onToggleRole, onKick,
}: Props) {
  const isMemberAdmin = member.role === "admin";

  return (
    <div className="flex flex-col px-2 py-1.5 rounded-lg hover:bg-white/4 group/member">
      <Flex align="center" gap="2">
        <Avatar src={member.avatar ?? undefined} username={member.username} size="sm" />
        <Box flexGrow="1" minWidth="0">
          <Flex align="center" className="gap-1">
            <Text as="span" size="1" truncate className="text-white">{member.username}{isMe ? " (you)" : ""}</Text>
            {isMemberAdmin && <Crown size={9} className="text-amber-400 shrink-0" />}
          </Flex>
          {currentNickname && <Text as="p" className="text-[10px] text-gray-500 truncate">{currentNickname}</Text>}
        </Box>

        <div className="flex items-center gap-0.5 opacity-0 group-hover/member:opacity-100 transition-opacity">
          <IconButton label="Set nickname" size="xs" onClick={onStartEditNickname}>
            <Pencil size={11} />
          </IconButton>
          {!isMe && (
            <IconButton label="View profile" size="xs" onClick={onViewProfile}>
              <ExternalLink size={11} />
            </IconButton>
          )}
          {isAdmin && !isMe && (
            <IconButton
              label={isMemberAdmin ? "Remove admin" : "Make admin"}
              size="xs"
              variant={isMemberAdmin ? "amber" : "ghost"}
              loading={roleChangePending}
              onClick={onToggleRole}
            >
              <Shield size={11} />
            </IconButton>
          )}
          {isAdmin && !isMe && (
            <IconButton label="Remove from group" size="xs" variant="danger" loading={kickPending} onClick={onKick}>
              <UserMinus size={11} />
            </IconButton>
          )}
        </div>
      </Flex>

      {editingNickname && (
        <Flex align="center" className="gap-1 mt-1.5 w-full min-w-0">
          <Input
            ref={nicknameInputRef}
            value={nicknameInput}
            onChange={(e) => onNicknameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (nicknameInput.trim() || currentNickname)) onSaveNickname();
              if (e.key === "Escape") onCancelNickname();
            }}
            placeholder="Nickname…"
            maxLength={50}
            className="text-xs py-1 rounded-lg border-violet-500/40 focus:border-violet-500/80"
          />
          <IconButton
            label="Save"
            variant="success"
            size="xs"
            loading={nicknamePending}
            disabled={!nicknameInput.trim() && !currentNickname}
            onClick={onSaveNickname}
          >
            <Check size={11} />
          </IconButton>
          <IconButton label="Cancel" size="xs" onClick={onCancelNickname}>
            <X size={11} />
          </IconButton>
        </Flex>
      )}
    </div>
  );
}
