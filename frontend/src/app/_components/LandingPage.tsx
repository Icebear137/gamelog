"use client";

import { useRouter } from "next/navigation";
import { Gamepad2 } from "lucide-react";
import { Text, Heading, Flex, Box } from "@radix-ui/themes";

export default function LandingPage() {
  const router = useRouter();

  return (
    <Flex direction="column" align="center" justify="center" className="min-h-[70vh] text-center" gap="6">
      <div className="w-16 h-16 bg-violet-600 rounded-2xl flex items-center justify-center">
        <Gamepad2 size={32} />
      </div>
      <Box>
        <Heading size="8" className="mb-3">Track your games.</Heading>
        <Heading size="8" color="violet" className="mb-4">Share the journey.</Heading>
        <Text as="p" size="2" color="gray" className="max-w-md">
          GameLog is your social gaming journal — log games, rate them, write reviews, and see what your friends are playing.
        </Text>
      </Box>
      <Flex gap="3">
        <button
          onClick={() => router.push("/register")}
          className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
        >
          Get Started
        </button>
        <button
          onClick={() => router.push("/discover")}
          className="bg-white/8 hover:bg-gray-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
        >
          Explore
        </button>
      </Flex>
    </Flex>
  );
}
