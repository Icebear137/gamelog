"use client";

import { Search, X, UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import Avatar from "@/components/Avatar";
import { Flex, Box, Text } from "@radix-ui/themes";

interface UserResult { id: string; username: string; avatar?: string | null }

interface Props {
  open: boolean;
  query: string;
  results: UserResult[];
  searching: boolean;
  addingId?: string;
  onOpen: () => void;
  onClose: () => void;
  onQueryChange: (q: string) => void;
  onAdd: (userId: string) => void;
}

export function AddMemberSearch({ open, query, results, searching, addingId, onOpen, onClose, onQueryChange, onAdd }: Props) {
  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onOpen}
        className="w-full border-violet-500/20 text-violet-400 hover:text-violet-300 hover:border-violet-500/40 hover:bg-violet-500/10"
        icon={<UserPlus size={13} />}
      >
        Add member
      </Button>
    );
  }

  return (
    <div className="bg-white/4 rounded-xl border border-white/8 overflow-hidden">
      <Flex align="center" gap="2" px="3" py="2" className="border-b border-white/8">
        <Search size={12} className="text-gray-500 shrink-0" />
        <input
          autoFocus
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search users…"
          className="flex-1 bg-transparent text-xs text-white outline-none placeholder-gray-600"
        />
        {searching
          ? <Loader2 size={11} className="animate-spin text-gray-500 shrink-0" />
          : <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition-colors shrink-0"><X size={11} /></button>
        }
      </Flex>
      <div className="max-h-36 overflow-y-auto">
        {!query.trim() && <p className="py-4 text-center text-[10px] text-gray-600">Type to search</p>}
        {query.trim() && !searching && results.length === 0 && (
          <p className="py-4 text-center text-[10px] text-gray-600">No users found</p>
        )}
        {results.map((u) => (
          <button
            key={u.id}
            onClick={() => onAdd(u.id)}
            disabled={addingId === u.id}
            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/6 transition-colors text-left disabled:opacity-50"
          >
            <Avatar src={u.avatar ?? undefined} username={u.username} size="sm" />
            <Box flexGrow="1" minWidth="0" className="truncate">
              <Text as="span" size="2" className="text-white truncate">{u.username}</Text>
            </Box>
            {addingId === u.id
              ? <Loader2 size={11} className="animate-spin text-gray-500 shrink-0" />
              : <UserPlus size={11} className="text-gray-600 shrink-0" />
            }
          </button>
        ))}
      </div>
    </div>
  );
}
