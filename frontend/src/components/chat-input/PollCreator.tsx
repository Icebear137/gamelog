"use client";

import { useState } from "react";
import { BarChart2, Plus, Trash2, X, Clock } from "lucide-react";
import { Text, Flex } from "@radix-ui/themes";
import { Button, IconButton, Input } from "@/components/ui";

const DURATION_OPTIONS = [
  { label: "No limit",  ms: null },
  { label: "1 hour",   ms: 60 * 60 * 1000 },
  { label: "6 hours",  ms: 6 * 60 * 60 * 1000 },
  { label: "12 hours", ms: 12 * 60 * 60 * 1000 },
  { label: "1 day",    ms: 24 * 60 * 60 * 1000 },
  { label: "3 days",   ms: 3 * 24 * 60 * 60 * 1000 },
  { label: "1 week",   ms: 7 * 24 * 60 * 60 * 1000 },
];

interface Props {
  onSubmit: (question: string, options: string[], allowMultiple: boolean, endsAt?: string, anonymous?: boolean) => void;
  onClose: () => void;
  disabled?: boolean;
}

export function PollCreator({ onSubmit, onClose, disabled }: Props) {
  const [question, setQuestion]       = useState("");
  const [options, setOptions]         = useState(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [anonymous, setAnonymous]       = useState(false);
  const [durationMs, setDurationMs]     = useState<number | null>(null);

  function setOption(i: number, val: string) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? val : o)));
  }
  function addOption() {
    if (options.length < 5) setOptions((prev) => [...prev, ""]);
  }
  function removeOption(i: number) {
    if (options.length > 2) setOptions((prev) => prev.filter((_, idx) => idx !== i));
  }

  const canSubmit = question.trim().length > 0 && options.filter((o) => o.trim()).length >= 2;

  function handleCreate() {
    if (!canSubmit || disabled) return;
    const endsAt = durationMs ? new Date(Date.now() + durationMs).toISOString() : undefined;
    onSubmit(question.trim(), options.filter((o) => o.trim()), allowMultiple, endsAt, anonymous);
    onClose();
  }

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50">
      <Flex align="center" justify="between" className="px-3 py-2.5 border-b border-white/8">
        <Flex align="center" gap="2" className="text-violet-400">
          <BarChart2 size={14} />
          <Text as="span" size="2" weight="bold">Create poll</Text>
        </Flex>
        <IconButton label="Close" onClick={onClose}><X size={14} /></IconButton>
      </Flex>

      <Flex direction="column" gap="3" className="px-3 py-3">
        <Input autoFocus value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask a question…" maxLength={200} />

        <div className="flex flex-col gap-1.5">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={opt}
                onChange={(e) => setOption(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); if (i === options.length - 1) addOption(); }
                }}
                placeholder={`Option ${i + 1}`}
                maxLength={100}
                className="py-1.5 rounded-lg border-white/8 focus:border-violet-500/40"
              />
              {options.length > 2 && (
                <IconButton label="Remove option" variant="danger" size="xs" onClick={() => removeOption(i)}>
                  <Trash2 size={13} />
                </IconButton>
              )}
            </div>
          ))}
          {options.length < 5 && (
            <button
              onClick={addOption}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors pl-0.5 mt-0.5"
            >
              <Plus size={12} /> Add option
            </button>
          )}
        </div>

        {/* Checkboxes + duration row */}
        <div className="flex flex-col gap-2 pt-1">
          <Flex align="center" justify="between" gap="3">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allowMultiple}
                  onChange={(e) => setAllowMultiple(e.target.checked)}
                  className="w-3.5 h-3.5 accent-violet-500"
                />
                <Text as="span" size="1" color="gray">Multiple choice</Text>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={(e) => setAnonymous(e.target.checked)}
                  className="w-3.5 h-3.5 accent-violet-500"
                />
                <Text as="span" size="1" color="gray">Anonymous</Text>
              </label>
            </div>

            <div className="flex items-center gap-1.5">
              <Clock size={11} className="text-gray-500 shrink-0" />
              <select
                value={durationMs ?? ""}
                onChange={(e) => setDurationMs(e.target.value === "" ? null : parseInt(e.target.value))}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-gray-300 outline-none focus:border-violet-500/40 transition-colors cursor-pointer"
              >
                {DURATION_OPTIONS.map((o) => (
                  <option key={o.label} value={o.ms ?? ""} className="bg-zinc-900">
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </Flex>
        </div>

        <Button
          variant="primary"
          size="sm"
          disabled={!canSubmit || !!disabled}
          onClick={handleCreate}
          className="w-full justify-center"
        >
          Create poll
        </Button>
      </Flex>
    </div>
  );
}
