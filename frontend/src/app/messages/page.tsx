"use client";

import { MessageCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Flex, Text } from "@radix-ui/themes";

export default function MessagesPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Flex flexGrow="1" direction="column" align="center" justify="center" gap="3" className="text-gray-600">
        <MessageCircle size={40} className="opacity-20" />
        <Text as="p" size="2" color="gray">Sign in to view your messages.</Text>
      </Flex>
    );
  }

  return (
    <Flex flexGrow="1" direction="column" align="center" justify="center" gap="3" className="text-gray-600 select-none">
      <div className="w-16 h-16 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/8 flex items-center justify-center">
        <MessageCircle size={28} className="text-gray-700" />
      </div>
      <div className="text-center">
        <Text as="p" size="2" color="gray">Select a conversation</Text>
        <Text as="p" size="1" color="gray" className="mt-1">or visit someone&apos;s profile to start chatting</Text>
      </div>
    </Flex>
  );
}

