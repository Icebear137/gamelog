"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useMutation } from "@tanstack/react-query";
import { Flag, X, ChevronRight } from "lucide-react";
import { Text, Flex } from "@radix-ui/themes";
import { api } from "@/lib/api";
import { dispatchToast } from "@/lib/toast";

export type ReportType =
  | "REVIEW"
  | "ACTIVITY_COMMENT"
  | "LIST_COMMENT"
  | "CLUB_POST"
  | "CLUB_COMMENT"
  | "CLUB";

type Reason = "SPAM" | "INAPPROPRIATE" | "HARASSMENT" | "MISINFORMATION" | "OTHER";

const REASONS: { value: Reason; label: string; desc: string }[] = [
  { value: "SPAM",          label: "Spam",                desc: "Repetitive, promotional, or irrelevant content" },
  { value: "INAPPROPRIATE", label: "Inappropriate",       desc: "Offensive language, explicit or harmful content" },
  { value: "HARASSMENT",    label: "Harassment",          desc: "Targeting, bullying, or threatening a person" },
  { value: "MISINFORMATION",label: "Misinformation",      desc: "Deliberately false or misleading information" },
  { value: "OTHER",         label: "Other",               desc: "Something else not listed above" },
];

interface Props {
  type: ReportType;
  targetId: string;
  onClose: () => void;
}

export function ReportModal({ type, targetId, onClose }: Props) {
  const [reason, setReason]   = useState<Reason | null>(null);
  const [desc, setDesc]       = useState("");
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: () => api.post("/api/reports", { type, targetId, reason, description: desc.trim() || undefined }),
    onSuccess: () => setSubmitted(true),
    onError: (err: any) => {
      if (err?.response?.status === 409) {
        dispatchToast("You've already reported this content", "error");
      } else {
        dispatchToast(err?.response?.data?.error ?? "Failed to submit report", "error");
      }
    },
  });

  const modal = (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <Flex align="center" justify="between" className="px-4 py-3 border-b border-white/8">
          <Flex align="center" gap="2">
            <Flag size={15} className="text-orange-400" />
            <Text size="2" weight="bold">Report content</Text>
          </Flex>
          <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-white hover:bg-white/8 rounded-lg transition-colors">
            <X size={14} />
          </button>
        </Flex>

        {submitted ? (
          /* Success state */
          <div className="p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto">
              <Flag size={20} className="text-green-400" />
            </div>
            <Text as="p" size="2" className="font-semibold text-white">Report submitted</Text>
            <Text as="p" size="2" color="gray">
              Thank you — our moderation team will review this content.
            </Text>
            <button
              onClick={onClose}
              className="mt-2 px-5 py-2 rounded-xl bg-white/8 text-sm text-gray-300 hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Reason selection */}
            <div>
              <Text as="p" size="1" color="gray" className="mb-2 font-medium uppercase tracking-wide">
                Why are you reporting this?
              </Text>
              <div className="space-y-1">
                {REASONS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setReason(r.value)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-colors text-left ${
                      reason === r.value
                        ? "border-orange-500/40 bg-orange-500/10"
                        : "border-white/8 hover:border-white/15 hover:bg-white/5"
                    }`}
                  >
                    <div>
                      <Text as="p" size="2" className={`font-medium ${reason === r.value ? "text-orange-300" : "text-gray-200"}`}>
                        {r.label}
                      </Text>
                      <p className="text-[11px] text-gray-400 mt-0.5">{r.desc}</p>
                    </div>
                    <ChevronRight
                      size={14}
                      className={`shrink-0 ml-2 transition-colors ${reason === r.value ? "text-orange-400" : "text-gray-600"}`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Optional description */}
            {reason && (
              <div>
                <Text as="p" size="1" color="gray" className="mb-1.5">Additional details (optional)</Text>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Provide more context if needed…"
                  className="w-full bg-white/5 border border-white/10 focus:border-orange-500/50 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none resize-none transition-colors"
                />
              </div>
            )}

            {/* Submit */}
            <button
              onClick={() => mutation.mutate()}
              disabled={!reason || mutation.isPending}
              className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white text-sm font-medium transition-colors"
            >
              {mutation.isPending ? "Submitting…" : "Submit report"}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return typeof window !== "undefined" ? createPortal(modal, document.body) : null;
}
