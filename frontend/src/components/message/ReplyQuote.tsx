import { Text } from "@radix-ui/themes";
import { ChatMessage } from "@/lib/types";

interface Props {
  replyTo: NonNullable<ChatMessage["replyTo"]>;
  isOwn: boolean;
}

export function ReplyQuote({ replyTo, isOwn }: Props) {
  const isDeleted = replyTo.body === "[deleted]";
  const multiCount = (() => {
    if (!replyTo.imageUrls) return 0;
    try { return (JSON.parse(replyTo.imageUrls) as string[]).length; } catch { return 0; }
  })();
  const preview = isDeleted
    ? "Message deleted"
    : multiCount > 1
    ? `📷 ${multiCount} photos${replyTo.body ? ` — ${replyTo.body}` : ""}`
    : replyTo.imageUrl && !replyTo.body
    ? "📷 Photo"
    : replyTo.imageUrl
    ? `📷 ${replyTo.body}`
    : replyTo.body;

  return (
    <div className={`flex items-stretch rounded-xl overflow-hidden mb-1 max-w-full ${isOwn ? "self-end" : "self-start"}`}>
      <div className={`w-0.5 shrink-0 ${isOwn ? "bg-violet-300/60" : "bg-violet-400/60"}`} />
      <div className={`px-3 py-1.5 text-xs min-w-0 ${isOwn ? "bg-violet-800/40 text-violet-200" : "bg-white/8 text-gray-300"}`}>
        <Text as="p" weight="bold" className={`mb-0.5 truncate ${isOwn ? "text-violet-300" : "text-violet-400"}`}>
          {replyTo.sender.username}
        </Text>
        <Text as="p" className={`truncate ${isDeleted ? "italic text-gray-500" : ""}`}>{preview}</Text>
      </div>
    </div>
  );
}
