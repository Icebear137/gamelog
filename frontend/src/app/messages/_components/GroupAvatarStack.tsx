import { Users } from "lucide-react";
import Avatar from "@/components/Avatar";

interface Participant { id: string; username: string; avatar?: string | null }

export function GroupAvatarStack({ participants }: { participants: Participant[] }) {
  const visible = participants.slice(0, 2);
  const extra = participants.length - 2;
  return (
    <div className="relative w-10 h-10 shrink-0">
      {visible.length === 0 && (
        <div className="w-10 h-10 rounded-full bg-violet-700/40 flex items-center justify-center">
          <Users size={16} className="text-violet-300" />
        </div>
      )}
      {visible.length >= 2 && (
        <>
          <div className="absolute bottom-0 left-0 w-7 h-7 rounded-full border-2 border-zinc-900 overflow-hidden bg-violet-700 flex items-center justify-center">
            {visible[1].avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={visible[1].avatar} alt={visible[1].username} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-bold uppercase text-[10px] leading-none select-none">{visible[1].username[0]}</span>
            )}
          </div>
          <div className="absolute top-0 right-0 w-7 h-7 rounded-full border-2 border-zinc-900 overflow-hidden bg-violet-700 flex items-center justify-center">
            {visible[0].avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={visible[0].avatar} alt={visible[0].username} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-bold uppercase text-[10px] leading-none select-none">{visible[0].username[0]}</span>
            )}
          </div>
        </>
      )}
      {visible.length === 1 && (
        <div className="w-10 h-10 rounded-full overflow-hidden">
          <Avatar src={visible[0].avatar ?? undefined} username={visible[0].username} size="md" />
        </div>
      )}
      {extra > 0 && (
        <span className="absolute -bottom-0.5 -right-0.5 min-w-4 h-4 bg-zinc-700 border border-zinc-900 text-[9px] text-gray-300 font-bold rounded-full flex items-center justify-center px-0.5">
          +{extra}
        </span>
      )}
    </div>
  );
}
