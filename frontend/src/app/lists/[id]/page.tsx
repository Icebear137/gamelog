"use client";

import { use, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Slot } from "@radix-ui/react-slot";
import * as Dialog from "@radix-ui/react-dialog";
import * as Label from "@radix-ui/react-label";
import * as Select from "@radix-ui/react-select";
import * as Separator from "@radix-ui/react-separator";
import { Gamepad2, Globe, Lock, Pencil, Trash2, X, Check, ChevronDown, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { GameListDetail } from "@/lib/types";
import { dispatchToast } from "@/lib/toast";

const SORT_OPTIONS = [
  { value: "added-desc", label: "Newest Added" },
  { value: "added-asc", label: "Oldest Added" },
  { value: "name-asc", label: "Name A → Z" },
  { value: "name-desc", label: "Name Z → A" },
];

export default function ListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPublic, setEditPublic] = useState(true);
  const [sort, setSort] = useState("added-desc");
  const [genreFilter, setGenreFilter] = useState("all");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: list, isLoading } = useQuery<GameListDetail>({
    queryKey: ["list", id],
    queryFn: () => api.get(`/api/lists/${id}`).then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; isPublic: boolean }) =>
      api.patch(`/api/lists/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["list", id] });
      qc.invalidateQueries({ queryKey: ["my-lists"] });
      setEditing(false);
      dispatchToast("List updated", "success");
    },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed to update", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/lists/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-lists"] });
      dispatchToast("List deleted", "success");
      router.push("/lists");
    },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed to delete", "error"),
  });

  const removeGameMutation = useMutation({
    mutationFn: (gameId: string) => api.delete(`/api/lists/${id}/games/${gameId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["list", id] });
      qc.invalidateQueries({ queryKey: ["my-lists"] });
      dispatchToast("Removed from list", "success");
    },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed to remove", "error"),
  });

  const allGenres = useMemo(() => {
    if (!list) return [];
    const set = new Set<string>();
    list.entries.forEach((e) => e.game.genres?.forEach((g) => set.add(g)));
    return Array.from(set).sort();
  }, [list]);

  const displayedEntries = useMemo(() => {
    if (!list) return [];
    let entries = [...list.entries];
    if (genreFilter !== "all") {
      entries = entries.filter((e) => e.game.genres?.includes(genreFilter));
    }
    switch (sort) {
      case "name-asc": return entries.sort((a, b) => a.game.name.localeCompare(b.game.name));
      case "name-desc": return entries.sort((a, b) => b.game.name.localeCompare(a.game.name));
      case "added-asc": return entries.sort((a, b) => new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime());
      default: return entries.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
    }
  }, [list, sort, genreFilter]);

  if (isLoading) return <div className="text-gray-500 py-16 text-center">Loading...</div>;
  if (!list) return <div className="text-gray-500 py-16 text-center">List not found</div>;

  const isOwner = user?.id === list.user.id;

  const startEdit = () => {
    setEditName(list.name);
    setEditDesc(list.description ?? "");
    setEditPublic(list.isPublic);
    setEditing(true);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl p-6">
        {editing ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label.Root htmlFor="edit-list-name" className="block text-gray-400 text-xs">
                List name
              </Label.Root>
              <input
                id="edit-list-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={100}
                className="w-full bg-white/8 border border-white/15 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-500 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <Label.Root htmlFor="edit-list-desc" className="block text-gray-400 text-xs">
                Description
              </Label.Root>
              <textarea
                id="edit-list-desc"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Description (optional)"
                maxLength={500}
                rows={2}
                className="w-full bg-white/8 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-violet-500 transition-colors resize-none"
              />
            </div>
            <Label.Root htmlFor="edit-list-public" className="flex items-center gap-2 cursor-pointer">
              <input
                id="edit-list-public"
                type="checkbox"
                checked={editPublic}
                onChange={(e) => setEditPublic(e.target.checked)}
                className="w-4 h-4 accent-violet-600"
              />
              <span className="text-sm text-gray-300">Public list</span>
            </Label.Root>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (!editName.trim()) return;
                  updateMutation.mutate({
                    name: editName.trim(),
                    description: editDesc.trim() || undefined,
                    isPublic: editPublic,
                  });
                }}
                disabled={!editName.trim() || updateMutation.isPending}
                className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-sm transition-colors"
              >
                <Check size={14} />
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="flex items-center gap-1.5 bg-white/8 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg text-sm transition-colors"
              >
                <X size={14} />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white">{list.name}</h1>
                {list.isPublic ? (
                  <Globe size={16} className="text-gray-500" />
                ) : (
                  <Lock size={16} className="text-gray-500" />
                )}
              </div>
              {list.description && (
                <p className="text-gray-400 text-sm mt-1">{list.description}</p>
              )}
              <p className="text-gray-500 text-xs mt-2">
                by{" "}
                <Slot
                  role="link"
                  tabIndex={0}
                  className="text-violet-400 hover:text-violet-300 cursor-pointer outline-none"
                  onClick={() => router.push(`/user/${list.user.username}`)}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") router.push(`/user/${list.user.username}`);
                  }}
                >
                  <span>{list.user.username}</span>
                </Slot>{" "}
                · {list._count.entries} game{list._count.entries !== 1 ? "s" : ""}
              </p>
            </div>

            {isOwner && (
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={startEdit}
                  className="p-2 rounded-lg bg-white/8 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                  title="Edit list"
                >
                  <Pencil size={15} />
                </button>

                {/* Delete list dialog */}
                <Dialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
                  <Dialog.Trigger asChild>
                    <button
                      className="p-2 rounded-lg bg-white/8 hover:bg-red-900/80 text-gray-400 hover:text-red-400 transition-colors"
                      title="Delete list"
                    >
                      <Trash2 size={15} />
                    </button>
                  </Dialog.Trigger>
                  <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/5 backdrop-blur-sm border border-white/15 rounded-2xl p-6 w-full max-w-sm z-50">
                      <div className="flex items-center justify-between mb-3">
                        <Dialog.Title className="font-bold text-white flex items-center gap-2">
                          <AlertTriangle size={16} className="text-red-400" />
                          Delete List
                        </Dialog.Title>
                        <Dialog.Close asChild>
                          <button className="text-gray-400 hover:text-white">
                            <X size={18} />
                          </button>
                        </Dialog.Close>
                      </div>
                      <Dialog.Description className="text-sm text-gray-400 mb-4">
                        Are you sure you want to delete <span className="text-white font-medium">"{list.name}"</span>? This cannot be undone.
                      </Dialog.Description>
                      <Separator.Root className="h-px bg-white/8 mb-4" />
                      <div className="flex gap-2">
                        <button
                          onClick={() => deleteMutation.mutate()}
                          disabled={deleteMutation.isPending}
                          className="flex items-center gap-2 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          <Trash2 size={14} />
                          {deleteMutation.isPending ? "Deleting..." : "Delete"}
                        </button>
                        <Dialog.Close asChild>
                          <button className="bg-white/8 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                            Cancel
                          </button>
                        </Dialog.Close>
                      </div>
                    </Dialog.Content>
                  </Dialog.Portal>
                </Dialog.Root>
              </div>
            )}
          </div>
        )}
      </div>

      {list.entries.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Gamepad2 size={40} className="mx-auto mb-3 opacity-30" />
          <p>No games in this list yet.</p>
          {isOwner && <p className="text-sm mt-1">Search for a game and add it to this list.</p>}
        </div>
      ) : (
        <>
          {list.entries.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {allGenres.length > 0 && (
                <ListSelect
                  value={genreFilter}
                  onValueChange={setGenreFilter}
                  options={[
                    { value: "all", label: "All Genres" },
                    ...allGenres.map((g) => ({ value: g, label: g })),
                  ]}
                />
              )}
              <ListSelect value={sort} onValueChange={setSort} options={SORT_OPTIONS} />
            </div>
          )}

          {displayedEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              No games match this filter.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {displayedEntries.map((entry) => (
                <div key={entry.id} className="group relative">
                  <Slot
                    role="link"
                    tabIndex={0}
                    className="cursor-pointer outline-none block"
                    onClick={() => router.push(`/game/${entry.game.rawgId}`)}
                    onKeyDown={(e: React.KeyboardEvent) => {
                      if (e.key === "Enter" || e.key === " ") router.push(`/game/${entry.game.rawgId}`);
                    }}
                  >
                    <div>
                      <div className="relative rounded-xl overflow-hidden bg-white/5 backdrop-blur-sm border border-white/8 group-hover:border-violet-700 transition-colors">
                        {entry.game.coverImage ? (
                          <img
                            src={entry.game.coverImage}
                            alt={entry.game.name}
                            loading="lazy"
                            decoding="async"
                            className="w-full aspect-3/4 object-cover"
                          />
                        ) : (
                          <div className="w-full aspect-3/4 bg-white/8 flex items-center justify-center">
                            <Gamepad2 size={28} className="text-gray-600" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-300 mt-1.5 font-medium truncate group-hover:text-white transition-colors">
                        {entry.game.name}
                      </p>
                    </div>
                  </Slot>
                  {isOwner && (
                    <button
                      onClick={() => removeGameMutation.mutate(entry.game.id)}
                      disabled={removeGameMutation.isPending}
                      className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 bg-white/5 backdrop-blur-sm/80 backdrop-blur hover:bg-red-900/80 text-white hover:text-red-400 p-1.5 rounded-lg transition-all"
                      title="Remove from list"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ListSelect({
  value,
  onValueChange,
  options,
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const current = options.find((o) => o.value === value);
  return (
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.Trigger className="flex items-center gap-1.5 bg-white/5 backdrop-blur-sm border border-white/8 hover:border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-300 outline-none transition-colors min-w-36">
        <Select.Value>{current?.label}</Select.Value>
        <Select.Icon className="ml-auto">
          <ChevronDown size={14} className="text-gray-500" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="bg-white/5 backdrop-blur-sm border border-white/15 rounded-xl p-1 shadow-xl z-50"
          position="popper"
          sideOffset={4}
        >
          <Select.Viewport>
            {options.map((o) => (
              <Select.Item
                key={o.value}
                value={o.value}
                className="px-3 py-2 text-sm text-gray-300 hover:bg-white/8 rounded-lg outline-none cursor-pointer data-highlighted:bg-white/8 data-[state=checked]:text-white"
              >
                <Select.ItemText>{o.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
