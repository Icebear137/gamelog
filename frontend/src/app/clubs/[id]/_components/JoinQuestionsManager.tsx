"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Plus, X } from "lucide-react";
import { api } from "@/lib/api";
import { dispatchToast } from "@/lib/toast";
import type { ClubJoinQuestion } from "@/lib/types";

export function JoinQuestionsManager({ clubId }: { clubId: string }) {
  const qc = useQueryClient();
  const { data: questions = [] } = useQuery<ClubJoinQuestion[]>({
    queryKey: ["club-questions", clubId],
    queryFn: () => api.get(`/api/clubs/${clubId}/questions`).then((r) => r.data),
  });
  const [newQ, setNewQ] = useState("");

  const addMutation = useMutation({
    mutationFn: () => api.post(`/api/clubs/${clubId}/questions`, { question: newQ.trim(), required: true }),
    onSuccess: () => { setNewQ(""); qc.invalidateQueries({ queryKey: ["club-questions", clubId] }); },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (qId: string) => api.delete(`/api/clubs/${clubId}/questions/${qId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["club-questions", clubId] }),
  });

  return (
    <div className="flex flex-col gap-2.5 p-3 bg-gx-surface-2 rounded-[10px] border border-gx-border">
      <p className="text-[11px] font-bold text-gx-text-3 uppercase tracking-[0.08em] m-0 flex items-center gap-1.5">
        <ClipboardList size={10} /> Join Questions
      </p>
      {questions.map((q) => (
        <div key={q.id} className="flex items-start gap-2">
          <p className="flex-1 text-[11px] text-gx-text-2 m-0 leading-[1.5]">
            {q.question} {q.required && <span className="text-gx-red text-[10px]">*required</span>}
          </p>
          <button
            onClick={() => deleteMutation.mutate(q.id)}
            className="shrink-0 p-0.5 bg-transparent border-none cursor-pointer text-gx-text-3 hover:text-gx-red transition-colors mt-0.5"
          ><X size={11} /></button>
        </div>
      ))}
      {questions.length < 5 && (
        <div className="flex gap-1.5">
          <input
            value={newQ}
            onChange={(e) => setNewQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && newQ.trim()) addMutation.mutate(); }}
            placeholder="Add a question…"
            maxLength={300}
            className="flex-1 bg-gx-surface border border-gx-border rounded-[8px] px-2.5 py-1.5 text-[11px] text-gx-text-1 outline-none focus:border-gx-amber/40 placeholder:text-gx-text-3"
          />
          <button
            onClick={() => newQ.trim() && addMutation.mutate()}
            disabled={!newQ.trim() || addMutation.isPending}
            className="px-2 py-1.5 rounded-[8px] text-[11px] bg-gx-amber/13 text-gx-amber border-none cursor-pointer hover:bg-gx-amber/25 transition-colors disabled:opacity-40"
          ><Plus size={11} /></button>
        </div>
      )}
    </div>
  );
}
