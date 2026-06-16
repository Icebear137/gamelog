"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Lock, X } from "lucide-react";
import { api } from "@/lib/api";
import { dispatchToast } from "@/lib/toast";
import { gx } from "@/lib/gx-styles";
import type { ClubJoinQuestion } from "@/lib/types";

export function JoinRequestModal({ clubId, onClose, onSuccess }: {
  clubId: string; onClose: () => void; onSuccess: () => void;
}) {
  const { data: questions = [] } = useQuery<ClubJoinQuestion[]>({
    queryKey: ["club-questions", clubId],
    queryFn: () => api.get(`/api/clubs/${clubId}/questions`).then((r) => r.data),
  });
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: () => api.post(`/api/clubs/${clubId}/requests`, {
      answers: Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })),
    }),
    onSuccess: () => { dispatchToast("Request submitted — waiting for admin approval", "success"); onSuccess(); onClose(); },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed to submit", "error"),
  });

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-gx-surface border border-gx-border rounded-[16px] w-full max-w-[440px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gx-border">
          <div className="flex items-center gap-2">
            <Lock size={15} style={{ color: "var(--gx-amber)" }} />
            <h2 className="text-[15px] font-bold text-gx-text-1 m-0">Request to Join</h2>
          </div>
          <button onClick={onClose} className="p-1 bg-transparent border-none cursor-pointer text-gx-text-3 hover:text-gx-text-1 transition-colors">
            <X size={15} />
          </button>
        </div>
        <div className="px-5 py-4 flex flex-col gap-4">
          {questions.length === 0 ? (
            <p className="text-[13px] text-gx-text-2 m-0">No questions required. Submit your request and wait for admin approval.</p>
          ) : (
            questions.map((q) => (
              <div key={q.id} className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-gx-text-1">
                  {q.question} {q.required && <span className="text-gx-red">*</span>}
                </label>
                <textarea
                  value={answers[q.id] ?? ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  rows={2}
                  placeholder="Your answer…"
                  className="w-full bg-gx-surface-2 border border-gx-border rounded-[10px] px-3 py-2 text-[13px] text-gx-text-1 outline-none focus:border-gx-amber/40 placeholder:text-gx-text-3 resize-none transition-colors"
                />
              </div>
            ))
          )}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className={`${gx.btnPrimary} flex-1 justify-center`}
              style={{ padding: "8px 0" }}
            >
              {mutation.isPending ? "Submitting…" : "Submit Request"}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-[13px] text-gx-text-2 bg-transparent border-none cursor-pointer hover:text-gx-text-1 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
