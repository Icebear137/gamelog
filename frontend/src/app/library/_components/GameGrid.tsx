import { Gamepad2 } from "lucide-react";
import { GameEntry } from "@/lib/types";
import { GameCard } from "./GameCard";
import { Text, Flex, Grid } from "@radix-ui/themes";

interface Props { entries: GameEntry[]; loading: boolean }

export function GameGrid({ entries, loading }: Props) {
  if (loading) return <Text as="p" size="2" color="gray">Loading...</Text>;
  if (entries.length === 0) {
    return (
      <Flex direction="column" align="center" className="py-16 text-gray-500">
        <Gamepad2 size={40} className="mx-auto mb-3 opacity-30" />
        <Text as="p" color="gray">No games here yet.</Text>
      </Flex>
    );
  }
  return (
    <Grid columns={{ initial: "2", sm: "3", md: "4", lg: "5" }} gap="4">
      {entries.map((entry) => (
        <GameCard key={entry.id} entry={entry} />
      ))}
    </Grid>
  );
}
