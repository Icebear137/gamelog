import { X } from "lucide-react";
import { ChatMessage } from "@/lib/types";

interface Props {
  replyingTo: ChatMessage;
  nicknames: Map<string, string>;
  onCancel: () => void;
}

export function ReplyBar({ replyingTo, nicknames, onCancel }: Props) {
  const preview = (() => {
    if (replyingTo.body === "[deleted]") return "Message deleted";
    const multiCount = (() => {
      if (!replyingTo.imageUrls) return 0;
      try { return (JSON.parse(replyingTo.imageUrls) as string[]).length; } catch { return 0; }
    })();
    if (multiCount > 1) return `📷 ${multiCount} photos${replyingTo.body ? ` — ${replyingTo.body}` : ""}`;
    if (replyingTo.imageUrl && !replyingTo.body) return "📷 Photo";
    if (replyingTo.imageUrl && replyingTo.body) return `📷 ${replyingTo.body}`;
    return replyingTo.body;
  })();

  return (
    <div className="shrink-0 px-4 py-2 border-t border-white/8 bg-white/3 flex items-center gap-3">
      <div className="w-0.5 h-8 rounded-full bg-violet-400/60 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-violet-300 font-semibold truncate">
          Replying to {nicknames.get(replyingTo.senderId) ?? replyingTo.sender.username}
        </p>
        <p className="text-xs text-gray-500 truncate mt-0.5">{preview}</p>
      </div>
      <button
        onClick={onCancel}
        className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/8 transition-colors shrink-0"
        title="Cancel reply"
      >
        <X size={14} />
      </button>
    </div>
  );
}
