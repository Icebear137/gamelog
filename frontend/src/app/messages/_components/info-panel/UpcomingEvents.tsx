import { CalendarDays, Monitor } from "lucide-react";
import { Text, Flex } from "@radix-ui/themes";
import type { GameNightData } from "@/lib/types";

interface Props { gameNights: GameNightData[] }

export function UpcomingEvents({ gameNights }: Props) {
  if (gameNights.length === 0) return null;
  return (
    <div className="px-3 py-2">
      <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider px-1 mb-1.5 flex items-center gap-1.5">
        <CalendarDays size={10} />
        Upcoming Events
      </p>
      <Flex direction="column" gap="1">
        {gameNights.map((gn) => {
          const scheduled = new Date(gn.scheduledAt);
          const dateStr = scheduled.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
          const timeStr = scheduled.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
          const goingCount = gn.rsvps.filter((r) => r.status === "going").length;
          const maybeCount = gn.rsvps.filter((r) => r.status === "maybe").length;
          return (
            <div key={gn.id} className="bg-white/4 border border-white/8 rounded-xl px-2.5 py-2">
              <Text as="p" size="1" truncate className="font-medium text-white">{gn.title}</Text>
              <Flex align="center" className="gap-2 mt-1 flex-wrap">
                <span className="text-[10px] text-gray-500 flex items-center gap-1">
                  <CalendarDays size={9} className="shrink-0" />{dateStr} · {timeStr}
                </span>
                {gn.platform && (
                  <span className="text-[10px] text-gray-600 flex items-center gap-1">
                    <Monitor size={9} className="shrink-0" />{gn.platform}
                  </span>
                )}
              </Flex>
              {(goingCount > 0 || maybeCount > 0) && (
                <Flex align="center" className="gap-2 mt-1">
                  {goingCount > 0 && <span className="text-[10px] text-emerald-500">{goingCount} going</span>}
                  {maybeCount > 0 && <span className="text-[10px] text-amber-500">{maybeCount} maybe</span>}
                </Flex>
              )}
            </div>
          );
        })}
      </Flex>
    </div>
  );
}
