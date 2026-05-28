import { GameStatus } from "@/lib/types";
import clsx from "clsx";

const config: Record<GameStatus, { label: string; className: string }> = {
  PLAYING: { label: "Playing", className: "bg-green-900/50 text-green-400 border border-green-700" },
  COMPLETED: { label: "Completed", className: "bg-blue-900/50 text-blue-400 border border-blue-700" },
  DROPPED: { label: "Dropped", className: "bg-red-900/50 text-red-400 border border-red-700" },
  WANT_TO_PLAY: { label: "Want to Play", className: "bg-yellow-900/50 text-yellow-400 border border-yellow-700" },
};

export default function StatusBadge({ status }: { status: GameStatus }) {
  const { label, className } = config[status];
  return (
    <span className={clsx("text-xs font-medium px-2 py-0.5 rounded-full", className)}>
      {label}
    </span>
  );
}
