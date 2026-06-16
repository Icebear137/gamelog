"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Lock } from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { dispatchToast } from "@/lib/toast";
import { gx } from "@/lib/gx-styles";
import { GamePicker } from "./GamePicker";

const clubLabel =
  "block text-[10px] font-bold tracking-[0.1em] uppercase text-gx-text-3 mb-[5px]";
const clubInput =
  "w-full bg-gx-surface-2 border border-gx-border rounded-[10px] px-3 py-[9px] text-[13px] text-gx-text-1 " +
  "outline-none transition-colors focus:border-gx-amber/30 placeholder:text-gx-text-3";

interface GameOption {
  id: string;
  rawgId: number;
  name: string;
  coverImage?: string | null;
}

export function CreateClubModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [genre, setGenre] = useState("");
  const [linkedGame, setLinkedGame] = useState<GameOption | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);

  const mutation = useMutation({
    mutationFn: () => api.post("/api/clubs", {
      name: name.trim(),
      description: desc.trim() || undefined,
      genre: genre.trim() || undefined,
      rawgId: linkedGame?.rawgId || undefined,
      isPrivate,
    }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["clubs"] });
      router.push(`/clubs/${res.data.id}`);
      onClose();
    },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed", "error"),
  });

  if (!user) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/72"
      onClick={onClose}
    >
      <div
        className="w-full max-w-95 bg-gx-surface border border-gx-border-md rounded-[18px] overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4.5 py-3.5 border-b border-gx-border">
          <h3 className="text-[15px] font-bold text-gx-text-1 m-0">Create Club</h3>
          <button onClick={onClose} className="p-1.25 text-gx-text-3 bg-transparent border-none cursor-pointer rounded-md transition-colors hover:text-gx-text-1">
            <X size={14} />
          </button>
        </div>
        <div className="px-4.5 py-4 flex flex-col gap-3">
          <div>
            <label className={clubLabel}>Club name *</label>
            <input value={name} onChange={e => setName(e.target.value)} maxLength={80}
              placeholder="e.g. Elden Ring Fan Club" className={clubInput} />
          </div>
          <div>
            <label className={clubLabel}>Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} maxLength={500} rows={2}
              placeholder="What is this club about?" className={clsx(clubInput, "resize-none")} />
          </div>
          <div>
            <label className={clubLabel}>Genre / Topic</label>
            <input value={genre} onChange={e => setGenre(e.target.value)} maxLength={40}
              placeholder="e.g. RPG, Action, Horror…" className={clubInput} />
          </div>
          <GamePicker selected={linkedGame} onSelect={setLinkedGame} />
          {/* Private toggle */}
          <button
            type="button"
            onClick={() => setIsPrivate(v => !v)}
            className={clsx(
              "flex items-center justify-between w-full px-3 py-2.5 rounded-[10px] border text-[12px] cursor-pointer transition-all",
              isPrivate
                ? "bg-gx-amber/10 border-gx-amber/30 text-gx-amber"
                : "bg-gx-surface-2 border-gx-border text-gx-text-2 hover:border-gx-border-md"
            )}
          >
            <span className="flex items-center gap-2">
              <Lock size={12} />
              <span className="font-semibold">Private Club</span>
            </span>
            <span className="text-[10px] text-gx-text-3">{isPrivate ? "Members must be approved" : "Anyone can join"}</span>
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!name.trim() || mutation.isPending}
            className={clsx(gx.btnPrimary, "w-full justify-center")}
          >
            {mutation.isPending ? "Creating…" : "Create Club"}
          </button>
        </div>
      </div>
    </div>
  );
}
