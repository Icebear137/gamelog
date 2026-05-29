import Image from "next/image";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { Conversation } from "@/lib/types";
import { formatDistanceToNow } from "@/lib/utils";
import Avatar from "@/components/Avatar";
import { GroupAvatarStack } from "./GroupAvatarStack";
import { Box } from "@radix-ui/themes";

interface Props {
  conv: Conversation;
  isActive: boolean;
  isOnline: boolean;
  currentUserId: string;
}

function buildPreview(conv: Conversation, currentUserId: string): React.ReactNode {
  const lastMsg = conv.lastMessage;
  if (!lastMsg) return <span className="italic">No messages yet</span>;

  const isOwn = lastMsg.senderId === currentUserId;
  const prefix = isOwn ? "You: " : (conv.isGroup ? `${lastMsg.sender.username}: ` : "");

  if (lastMsg.body === "[deleted]") return <><span>{prefix}</span><span className="italic">Message deleted</span></>;
  if (lastMsg.game) return <span>{prefix}🎮 {lastMsg.game.name}</span>;
  if ((lastMsg as any).audioUrl) return <span>{prefix}🎤 Voice message</span>;
  if (lastMsg.imageUrls) {
    try {
      const n = (JSON.parse(lastMsg.imageUrls) as string[]).length;
      return <span>{prefix}📷 {n} photo{n > 1 ? "s" : ""}</span>;
    } catch { return <span>{prefix}📷 Photos</span>; }
  }
  if (lastMsg.imageUrl && !lastMsg.body) return <span>{prefix}📷 Photo</span>;
  if (lastMsg.imageUrl) return <span>{prefix}📷 {lastMsg.body}</span>;
  return <span>{prefix}{lastMsg.body}</span>;
}

export function ConversationItem({ conv, isActive, isOnline, currentUserId }: Props) {
  const router = useRouter();
  const hasUnread = conv.unreadCount > 0;
  const displayName = conv.isGroup ? (conv.name ?? "Group") : (conv.otherUser?.username ?? "Unknown");
  const preview = buildPreview(conv, currentUserId);

  return (
    <button
      onClick={() => router.push(`/messages/${conv.id}`)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${isActive ? "bg-white/8" : "hover:bg-white/5"}`}
    >
      <div className="relative shrink-0">
        {conv.isGroup ? (
          conv.avatar ? (
            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
              <Image src={conv.avatar} alt={conv.name ?? "Group"} width={40} height={40} className="object-cover w-full h-full" />
            </div>
          ) : (
            <GroupAvatarStack participants={conv.participants} />
          )
        ) : (
          <>
            <Avatar src={conv.otherUser?.avatar} username={conv.otherUser?.username ?? "?"} size="md" />
            {conv.otherUser && isOnline && (
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-zinc-900" />
            )}
          </>
        )}
        {hasUnread && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 bg-violet-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
          </span>
        )}
      </div>

      <Box flexGrow="1" minWidth="0">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            {conv.isGroup && <Users size={11} className="text-violet-400 shrink-0" />}
            <span className={`text-sm truncate ${hasUnread ? "font-semibold text-white" : "font-medium text-gray-300"}`}>
              {displayName}
            </span>
          </div>
          {conv.lastMessage && (
            <span className="text-[10px] text-gray-600 shrink-0">{formatDistanceToNow(conv.lastMessage.createdAt)}</span>
          )}
        </div>
        <p className={`text-xs truncate mt-0.5 ${hasUnread ? "text-gray-400 font-medium" : "text-gray-600"}`}>
          {preview}
        </p>
      </Box>
    </button>
  );
}
