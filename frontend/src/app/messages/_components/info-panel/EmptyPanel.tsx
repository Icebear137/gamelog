import { Users } from "lucide-react";
import { Flex, Text } from "@radix-ui/themes";

export function EmptyPanel() {
  return (
    <Flex direction="column" align="center" justify="center" height="100%" gap="3" px="4" style={{ textAlign: "center" }}>
      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
        <Users size={18} className="text-gray-600" />
      </div>
      <Text as="p" size="1" color="gray" className="leading-relaxed">
        Select a conversation<br />to see details
      </Text>
    </Flex>
  );
}
