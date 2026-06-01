"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, ChevronRight, Check } from "lucide-react";
import { Text } from "@radix-ui/themes";
import { api } from "@/lib/api";
import { dispatchToast } from "@/lib/toast";

type Duration = "1h" | "8h" | "1w" | "always" | null;

interface Props {
  conversationId: string;
  mutedUntil?: string | null;
}

const OPTIONS: { label: string; value: Duration; desc: string }[] = [
  { label: "1 hour",   value: "1h",     desc: "Until " + fmtUntil("1h") },
  { label: "8 hours",  value: "8h",     desc: "Until " + fmtUntil("8h") },
  { label: "1 week",   value: "1w",     desc: "Until " + fmtUntil("1w") },
  { label: "Always",   value: "always", desc: "Until you turn it back on" },
];

function fmtUntil(dur: "1h" | "8h" | "1w") {
  const now = Date.now();
  const ms = dur === "1h" ? 3_600_000 : dur === "8h" ? 28_800_000 : 604_800_000;
  return new Date(now + ms).toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function isMuted(mutedUntil?: string | null): boolean {
  if (!mutedUntil) return false;
  return new Date(mutedUntil) > new Date();
}

function muteLabel(mutedUntil?: string | null): string {
  if (!mutedUntil) return "";
  const d = new Date(mutedUntil);
  if (d.getFullYear() >= 2090) return "Always muted";
  return "Until " + d.toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function NotificationSettings({ conversationId, mutedUntil }: Props) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const muted = isMuted(mutedUntil);

  const muteMutation = useMutation({
    mutationFn: (duration: Duration) =>
      api.put(`/api/messages/conversations/${conversationId}/mute`, { duration }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      setOpen(false);
    },
    onError: () => dispatchToast("Failed to update notification settings", "error"),
  });

  return (
    <div className="border-t border-white/8">
      {/* Main row */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors w-full text-left"
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          muted ? "bg-yellow-500/15" : "bg-white/8"
        }`}>
          {muted
            ? <BellOff size={14} className="text-yellow-400" />
            : <Bell    size={14} className="text-gray-400" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <Text as="p" size="2" className="text-white font-medium">Notifications</Text>
          <Text as="p" size="1" color="gray">
            {muted ? muteLabel(mutedUntil) : "On"}
          </Text>
        </div>
        <ChevronRight
          size={14}
          className={`shrink-0 text-gray-600 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        />
      </button>

      {/* Expanded options */}
      {open && (
        <div className="px-3 pb-3 space-y-0.5">
          {/* Mute options */}
          <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider px-2 pb-1 pt-0.5">
            Mute for…
          </p>
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              disabled={muteMutation.isPending}
              onClick={() => muteMutation.mutate(opt.value)}
              className="flex items-center gap-3 w-full px-2 py-2 rounded-xl hover:bg-white/5 transition-colors text-left disabled:opacity-50"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white">{opt.label}</p>
                <p className="text-[11px] text-gray-500">{opt.desc}</p>
              </div>
            </button>
          ))}

          {/* Unmute — only shown if currently muted */}
          {muted && (
            <>
              <div className="h-px bg-white/8 my-1 mx-2" />
              <button
                disabled={muteMutation.isPending}
                onClick={() => muteMutation.mutate(null)}
                className="flex items-center gap-3 w-full px-2 py-2 rounded-xl hover:bg-white/5 transition-colors text-left disabled:opacity-50"
              >
                <Check size={14} className="text-green-400 shrink-0" />
                <p className="text-sm text-green-400 font-medium">Unmute</p>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
