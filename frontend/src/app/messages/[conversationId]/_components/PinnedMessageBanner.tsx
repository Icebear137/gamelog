import { Pin, X } from "lucide-react";
import { PinnedMessage } from "@/lib/types";

interface Props {
  pinnedMessage: PinnedMessage;
  canPin: boolean;
  onScrollTo: () => void;
  onUnpin: () => void;
}

export function PinnedMessageBanner({ pinnedMessage, canPin, onScrollTo, onUnpin }: Props) {
  return (
    <button
      onClick={onScrollTo}
      className="w-full shrink-0 flex items-center gap-3 px-4 py-2 border-b border-white/8 bg-violet-950/40 hover:bg-violet-900/30 transition-colors text-left"
    >
      <Pin size={13} className="text-violet-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-violet-400 font-medium leading-none mb-0.5">
          Pinned · {pinnedMessage.sender.username}
        </p>
        <p className="text-xs text-gray-400 truncate">
          {pinnedMessage.audioUrl
            ? "🎤 Voice message"
            : pinnedMessage.imageUrl
            ? "📷 Photo"
            : pinnedMessage.body || "…"}
        </p>
      </div>
      {canPin && (
        <div
          role="button"
          onClick={(e) => { e.stopPropagation(); onUnpin(); }}
          className="p-1 text-gray-600 hover:text-gray-300 transition-colors shrink-0"
          title="Unpin"
        >
          <X size={13} />
        </div>
      )}
    </button>
  );
}
