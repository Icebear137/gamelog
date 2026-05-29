import { Flex } from "@radix-ui/themes";
import { MessageReaction } from "@/lib/types";

interface Props {
  reactions: MessageReaction[];
  currentUserId: string;
  isOwn: boolean;
  onToggle: (emoji: string) => void;
}

export function ReactionPills({ reactions, currentUserId, isOwn, onToggle }: Props) {
  const groups: Record<string, { count: number; byMe: boolean }> = {};
  for (const r of reactions) {
    if (!groups[r.emoji]) groups[r.emoji] = { count: 0, byMe: false };
    groups[r.emoji].count++;
    if (r.userId === currentUserId) groups[r.emoji].byMe = true;
  }
  const entries = Object.entries(groups);
  if (entries.length === 0) return null;

  return (
    <Flex wrap="wrap" gap="1" className={`mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
      {entries.map(([emoji, { count, byMe }]) => (
        <button
          key={emoji}
          onClick={() => onToggle(emoji)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
            byMe
              ? "bg-violet-500/25 border-violet-400/50 text-white"
              : "bg-white/8 border-white/10 text-gray-300 hover:bg-white/15"
          }`}
        >
          <span>{emoji}</span>
          <span className="font-semibold tabular-nums">{count}</span>
        </button>
      ))}
    </Flex>
  );
}
