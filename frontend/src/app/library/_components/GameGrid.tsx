import { Gamepad2 } from "lucide-react";
import { GameEntry } from "@/lib/types";
import { GameCard } from "./GameCard";

interface Props { entries: GameEntry[]; loading: boolean }

export function GameGrid({ entries, loading }: Props) {
  if (loading) return (
    <p style={{ fontSize: 13, color: "var(--gx-text-2)", padding: "16px 0" }}>Loading…</p>
  );
  if (entries.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "56px 16px", gap: 10 }}>
        <Gamepad2 size={36} color="var(--gx-text-3)" />
        <p style={{ fontSize: 13, color: "var(--gx-text-2)" }}>No games here yet.</p>
      </div>
    );
  }
  return (
    <div className="gx-lib-grid">
      {entries.map((entry) => (
        <GameCard key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
