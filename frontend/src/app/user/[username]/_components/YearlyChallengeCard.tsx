"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import * as Label from "@radix-ui/react-label";
import { Trophy, Target, X } from "lucide-react";
import { api } from "@/lib/api";
import { dispatchToast } from "@/lib/toast";

interface ChallengeData {
  year: number;
  goal: number;
  completed: number;
}

interface Props {
  username: string;
  isMe: boolean;
}

export default function YearlyChallengeCard({ username, isMe }: Props) {
  const year = new Date().getFullYear();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [goalInput, setGoalInput] = useState("");

  const { data: challenge } = useQuery<ChallengeData | null>({
    queryKey: ["challenge", username, year],
    queryFn: () =>
      api.get(`/api/users/${username}/challenge?year=${year}`).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const setGoalMutation = useMutation({
    mutationFn: (goal: number) => api.post("/api/users/me/challenge", { year, goal }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["challenge", username, year] });
      setOpen(false);
      setGoalInput("");
      dispatchToast(`Challenge set: complete ${goalInput} games in ${year}!`, "success");
    },
    onError: (err: any) => {
      dispatchToast(err?.response?.data?.error ?? "Failed to set goal", "error");
    },
  });

  // Only show if there's a challenge OR if it's the owner (so they can set one)
  if (!challenge && !isMe) return null;

  const pct = challenge ? Math.min(100, Math.round((challenge.completed / challenge.goal) * 100)) : 0;
  const done = challenge ? challenge.completed >= challenge.goal : false;

  return (
    <>
      <div className={`bg-white/5 backdrop-blur-sm border rounded-2xl p-5 ${done ? "border-yellow-500/40" : "border-white/8"}`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Trophy size={16} className={done ? "text-yellow-400" : "text-gray-400"} />
            {year} Challenge
          </h2>
          {isMe && (
            <button
              onClick={() => { setGoalInput(String(challenge?.goal ?? "")); setOpen(true); }}
              className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
            >
              {challenge ? "Edit goal" : "Set goal"}
            </button>
          )}
        </div>

        {challenge ? (
          <div className="space-y-2">
            <div className="flex items-end justify-between">
              <p className="text-3xl font-bold text-white">
                {challenge.completed}
                <span className="text-gray-500 text-lg font-normal"> / {challenge.goal}</span>
              </p>
              <p className="text-xs text-gray-500 mb-1">games completed</p>
            </div>

            {/* Progress bar */}
            <div className="h-2.5 bg-white/8 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${done ? "bg-yellow-400" : "bg-violet-600"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>{pct}% complete</span>
              {done ? (
                <span className="text-yellow-400 font-semibold">🎉 Goal reached!</span>
              ) : (
                <span>{challenge.goal - challenge.completed} to go</span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No challenge set for {year} yet.</p>
        )}
      </div>

      {/* Set Goal Dialog */}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/5 backdrop-blur-sm border border-white/15 rounded-2xl p-6 w-full max-w-sm z-50">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="font-bold flex items-center gap-2">
                <Target size={18} className="text-violet-400" />
                Set {year} Challenge
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="text-gray-400 hover:text-white">
                  <X size={18} />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="text-sm text-gray-400 mb-4">
              How many games do you want to complete in {year}?
            </Dialog.Description>

            <div className="space-y-1.5 mb-4">
              <Label.Root htmlFor="challenge-goal" className="block text-gray-400 text-xs">
                Goal (number of games)
              </Label.Root>
              <input
                id="challenge-goal"
                type="number"
                min={1}
                max={9999}
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                placeholder="e.g. 12"
                autoFocus
                className="w-full bg-white/8 border border-white/15 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-500 transition-colors"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  const n = parseInt(goalInput);
                  if (!n || n < 1) { dispatchToast("Enter a valid goal", "error"); return; }
                  setGoalMutation.mutate(n);
                }}
                disabled={setGoalMutation.isPending || !goalInput}
                className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {setGoalMutation.isPending ? "Saving..." : "Save Goal"}
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
    </>
  );
}
