"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { Flex } from "@radix-ui/themes";
import { getMyEntriesService, upsertEntryService } from "@/services/entry.service";
import { useAuth } from "@/lib/auth-context";
import { GameEntry } from "@/lib/types";
import { dispatchToast } from "@/lib/toast";

interface Props {
  rawgId: number;
  gameName: string;
  onSuccess?: () => void;
}

export default function WantToPlayButton({ rawgId, gameName, onSuccess }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();

  // select narrows the subscription: this component only re-renders when
  // THIS game's entry changes, not when any other entry is added/removed.
  const { data: existing } = useQuery<GameEntry[], Error, GameEntry | undefined>({
    queryKey: ["my-entries"],
    queryFn: () => getMyEntriesService(),
    select: (data) => data.find((e) => e.game.rawgId === rawgId),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const addMutation = useMutation({
    mutationFn: () => upsertEntryService({ rawgId, status: "WANT_TO_PLAY" }),
    // Optimistic update: show BookmarkCheck immediately on click,
    // before the API responds. Reverts on error.
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["my-entries"] });
      const previous = qc.getQueryData<GameEntry[]>(["my-entries"]);
      if (previous) {
        const optimistic: GameEntry = {
          id: `optimistic-${rawgId}`,
          status: "WANT_TO_PLAY",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          // Use undefined for fields that aren't needed for the optimistic UI
          // to avoid polluting genre/other filters with empty values
          game: { id: "", rawgId, name: gameName, slug: "", genres: undefined! },
        };
        qc.setQueryData<GameEntry[]>(["my-entries"], [...previous, optimistic]);
      }
      return { previous };
    },
    onError: (err: any, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(["my-entries"], context.previous);
      }
      dispatchToast(err?.response?.data?.error ?? "Failed to add", "error");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-entries"] });
      dispatchToast(`Added "${gameName}" to Want to Play`, "success");
      onSuccess?.();
    },
  });

  if (!user) return null;

  if (existing) {
    return (
      <Flex align="center" gap="1" className="text-xs text-violet-400 font-medium">
        <BookmarkCheck size={14} />
        <span className="hidden sm:inline">{existing.status.replaceAll("_", " ")}</span>
      </Flex>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        addMutation.mutate();
      }}
      disabled={addMutation.isPending}
      className="flex items-center gap-1 text-xs text-gray-400 hover:text-violet-400 transition-colors disabled:opacity-50"
      title="Add to Want to Play"
    >
      <Bookmark size={14} />
      <span className="hidden sm:inline">Want to Play</span>
    </button>
  );
}
