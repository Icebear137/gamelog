import Image from "next/image";
import { Gamepad2 } from "lucide-react";
import { Text, Flex, Grid } from "@radix-ui/themes";

interface SharedGame {
  game: { id: string; rawgId: number; name: string; coverImage: string | null };
}
interface Stats { sharedCount: number; myTotal: number; theirTotal: number }

interface Props {
  stats: Stats;
  sharedGames: SharedGame[];
  onGameClick: (rawgId: number) => void;
  onSeeAll: () => void;
}

export function SharedGamesGrid({ stats, sharedGames, onGameClick, onSeeAll }: Props) {
  return (
    <>
      <Flex align="center" justify="around" className="px-4 py-3">
        <div className="text-center">
          <Text as="p" size="2" weight="medium" className="font-bold text-white">{stats.myTotal}</Text>
          <Text as="p" className="text-[10px] text-gray-600 mt-0.5">My games</Text>
        </div>
        <div className="text-center">
          <Text as="p" size="2" weight="medium" className="font-bold text-violet-400">{stats.sharedCount}</Text>
          <Text as="p" className="text-[10px] text-gray-600 mt-0.5">In common</Text>
        </div>
        <div className="text-center">
          <Text as="p" size="2" weight="medium" className="font-bold text-white">{stats.theirTotal}</Text>
          <Text as="p" className="text-[10px] text-gray-600 mt-0.5">Their games</Text>
        </div>
      </Flex>

      <div className="px-4 py-3 flex-1">
        <Flex align="center" justify="between" className="mb-2.5">
          <Flex align="center" className="gap-1.5">
            <Gamepad2 size={12} className="text-gray-500" />
            <Text as="span" size="1" color="gray" className="font-medium">Shared games</Text>
          </Flex>
          {stats.sharedCount > 0 && (
            <button onClick={onSeeAll} className="text-[10px] text-violet-400 hover:text-violet-300 transition-colors">
              See all →
            </button>
          )}
        </Flex>

        {sharedGames.length === 0 && (
          <Text as="p" size="1" color="gray" className="text-center py-4">No games in common yet</Text>
        )}

        {sharedGames.length > 0 && (
          <Grid columns="3" gap="2">
            {sharedGames.map(({ game }) => (
              <button
                key={game.id}
                onClick={() => onGameClick(game.rawgId)}
                title={game.name}
                className="aspect-3/4 rounded-md overflow-hidden bg-white/5 hover:ring-1 hover:ring-violet-500/60 transition-all relative group"
              >
                {game.coverImage ? (
                  <Image src={game.coverImage} alt={game.name} fill className="object-cover group-hover:scale-105 transition-transform duration-200" sizes="64px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Gamepad2 size={14} className="text-gray-600" />
                  </div>
                )}
              </button>
            ))}
          </Grid>
        )}
      </div>
    </>
  );
}
