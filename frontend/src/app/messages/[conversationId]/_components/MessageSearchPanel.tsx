import { ChatMessage } from "@/lib/types";
import { formatDistanceToNow } from "@/lib/utils";
import Avatar from "@/components/Avatar";

interface Props {
  debouncedSearch: string;
  searchFetching: boolean;
  searchResults: ChatMessage[];
  currentUserId: string;
  onScrollToMessage: (id: string) => void;
}

export function MessageSearchPanel({ debouncedSearch, searchFetching, searchResults, currentUserId, onScrollToMessage }: Props) {
  return (
    <div className="shrink-0 border-b border-white/8 max-h-72 overflow-y-auto bg-zinc-950">
      {debouncedSearch.trim().length < 2 && (
        <p className="py-8 text-center text-xs text-gray-600">Type at least 2 characters to search</p>
      )}
      {debouncedSearch.trim().length >= 2 && !searchFetching && searchResults.length === 0 && (
        <p className="py-8 text-center text-xs text-gray-600">No messages found for &quot;{debouncedSearch}&quot;</p>
      )}
      {searchResults.map((msg) => {
        const isOwn = msg.senderId === currentUserId;
        const bodyLower = msg.body.toLowerCase();
        const qLower = debouncedSearch.toLowerCase();
        const matchIdx = bodyLower.indexOf(qLower);
        const highlighted = matchIdx === -1 ? (
          <span className="truncate">{msg.body}</span>
        ) : (
          <span>
            {msg.body.slice(0, matchIdx)}
            <mark className="bg-violet-500/40 text-white rounded-sm not-italic">
              {msg.body.slice(matchIdx, matchIdx + debouncedSearch.length)}
            </mark>
            {msg.body.slice(matchIdx + debouncedSearch.length)}
          </span>
        );
        return (
          <button
            key={msg.id}
            onClick={() => onScrollToMessage(msg.id)}
            className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
          >
            <Avatar src={msg.sender.avatar} username={msg.sender.username} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-semibold text-gray-300">{isOwn ? "You" : msg.sender.username}</span>
                <span className="text-[10px] text-gray-600">{formatDistanceToNow(msg.createdAt)}</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{highlighted}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
