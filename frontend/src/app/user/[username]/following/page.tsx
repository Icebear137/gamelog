"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { Text, Heading, Flex, Box } from "@radix-ui/themes";
import { ArrowLeft, Users } from "lucide-react";
import Link from "next/link";
import { getUserFollowingService } from "@/services/user.service";
import Avatar from "@/components/Avatar";

interface FollowUser {
  id: string;
  username: string;
  avatar?: string;
  bio?: string;
}

export default function FollowingPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);

  const { data: following = [], isLoading } = useQuery<FollowUser[]>({
    queryKey: ["following", username],
    queryFn: () => getUserFollowingService(username),
  });

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <Flex align="center" gap="3">
        <Link
          href={`/user/${username}`}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <Heading size="5">{username}</Heading>
          <Text as="p" size="2" color="gray">Following</Text>
        </div>
      </Flex>

      {isLoading && <Text as="p" size="2" color="gray">Loading...</Text>}

      {!isLoading && following.length === 0 && (
        <div className="text-center py-16">
          <Users size={36} className="mx-auto mb-3 opacity-30" />
          <Text as="p" color="gray">Not following anyone yet.</Text>
        </div>
      )}

      <div className="space-y-2">
        {following.map((u) => (
          <Link
            key={u.id}
            href={`/user/${u.username}`}
            className="flex items-center gap-3 bg-white/5 backdrop-blur-sm border border-white/8 rounded-xl p-3 hover:border-violet-700 transition-colors"
          >
            <Avatar src={u.avatar} username={u.username} />
            <Box flexGrow="1" minWidth="0">
              <Text as="p" size="2" className="font-semibold">{u.username}</Text>
              {u.bio && <Text as="p" size="1" color="gray" className="truncate">{u.bio}</Text>}
            </Box>
          </Link>
        ))}
      </div>
    </div>
  );
}
