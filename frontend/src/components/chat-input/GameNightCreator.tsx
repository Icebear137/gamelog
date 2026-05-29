"use client";

import { useState, useEffect } from "react";
import { Text, Flex } from "@radix-ui/themes";
import * as Select from "@radix-ui/react-select";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { CalendarDays, X, ChevronDown, Gamepad2, Search, Loader2 } from "lucide-react";
import Image from "next/image";
import { api } from "@/lib/api";
import { IconButton, Button, Input } from "@/components/ui";
import { GNSelect, gnSelectTriggerCls, gnSelectContentCls, gnSelectItemCls } from "./GNSelect";

const PLATFORMS = ["PC", "PS5", "PS4", "Xbox Series X|S", "Xbox One", "Nintendo Switch", "iOS/Android", "Other"] as const;

const MONTHS = [
  { v: "1", l: "Jan" }, { v: "2", l: "Feb" }, { v: "3", l: "Mar" },
  { v: "4", l: "Apr" }, { v: "5", l: "May" }, { v: "6", l: "Jun" },
  { v: "7", l: "Jul" }, { v: "8", l: "Aug" }, { v: "9", l: "Sep" },
  { v: "10", l: "Oct" }, { v: "11", l: "Nov" }, { v: "12", l: "Dec" },
];
const DAYS = Array.from({ length: 31 }, (_, i) => ({ v: String(i + 1), l: String(i + 1) }));
const NOW_YEAR = new Date().getFullYear();
const YEARS = [NOW_YEAR, NOW_YEAR + 1, NOW_YEAR + 2].map((y) => ({ v: String(y), l: String(y) }));
const HOURS = Array.from({ length: 24 }, (_, i) => ({ v: String(i), l: String(i).padStart(2, "0") }));
const MINUTES = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map((m) => ({ v: m, l: m }));

interface GameResult { rawgId: number; name: string; coverImage?: string | null }

interface Props {
  onSubmit: (data: { title: string; scheduledAt: string; rawgId?: number; platform?: string; note?: string }) => void;
  onClose: () => void;
}

export function GameNightCreator({ onSubmit, onClose }: Props) {
  const [title, setTitle] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [year, setYear] = useState(String(NOW_YEAR));
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("00");
  const [platform, setPlatform] = useState("");
  const [note, setNote] = useState("");
  const [gameQuery, setGameQuery] = useState("");
  const [gameResults, setGameResults] = useState<GameResult[]>([]);
  const [gameLoading, setGameLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameResult | null>(null);

  useEffect(() => {
    const q = gameQuery.trim();
    if (!q) { setGameResults([]); return; }
    const timer = setTimeout(async () => {
      setGameLoading(true);
      try {
        const { data: games } = await api.get<GameResult[]>(`/api/games/search?q=${encodeURIComponent(q)}`);
        setGameResults(games);
      } catch { setGameResults([]); }
      finally { setGameLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [gameQuery]);

  const canSubmit = title.trim().length > 0 && !!month && !!day && !!year && !!hour;

  function handleSubmit() {
    if (!canSubmit) return;
    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
    onSubmit({
      title: title.trim(),
      scheduledAt: d.toISOString(),
      rawgId: selectedGame?.rawgId,
      platform: platform || undefined,
      note: note.trim() || undefined,
    });
    onClose();
  }

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl z-50">
      <Flex align="center" justify="between" className="px-3 py-2.5 border-b border-white/8">
        <Flex align="center" gap="2" className="text-emerald-400">
          <CalendarDays size={14} />
          <Text as="span" size="2" weight="bold">Schedule game night</Text>
        </Flex>
        <IconButton label="Close" onClick={onClose}><X size={14} /></IconButton>
      </Flex>

      <Flex direction="column" className="px-3 py-3 gap-2.5">
        <Input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Event title…"
          maxLength={100}
          className="focus:border-emerald-500/50"
        />

        <div className="flex gap-1.5">
          <div className="flex-2"><GNSelect value={month} onValueChange={setMonth} options={MONTHS} placeholder="Month" /></div>
          <div className="flex-1"><GNSelect value={day} onValueChange={setDay} options={DAYS} placeholder="Day" /></div>
          <div className="flex-1"><GNSelect value={year} onValueChange={setYear} options={YEARS} placeholder="Year" /></div>
        </div>

        <div className="flex gap-1.5 items-center">
          <div className="flex-1"><GNSelect value={hour} onValueChange={setHour} options={HOURS} placeholder="Hour" /></div>
          <span className="text-gray-500 font-bold shrink-0">:</span>
          <div className="flex-1"><GNSelect value={minute} onValueChange={setMinute} options={MINUTES} placeholder="Min" /></div>
        </div>

        <Select.Root value={platform || undefined} onValueChange={(v) => setPlatform(v === "__none__" ? "" : v)}>
          <Select.Trigger className={`${gnSelectTriggerCls} px-3`}>
            <Select.Value placeholder="Platform (optional)" />
            <Select.Icon><ChevronDown size={13} className="text-gray-500 shrink-0" /></Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Content className={gnSelectContentCls} position="popper" sideOffset={4}>
              <Select.Viewport className="max-h-48 overflow-y-auto">
                <Select.Item value="__none__" className={`${gnSelectItemCls} text-gray-500`}>
                  <Select.ItemText>— No platform —</Select.ItemText>
                </Select.Item>
                {PLATFORMS.map((p) => (
                  <Select.Item key={p} value={p} className={gnSelectItemCls}>
                    <Select.ItemText>{p}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>

        {selectedGame ? (
          <Flex align="center" gap="2" className="bg-white/5 border border-white/10 rounded-xl px-3 py-2">
            <Gamepad2 size={13} className="text-emerald-400 shrink-0" />
            <Text as="span" size="2" className="truncate flex-1">{selectedGame.name}</Text>
            <IconButton label="Remove game" size="xs" onClick={() => setSelectedGame(null)}>
              <X size={12} />
            </IconButton>
          </Flex>
        ) : (
          <DropdownMenu.Root
            open={gameResults.length > 0}
            onOpenChange={(open) => { if (!open) setGameResults([]); }}
          >
            <DropdownMenu.Trigger asChild>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 cursor-text">
                {gameLoading
                  ? <Loader2 size={12} className="animate-spin text-gray-500 shrink-0" />
                  : <Search size={12} className="text-gray-500 shrink-0" />}
                <input
                  value={gameQuery}
                  onChange={(e) => setGameQuery(e.target.value)}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Search any game (optional)…"
                  className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none"
                />
                {gameQuery && (
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); setGameQuery(""); setGameResults([]); }}
                    className="p-0.5 text-gray-500 hover:text-gray-300 shrink-0"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                side="top"
                sideOffset={4}
                align="start"
                className="bg-zinc-900 border border-white/10 rounded-xl p-1 shadow-2xl overflow-hidden max-h-44 overflow-y-auto w-(--radix-dropdown-menu-trigger-width) z-9999"
                onInteractOutside={(e) => e.preventDefault()}
              >
                {gameResults.map((g) => (
                  <DropdownMenu.Item
                    key={g.rawgId}
                    onSelect={() => { setSelectedGame(g); setGameQuery(""); setGameResults([]); }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg outline-none cursor-pointer data-highlighted:bg-white/8 transition-colors"
                  >
                    {g.coverImage ? (
                      <div className="relative w-6 h-8 rounded overflow-hidden shrink-0">
                        <Image src={g.coverImage} alt={g.name} fill className="object-cover" sizes="24px" />
                      </div>
                    ) : (
                      <div className="w-6 h-8 bg-white/8 rounded shrink-0 flex items-center justify-center">
                        <Gamepad2 size={11} className="text-gray-600" />
                      </div>
                    )}
                    <span className="text-sm text-white truncate">{g.name}</span>
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        )}

        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note… (optional)"
          maxLength={300}
          className="focus:border-emerald-500/50"
        />

        <Flex justify="end" className="pt-0.5">
          <Button variant="success" size="sm" disabled={!canSubmit} onClick={handleSubmit}>
            Schedule
          </Button>
        </Flex>
      </Flex>
    </div>
  );
}
