"use client";

import { useState, useCallback, useEffect, ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Label from "@radix-ui/react-label";
import * as Select from "@radix-ui/react-select";
import { Search, X, Plus, Star, ChevronDown, Monitor } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Text, Flex, Grid } from "@radix-ui/themes";
import { api } from "@/lib/api";
import { upsertEntryService } from "@/services/entry.service";
import { dispatchToast } from "@/lib/toast";
import { GameStatus, GamePlatform } from "@/lib/types";
import ReviewEditor from "./ReviewEditor";

interface SearchResult {
  rawgId: number;
  name: string;
  coverImage?: string;
  releaseYear?: number;
  genres: string[];
  rawgRating?: number;
}

interface InitialValues {
  status: GameStatus;
  rating?: number | null;
  review?: string | null;
  playtime?: number | null;
  platform?: GamePlatform | null;
}

const PLATFORMS: GamePlatform[] = ["PC", "PS5", "PS4", "Xbox Series X|S", "Xbox One", "Nintendo Switch", "iOS/Android", "Other"];

interface Props {
  preselectedGame?: SearchResult;
  initialValues?: InitialValues;
  trigger?: ReactNode;
}

const STATUS_OPTIONS: { value: GameStatus; label: string }[] = [
  { value: "PLAYING", label: "Playing" },
  { value: "COMPLETED", label: "Completed" },
  { value: "WANT_TO_PLAY", label: "Want to Play" },
  { value: "DROPPED", label: "Dropped" },
];

export default function AddGameModal({ preselectedGame, initialValues, trigger }: Props = {}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [selected, setSelected] = useState<SearchResult | null>(preselectedGame ?? null);
  const [status, setStatus] = useState<GameStatus>(initialValues?.status ?? "WANT_TO_PLAY");
  const [rating, setRating] = useState<number | "">(initialValues?.rating ?? "");
  const [review, setReview] = useState(initialValues?.review ?? "");
  const [playtime, setPlaytime] = useState<number | "">(initialValues?.playtime ?? "");
  const [platform, setPlatform] = useState<GamePlatform | "">(initialValues?.platform ?? "");

  const qc = useQueryClient();

  useEffect(() => {
    if (preselectedGame) setSelected(preselectedGame);
  }, [preselectedGame]);

  useEffect(() => {
    if (initialValues) {
      setStatus(initialValues.status);
      setRating(initialValues.rating ?? "");
      setReview(initialValues.review ?? "");
      setPlaytime(initialValues.playtime ?? "");
      setPlatform(initialValues.platform ?? "");
    }
  }, [initialValues?.status, initialValues?.rating, initialValues?.review, initialValues?.playtime, initialValues?.platform]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 400);
    return () => clearTimeout(timer);
  }, [q]);

  const { data: results = [], isFetching } = useQuery<SearchResult[]>({
    queryKey: ["game-search", debouncedQ],
    queryFn: () =>
      api.get(`/api/games/search?q=${encodeURIComponent(debouncedQ)}`).then((r) => r.data),
    enabled: debouncedQ.length > 1,
  });

  const mutation = useMutation({
    mutationFn: () =>
      upsertEntryService({
        rawgId: selected!.rawgId,
        status,
        rating: rating === "" ? null : rating,
        review: review || null,
        playtime: playtime === "" ? null : playtime,
        platform: platform || null,
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["my-entries"] });
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["game", String(selected!.rawgId)] });
      qc.invalidateQueries({ queryKey: ["achievements-me"] });
      // Show toast for each newly earned achievement
      const newAchievements: { name: string; icon: string }[] = (res as any)?.newAchievements ?? [];
      newAchievements.forEach((a) => dispatchToast(`${a.icon} Achievement unlocked: ${a.name}!`, "success"));
      setOpen(false);
      reset();
    },
    onError: (err: any) => {
      dispatchToast(err?.response?.data?.error ?? "Failed to save game", "error");
    },
  });

  const reset = useCallback(() => {
    setQ("");
    setDebouncedQ("");
    setSelected(preselectedGame ?? null);
    setStatus(initialValues?.status ?? "WANT_TO_PLAY");
    setRating(initialValues?.rating ?? "");
    setReview(initialValues?.review ?? "");
    setPlaytime(initialValues?.playtime ?? "");
    setPlatform(initialValues?.platform ?? "");
  }, [preselectedGame, initialValues]);

  const defaultTrigger = (
    <button className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
      <Plus size={16} />
      Add Game
    </button>
  );

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <Dialog.Trigger asChild>
        {trigger ?? defaultTrigger}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 w-full max-w-lg z-50 max-h-[90vh] overflow-y-auto">
          <Flex align="center" justify="between" className="mb-4">
            <Dialog.Title className="text-white font-bold text-lg">
              {initialValues ? "Update Entry" : "Add a Game"}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </Dialog.Close>
          </Flex>

          {!selected ? (
            <div>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="w-full bg-white/8 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-violet-500"
                  placeholder="Search games..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="mt-3 space-y-2">
                {isFetching && <Text as="p" size="2" color="gray" className="text-center py-4">Searching...</Text>}
                {results.map((g) => (
                  <button
                    key={g.rawgId}
                    onClick={() => setSelected(g)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/8 transition-colors text-left"
                  >
                    {g.coverImage ? (
                      <img src={g.coverImage} alt={g.name} className="w-12 h-14 object-cover rounded" />
                    ) : (
                      <div className="w-12 h-14 bg-gray-700 rounded" />
                    )}
                    <div>
                      <p className="text-white text-sm font-medium">{g.name}</p>
                      <p className="text-gray-500 text-xs">{g.releaseYear ?? "—"}</p>
                      {g.rawgRating != null && (
                        <div className="flex items-center gap-1 text-yellow-400 text-xs mt-0.5">
                          <Star size={11} fill="currentColor" />
                          <span>{g.rawgRating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <Flex align="center" gap="3" className="mb-5 p-3 bg-white/8 rounded-xl">
                {selected.coverImage && (
                  <img
                    src={selected.coverImage}
                    alt={selected.name}
                    className="w-14 h-16 object-cover rounded-lg"
                  />
                )}
                <div>
                  <Text as="p" size="3" weight="medium" className="font-semibold">{selected.name}</Text>
                  <Text as="p" size="1" color="gray">{selected.releaseYear}</Text>
                </div>
                {!preselectedGame && (
                  <button onClick={() => setSelected(null)} className="ml-auto text-gray-400 hover:text-white">
                    <X size={16} />
                  </button>
                )}
              </Flex>

              <Flex direction="column" gap="4">
                <div>
                  <Label.Root className="block text-gray-400 text-xs mb-1.5">Status</Label.Root>
                  <div className="grid grid-cols-2 gap-2">
                    {STATUS_OPTIONS.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setStatus(s.value)}
                        className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                          status === s.value
                            ? "bg-violet-600 border-violet-500 text-white"
                            : "bg-white/8 border-white/15 text-gray-400 hover:border-white/20"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Grid columns="2" gap="4">
                  <div className="space-y-1.5">
                    <Label.Root htmlFor="modal-rating" className="block text-gray-400 text-xs">
                      Rating (1–10)
                    </Label.Root>
                    <input
                      id="modal-rating"
                      type="number"
                      min={1}
                      max={10}
                      value={rating}
                      onChange={(e) =>
                        setRating(e.target.value === "" ? "" : parseInt(e.target.value))
                      }
                      className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
                      placeholder="—"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label.Root htmlFor="modal-playtime" className="block text-gray-400 text-xs">
                      Playtime (hours)
                    </Label.Root>
                    <input
                      id="modal-playtime"
                      type="number"
                      min={0}
                      value={playtime}
                      onChange={(e) =>
                        setPlaytime(e.target.value === "" ? "" : parseInt(e.target.value))
                      }
                      className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
                      placeholder="—"
                    />
                  </div>
                </Grid>

                <div className="space-y-1.5">
                  <Label.Root className="flex items-center gap-1 text-gray-400 text-xs">
                    <Monitor size={12} />
                    Platform
                  </Label.Root>
                  <Select.Root
                    value={platform || "none"}
                    onValueChange={(v) => setPlatform(v === "none" ? "" : v as GamePlatform)}
                  >
                    <Select.Trigger className="w-full flex items-center gap-2 bg-white/8 border border-white/10 hover:border-white/20 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none transition-colors">
                      <Select.Value placeholder="Select platform..." />
                      <Select.Icon className="ml-auto">
                        <ChevronDown size={14} className="text-gray-500" />
                      </Select.Icon>
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Content
                        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-1 shadow-xl z-60"
                        position="popper"
                        sideOffset={4}
                      >
                        <Select.Viewport>
                          <Select.Item value="none" className="px-3 py-2 text-sm text-gray-500 hover:bg-white/8 rounded-lg outline-none cursor-pointer data-highlighted:bg-white/8">
                            <Select.ItemText>— No platform —</Select.ItemText>
                          </Select.Item>
                          {PLATFORMS.map((p) => (
                            <Select.Item
                              key={p}
                              value={p}
                              className="px-3 py-2 text-sm text-gray-300 hover:bg-white/8 rounded-lg outline-none cursor-pointer data-highlighted:bg-white/8 data-[state=checked]:text-white"
                            >
                              <Select.ItemText>{p}</Select.ItemText>
                            </Select.Item>
                          ))}
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                </div>

                <ReviewEditor
                  id="modal-review"
                  value={review}
                  onChange={setReview}
                  rows={3}
                  maxLength={2000}
                />

                <button
                  onClick={() => mutation.mutate()}
                  disabled={mutation.isPending}
                  className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  {mutation.isPending
                    ? "Saving..."
                    : initialValues
                      ? "Update Entry"
                      : "Save to Library"}
                </button>
              </Flex>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

