"use client";

import { useRef, useState } from "react";
import * as Label from "@radix-ui/react-label";
import { Bold, Italic, Strikethrough, Eye, EyeOff } from "lucide-react";
import { Text, Flex } from "@radix-ui/themes";
import MarkdownReview from "./MarkdownReview";

interface Props {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  id?: string;
}

type FormatAction =
  | { type: "wrap"; open: string; close: string }
  | { type: "insert"; text: string };

/**
 * Rich text review editor with a minimal Markdown toolbar.
 * Supports: **bold**, *italic*, ~~strikethrough~~, [spoiler]...[/spoiler], preview.
 */
export default function ReviewEditor({
  value,
  onChange,
  label = "Review",
  placeholder = "Share your thoughts...",
  rows = 4,
  maxLength = 2000,
  id = "review-editor",
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  function applyFormat(action: FormatAction) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end);

    let newValue: string;
    let newCursorStart: number;
    let newCursorEnd: number;

    if (action.type === "wrap") {
      const { open, close } = action;
      newValue = value.slice(0, start) + open + selected + close + value.slice(end);
      newCursorStart = start + open.length;
      newCursorEnd = end + open.length;
    } else {
      newValue = value.slice(0, start) + action.text + value.slice(end);
      newCursorStart = start + action.text.length;
      newCursorEnd = newCursorStart;
    }

    onChange(newValue);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(newCursorStart, newCursorEnd);
    });
  }

  const toolbarButtons = [
    {
      title: "Bold",
      icon: <Bold size={13} />,
      action: { type: "wrap" as const, open: "**", close: "**" },
    },
    {
      title: "Italic",
      icon: <Italic size={13} />,
      action: { type: "wrap" as const, open: "*", close: "*" },
    },
    {
      title: "Strikethrough",
      icon: <Strikethrough size={13} />,
      action: { type: "wrap" as const, open: "~~", close: "~~" },
    },
    {
      title: "Spoiler",
      icon: <span className="text-xs font-mono font-bold">SP</span>,
      action: { type: "wrap" as const, open: "[spoiler]", close: "[/spoiler]" },
    },
  ];

  return (
    <div className="space-y-1.5">
      {label && (
        <Flex align="center" justify="between">
          <Label.Root htmlFor={id} className="block text-gray-400 text-xs">
            {label}
          </Label.Root>
          <Flex align="center" gap="1">
            {toolbarButtons.map((btn) => (
              <button
                key={btn.title}
                type="button"
                title={btn.title}
                onClick={() => applyFormat(btn.action)}
                className="p-1 rounded text-gray-500 hover:text-gray-200 hover:bg-gray-700 transition-colors"
              >
                {btn.icon}
              </button>
            ))}
            <div className="w-px h-4 bg-gray-700 mx-1" />
            <button
              type="button"
              title={showPreview ? "Edit" : "Preview"}
              onClick={() => setShowPreview((v) => !v)}
              className={`p-1 rounded transition-colors ${
                showPreview
                  ? "text-violet-400 bg-violet-600/20"
                  : "text-gray-500 hover:text-gray-200 hover:bg-gray-700"
              }`}
            >
              {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </Flex>
        </Flex>
      )}

      {showPreview ? (
        <div
          className="w-full min-h-24 bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300"
          style={{ minHeight: `${rows * 1.5}rem` }}
        >
          {value.trim() ? (
            <MarkdownReview text={value} />
          ) : (
            <span className="text-gray-600 italic">Nothing to preview</span>
          )}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          id={id}
          rows={rows}
          value={value}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-violet-500 resize-none"
        />
      )}

      <Text as="p" size="1" color="gray" className="text-right">{value.length}/{maxLength}</Text>
    </div>
  );
}

