"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { Sparkles, X, Send, Loader2, Trash2 } from "lucide-react";
import { Text } from "@radix-ui/themes";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

const WELCOME: ChatMsg = {
  role: "assistant",
  content: "Hi! I'm the GameLog assistant. I can help you navigate the site, explain features, or guide you through anything on GameLog. What do you need help with?",
};

export default function AIChatbox() {
  const [isOpen, setIsOpen]       = useState(false);
  const [messages, setMessages]   = useState<ChatMsg[]>([WELCOME]);
  const [input, setInput]         = useState("");
  const [isStreaming, setStreaming] = useState(false);
  const bottomRef    = useRef<HTMLDivElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const pathname     = usePathname();

  // Hide on messages pages
  const isMessages = pathname?.startsWith("/messages");

  // Extract rawgId if on a game detail page
  const rawgId = useMemo(() => {
    const m = pathname?.match(/^\/game\/(\d+)/);
    return m ? parseInt(m[1]) : undefined;
  }, [pathname]);

  if (isMessages) return null;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) setTimeout(() => textareaRef.current?.focus(), 150);
  }, [isOpen]);

  async function send() {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMsg: ChatMsg = { role: "user", content: text };
    // Keep last 20 messages in history to avoid token explosion
    const history = [...messages.slice(-20), userMsg];
    setMessages(history);
    setInput("");
    setStreaming(true);

    // Placeholder bubble for streaming response
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages: history, rawgId }),
      });

      if (!res.ok || !res.body) {
        throw new Error(res.status === 503 ? "AI service not configured" : "Request failed");
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let aiContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.token) {
              aiContent += parsed.token;
              setMessages(prev => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: aiContent };
                return copy;
              });
            }
          } catch (e: any) {
            if (e?.message !== "SyntaxError") throw e;
          }
        }
      }
    } catch (err: any) {
      setMessages(prev => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: "assistant",
          content: err?.message === "AI service not configured"
            ? "AI service is not configured yet. Please add a GEMINI_API_KEY to the backend .env file."
            : "Sorry, something went wrong. Please try again.",
        };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat panel */}
      <div
        className={`absolute bottom-18 right-0 w-80 h-125 flex flex-col bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden transition-all duration-200 origin-bottom-right ${
          isOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-violet-600/15 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-violet-400" />
            <Text size="2" weight="bold">GameLog Assistant</Text>
            {rawgId && (
              <span className="text-[10px] bg-violet-500/20 text-violet-300 border border-violet-500/30 px-1.5 py-0.5 rounded-full leading-none">
                game context
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMessages([WELCOME])}
              title="Clear conversation"
              className="p-1.5 text-gray-600 hover:text-gray-300 transition-colors rounded-lg hover:bg-white/8"
            >
              <Trash2 size={13} />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-gray-600 hover:text-white transition-colors rounded-lg hover:bg-white/8"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {messages.map((msg, i) => {
            const isLast = i === messages.length - 1;
            const isEmpty = msg.content === "";
            return (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} items-end gap-2`}>
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-violet-600/30 border border-violet-500/30 flex items-center justify-center shrink-0">
                    <Sparkles size={11} className="text-violet-400" />
                  </div>
                )}
                <div
                  className={`max-w-[84%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-violet-600/90 text-white rounded-br-sm"
                      : "bg-white/8 text-gray-100 rounded-bl-sm"
                  }`}
                >
                  {isEmpty && isLast && isStreaming ? (
                    <span className="flex gap-1 items-center h-4">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                    </span>
                  ) : (
                    <span className="whitespace-pre-wrap wrap-break-word">{msg.content}</span>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 p-3 border-t border-white/8 flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="How do I…"
            rows={1}
            disabled={isStreaming}
            className="flex-1 bg-white/8 border border-white/10 hover:border-white/20 focus:border-violet-500 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 outline-none resize-none transition-colors disabled:opacity-50"
            style={{ fieldSizing: "content", maxHeight: "80px" } as React.CSSProperties}
          />
          <button
            onClick={send}
            disabled={!input.trim() || isStreaming}
            className="p-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white transition-colors shrink-0"
          >
            {isStreaming ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>
      </div>

      {/* Floating button */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className={`w-14 h-14 rounded-full shadow-lg shadow-violet-900/50 flex items-center justify-center transition-all duration-200 hover:scale-110 ${
          isOpen ? "bg-violet-500" : "bg-violet-600 hover:bg-violet-500"
        }`}
        aria-label="Open AI gaming assistant"
      >
        <Sparkles size={22} className="text-white" />
      </button>
    </div>
  );
}
