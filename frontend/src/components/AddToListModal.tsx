"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { List, Plus, Check, Loader2, Lock, Globe } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Text, Flex, Box } from "@radix-ui/themes";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { GameListPreview } from "@/lib/types";
import { dispatchToast } from "@/lib/toast";

interface Props {
  rawgId: number;
  gameName: string;
}

export default function AddToListModal({ rawgId, gameName }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const { data: lists = [], isLoading } = useQuery<GameListPreview[]>({
    queryKey: ["my-lists"],
    queryFn: () => api.get("/api/lists/me").then((r) => r.data),
    enabled: !!user && open,
  });

  const addMutation = useMutation({
    mutationFn: (listId: string) => api.post(`/api/lists/${listId}/games`, { rawgId }),
    onSuccess: (_, listId) => {
      qc.invalidateQueries({ queryKey: ["list", listId] });
      qc.invalidateQueries({ queryKey: ["my-lists"] });
      dispatchToast(`Added to list`, "success");
    },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed to add", "error"),
  });

  const createAndAddMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/api/lists", { name: newName.trim(), isPublic: true });
      const listId: string = res.data.id;
      await api.post(`/api/lists/${listId}/games`, { rawgId });
      return listId;
    },
    onSuccess: (listId) => {
      qc.invalidateQueries({ queryKey: ["my-lists"] });
      qc.invalidateQueries({ queryKey: ["list", listId] });
      setNewName("");
      setShowCreate(false);
      dispatchToast("Created list and added game", "success");
    },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed", "error"),
  });

  if (!user) return null;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="flex items-center gap-2 bg-white/8 hover:bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <List size={15} />
          Add to List
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 shadow-2xl outline-none">
          <Dialog.Title className="text-lg font-bold text-white mb-1">Add to List</Dialog.Title>
          <Dialog.Description className="text-gray-400 text-sm mb-4 truncate">{gameName}</Dialog.Description>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-gray-500" />
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
              {lists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => addMutation.mutate(list.id)}
                  disabled={addMutation.isPending}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/8 hover:bg-gray-700 transition-colors text-left disabled:opacity-60"
                >
                  <Box flexGrow="1" minWidth="0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-white truncate">{list.name}</span>
                      {list.isPublic ? <Globe size={11} className="text-gray-500 shrink-0" /> : <Lock size={11} className="text-gray-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-500">{list._count.entries} game{list._count.entries !== 1 ? "s" : ""}</p>
                  </Box>
                  <Plus size={15} className="text-gray-400 shrink-0" />
                </button>
              ))}
              {lists.length === 0 && !showCreate && (
                <Text as="p" size="2" color="gray" className="text-center py-4">No lists yet.</Text>
              )}
            </div>
          )}

          {showCreate ? (
            <div className="space-y-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New list name"
                maxLength={100}
                autoFocus
                className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-violet-500 transition-colors"
              />
              <Flex gap="2">
                <button
                  onClick={() => createAndAddMutation.mutate()}
                  disabled={!newName.trim() || createAndAddMutation.isPending}
                  className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-sm transition-colors"
                >
                  {createAndAddMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  Create & Add
                </button>
                <button
                  onClick={() => { setShowCreate(false); setNewName(""); }}
                  className="bg-white/8 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
              </Flex>
            </div>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center justify-center gap-2 border border-dashed border-white/15 hover:border-violet-600 rounded-xl py-2.5 text-sm text-gray-400 hover:text-violet-400 transition-colors"
            >
              <Plus size={15} />
              Create new list
            </button>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

