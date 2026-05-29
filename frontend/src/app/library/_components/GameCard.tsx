"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, Gamepad2, Pencil, Trash2, Monitor } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { dispatchToast } from "@/lib/toast";
import { GameEntry, GameStatus } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import AddGameModal from "@/components/AddGameModal";
import { Text, Flex } from "@radix-ui/themes";

export function GameCard({ entry }: { entry: GameEntry }) {
  const qc = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/entries/${entry.game.rawgId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-entries"] });
      dispatchToast("Removed from library", "success");
    },
    onError: (err: any) => {
      dispatchToast(err?.response?.data?.error ?? "Failed to remove", "error");
    },
  });

  return (
    <div className="group relative">
      <Link href={`/game/${entry.game.rawgId}`}>
        <div className="relative rounded-xl overflow-hidden bg-white/5 backdrop-blur-sm border border-white/8 group-hover:border-violet-700 transition-colors">
          {entry.game.coverImage ? (
            <img src={entry.game.coverImage} alt={entry.game.name} loading="lazy" decoding="async" className="w-full aspect-3/4 object-cover" />
          ) : (
            <div className="w-full aspect-3/4 bg-white/8 flex items-center justify-center">
              <Gamepad2 size={32} className="text-gray-600" />
            </div>
          )}
          <div className="absolute bottom-0 inset-x-0 bg-linear-to-t from-black/90 via-black/50 to-transparent p-2">
            <StatusBadge status={entry.status as GameStatus} />
            {entry.rating && (
              <Flex align="center" gap="1" className="text-yellow-400 mt-1">
                <Star size={11} fill="currentColor" />
                <Text as="span" size="1">{entry.rating}/10</Text>
              </Flex>
            )}
            {entry.platform && (
              <Flex align="center" gap="1" className="text-gray-300 mt-0.5">
                <Monitor size={10} />
                <Text as="span" size="1">{entry.platform}</Text>
              </Flex>
            )}
          </div>
        </div>
        <Text as="p" size="1" className="text-gray-300 mt-1.5 font-medium truncate group-hover:text-white transition-colors">
          {entry.game.name}
        </Text>
      </Link>

      <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <AddGameModal
          preselectedGame={entry.game}
          initialValues={{
            status: entry.status as GameStatus,
            rating: entry.rating,
            review: entry.review,
            playtime: entry.playtime,
          }}
          trigger={
            <button className="bg-white/5 backdrop-blur-sm hover:bg-white/8 text-white p-1.5 rounded-lg transition-colors" title="Edit entry">
              <Pencil size={11} />
            </button>
          }
        />
        <button
          onClick={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
          className="bg-white/5 backdrop-blur-sm hover:bg-red-900/80 text-white hover:text-red-400 p-1.5 rounded-lg transition-colors disabled:opacity-50"
          title="Remove from library"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}
