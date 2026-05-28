"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Slot } from "@radix-ui/react-slot";
import * as Dialog from "@radix-ui/react-dialog";
import * as Label from "@radix-ui/react-label";
import { Plus, List, Lock, Globe, Gamepad2, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { GameListPreview } from "@/lib/types";
import { dispatchToast } from "@/lib/toast";

export default function ListsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const { data: lists = [], isLoading } = useQuery<GameListPreview[]>({
    queryKey: ["my-lists"],
    queryFn: () => api.get("/api/lists/me").then((r) => r.data),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.post("/api/lists", {
        name: name.trim(),
        description: description.trim() || undefined,
        isPublic,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-lists"] });
      setOpen(false);
      dispatchToast("List created", "success");
    },
    onError: (err: any) => {
      dispatchToast(err?.response?.data?.error ?? "Failed to create list", "error");
    },
  });

  function handleClose(v: boolean) {
    setOpen(v);
    if (!v) {
      setName("");
      setDescription("");
      setIsPublic(true);
    }
  }

  if (loading || !user) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold">My Lists</h1>

        <Dialog.Root open={open} onOpenChange={handleClose}>
          <Dialog.Trigger asChild>
            <button className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <Plus size={16} />
              New List
            </button>
          </Dialog.Trigger>

          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 w-full max-w-md z-50">
              <div className="flex items-center justify-between mb-5">
                <Dialog.Title className="text-white font-bold text-lg">
                  Create New List
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button className="text-gray-400 hover:text-white">
                    <X size={18} />
                  </button>
                </Dialog.Close>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label.Root htmlFor="list-name" className="block text-gray-400 text-xs">
                    List name <span className="text-red-400">*</span>
                  </Label.Root>
                  <input
                    id="list-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="My favourite RPGs..."
                    maxLength={100}
                    autoFocus
                    className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-violet-500 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label.Root htmlFor="list-description" className="block text-gray-400 text-xs">
                    Description <span className="text-gray-600">(optional)</span>
                  </Label.Root>
                  <textarea
                    id="list-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What's this list about?"
                    maxLength={500}
                    rows={2}
                    className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-violet-500 transition-colors resize-none"
                  />
                </div>

                <Label.Root htmlFor="list-public" className="flex items-center gap-2 cursor-pointer">
                  <input
                    id="list-public"
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="w-4 h-4 accent-violet-600"
                  />
                  <span className="text-sm text-gray-300">Public list</span>
                </Label.Root>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => createMutation.mutate()}
                    disabled={!name.trim() || createMutation.isPending}
                    className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    {createMutation.isPending ? "Creating..." : "Create"}
                  </button>
                  <Dialog.Close asChild>
                    <button className="bg-white/8 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                      Cancel
                    </button>
                  </Dialog.Close>
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      {isLoading ? (
        <div className="text-gray-500 text-sm">Loading...</div>
      ) : lists.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <List size={40} className="mx-auto mb-3 opacity-30" />
          <p className="mb-1">No lists yet.</p>
          <p className="text-sm">Create a list to organize your games.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {lists.map((list) => (
            <ListCard key={list.id} list={list} />
          ))}
        </div>
      )}
    </div>
  );
}

function ListCard({ list }: { list: GameListPreview }) {
  const router = useRouter();
  const covers = list.entries.slice(0, 4).map((e) => e.game.coverImage).filter(Boolean);

  return (
    <Slot
      role="link"
      tabIndex={0}
      className="group cursor-pointer outline-none"
      onClick={() => router.push(`/lists/${list.id}`)}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") router.push(`/lists/${list.id}`);
      }}
    >
      <div className="bg-white/5 backdrop-blur-sm border border-white/8 group-hover:border-violet-700 rounded-2xl overflow-hidden transition-colors">
        <div className="grid grid-cols-4 h-24">
          {covers.length > 0
            ? covers.map((src, i) => (
                <img key={i} src={src!} alt="" className="w-full h-full object-cover" />
              ))
            : Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white/8 flex items-center justify-center">
                  <Gamepad2 size={16} className="text-gray-600" />
                </div>
              ))}
          {covers.length > 0 &&
            covers.length < 4 &&
            Array.from({ length: 4 - covers.length }).map((_, i) => (
              <div key={i} className="bg-white/8 flex items-center justify-center">
                <Gamepad2 size={16} className="text-gray-600" />
              </div>
            ))}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-white group-hover:text-violet-300 transition-colors truncate">
              {list.name}
            </h3>
            {list.isPublic ? (
              <Globe size={13} className="text-gray-500 shrink-0 mt-0.5" />
            ) : (
              <Lock size={13} className="text-gray-500 shrink-0 mt-0.5" />
            )}
          </div>
          {list.description && (
            <p className="text-gray-500 text-xs mt-1 line-clamp-2">{list.description}</p>
          )}
          <p className="text-gray-600 text-xs mt-2">
            {list._count.entries} game{list._count.entries !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </Slot>
  );
}

