"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Plus, Trash2, Clock, Monitor, CalendarCheck, Loader2 } from "lucide-react";
import { Heading, Text, Flex } from "@radix-ui/themes";
import { api } from "@/lib/api";
import { dispatchToast } from "@/lib/toast";

interface Playthrough {
  id: string;
  playtime?: number | null;
  platform?: string | null;
  completedAt?: string | null;
  note?: string | null;
  createdAt: string;
}

interface Props { entryId: string }

export function PlaythroughsSection({ entryId }: Props) {
  const qc = useQueryClient();
  const [adding, setAdding]         = useState(false);
  const [playtime, setPlaytime]     = useState<number | "">("");
  const [platform, setPlatform]     = useState("");
  const [completedAt, setCompleted] = useState("");
  const [note, setNote]             = useState("");

  const { data: runs = [], isLoading } = useQuery<Playthrough[]>({
    queryKey: ["playthroughs", entryId],
    queryFn:  () => api.get(`/api/entries/${entryId}/playthroughs`).then((r) => r.data),
    staleTime: 60_000,
  });

  const addMutation = useMutation({
    mutationFn: () => api.post(`/api/entries/${entryId}/playthroughs`, {
      playtime:    playtime === "" ? null : playtime,
      platform:    platform || null,
      completedAt: completedAt || null,
      note:        note || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["playthroughs", entryId] });
      setAdding(false); setPlaytime(""); setPlatform(""); setCompleted(""); setNote("");
      dispatchToast("Playthrough logged", "success");
    },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (runId: string) => api.delete(`/api/entries/${entryId}/playthroughs/${runId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["playthroughs", entryId] }),
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed", "error"),
  });

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl p-5 space-y-4">
      <Flex align="center" justify="between">
        <Heading size="4" as="h2" className="flex items-center gap-2">
          <RefreshCw size={18} className="text-violet-400" />
          Playthroughs
          {runs.length > 0 && <span className="text-gray-500 font-normal text-base">({runs.length})</span>}
        </Heading>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-violet-600/20 text-violet-300 border border-violet-500/30 hover:bg-violet-600/30 transition-colors"
          >
            <Plus size={14} /> Log run
          </button>
        )}
      </Flex>

      {/* Add form */}
      {adding && (
        <div className="bg-white/5 border border-white/8 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-gray-300">New playthrough</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Playtime (hours)</label>
              <input
                type="number" min={0} value={playtime}
                onChange={(e) => setPlaytime(e.target.value === "" ? "" : parseInt(e.target.value))}
                placeholder="e.g. 60"
                className="w-full bg-white/5 border border-white/10 focus:border-violet-500 rounded-lg px-3 py-2 text-sm text-white outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Platform</label>
              <input
                type="text" value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                placeholder="PC, PS5..."
                maxLength={50}
                className="w-full bg-white/5 border border-white/10 focus:border-violet-500 rounded-lg px-3 py-2 text-sm text-white outline-none transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Completed on</label>
            <input
              type="date" value={completedAt}
              onChange={(e) => setCompleted(e.target.value)}
              className="w-full bg-white/5 border border-white/10 focus:border-violet-500 rounded-lg px-3 py-2 text-sm text-white outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="NG+, 100%, speedrun..."
              maxLength={500}
              rows={2}
              className="w-full bg-white/5 border border-white/10 focus:border-violet-500 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none resize-none transition-colors"
            />
          </div>
          <Flex gap="2" justify="end">
            <button
              onClick={() => setAdding(false)}
              className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => addMutation.mutate()}
              disabled={addMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white transition-colors"
            >
              {addMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Save
            </button>
          </Flex>
        </div>
      )}

      {/* Runs list */}
      {isLoading && (
        <div className="py-4 flex justify-center">
          <Loader2 size={18} className="animate-spin text-gray-500" />
        </div>
      )}

      {!isLoading && runs.length === 0 && !adding && (
        <Text as="p" size="2" color="gray">No playthroughs logged yet.</Text>
      )}

      {runs.length > 0 && (
        <div className="space-y-2">
          {runs.map((r, i) => (
            <div key={r.id} className="flex items-start gap-3 p-3 bg-white/3 rounded-xl group">
              <div className="w-6 h-6 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-violet-400">#{runs.length - i}</span>
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <Flex align="center" gap="3" className="flex-wrap">
                  {r.playtime != null && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock size={11} /> {r.playtime}h
                    </span>
                  )}
                  {r.platform && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Monitor size={11} /> {r.platform}
                    </span>
                  )}
                  {r.completedAt && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <CalendarCheck size={11} />
                      {new Date(r.completedAt).toLocaleDateString()}
                    </span>
                  )}
                </Flex>
                {r.note && <Text as="p" size="1" color="gray" className="truncate">{r.note}</Text>}
              </div>
              <button
                onClick={() => deleteMutation.mutate(r.id)}
                disabled={deleteMutation.isPending}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-600 hover:text-red-400 transition-all shrink-0"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
