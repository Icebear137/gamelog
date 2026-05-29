"use client";

import { type RefObject } from "react";
import Image from "next/image";
import { Users, Camera, Pencil, Check, X, Loader2 } from "lucide-react";
import { Text, Flex } from "@radix-ui/themes";
import { IconButton, Input } from "@/components/ui";
import type { Conversation } from "@/lib/types";

interface Props {
  conv: Conversation;
  isAdmin: boolean;
  membersCount: number;
  editingName: boolean;
  nameInput: string;
  nameInputRef: RefObject<HTMLInputElement | null>;
  renamePending: boolean;
  uploadPending: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onNameChange: (v: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onConfirmEdit: () => void;
  onAvatarFileChange: (file: File) => void;
}

export function GroupHeader({
  conv, isAdmin, membersCount, editingName, nameInput, nameInputRef,
  renamePending, uploadPending, fileInputRef,
  onNameChange, onStartEdit, onCancelEdit, onConfirmEdit, onAvatarFileChange,
}: Props) {
  return (
    <Flex direction="column" align="center" gap="2" className="px-4 pt-5 pb-4">
      <div className="relative group/avatar">
        {conv.avatar ? (
          <div className="w-14 h-14 rounded-full overflow-hidden">
            <Image src={conv.avatar} alt={conv.name ?? "Group"} width={56} height={56} className="object-cover w-full h-full" />
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
              disabled={uploadPending}
              className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer"
              title="Change group avatar"
            >
              {uploadPending
                ? <Loader2 size={16} className="animate-spin text-white" />
                : <Camera size={16} className="text-white" />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onAvatarFileChange(file);
                e.target.value = "";
              }}
            />
          </>
        )}
      </div>

      {editingName ? (
        <Flex align="center" className="gap-1.5 w-full px-1">
          <Input
            ref={nameInputRef}
            value={nameInput}
            onChange={(e) => onNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && nameInput.trim()) onConfirmEdit();
              if (e.key === "Escape") onCancelEdit();
            }}
            maxLength={64}
            className="text-center border-violet-500/50"
          />
          <IconButton label="Save" variant="success" onClick={onConfirmEdit} disabled={!nameInput.trim()} loading={renamePending}>
            <Check size={13} />
          </IconButton>
          <IconButton label="Cancel" onClick={onCancelEdit}>
            <X size={13} />
          </IconButton>
        </Flex>
      ) : (
        <Flex align="center" className="gap-1.5 min-w-0 max-w-full">
          <Text as="span" size="2" truncate className="font-semibold text-white">{conv.name ?? "Group"}</Text>
          {isAdmin && (
            <IconButton label="Rename group" size="xs" onClick={onStartEdit}>
              <Pencil size={11} />
            </IconButton>
          )}
        </Flex>
      )}

      <Text as="p" size="1" color="gray">{membersCount} members</Text>
    </Flex>
  );
}
