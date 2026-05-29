"use client";

import { UserPlus, UserMinus, ExternalLink } from "lucide-react";
import { Text, Flex } from "@radix-ui/themes";
import { Button } from "@/components/ui";
import Avatar from "@/components/Avatar";
import type { User } from "@/lib/types";

interface OtherUser { id: string; username: string; avatar?: string | null }

interface Props {
  me: { id: string } | null;
  otherUser: OtherUser;
  profile?: User;
  isFollowing: boolean;
  followPending: boolean;
  onFollow: (currentlyFollowing: boolean) => void;
  onViewProfile: () => void;
}

export function DMProfileSection({ me, otherUser, profile, isFollowing, followPending, onFollow, onViewProfile }: Props) {
  return (
    <Flex direction="column" align="center" className="gap-2.5 px-4 pt-6 pb-4">
      <Avatar src={otherUser.avatar} username={otherUser.username} size="lg" />
      <div className="text-center min-w-0 w-full">
        <Text as="p" size="2" truncate className="font-semibold text-white">{otherUser.username}</Text>
        {profile?.bio && (
          <Text as="p" size="1" color="gray" className="mt-1 leading-relaxed line-clamp-3 px-1">{profile.bio}</Text>
        )}
      </div>
      <Flex gap="2" className="w-full mt-1">
        {me && me.id !== otherUser.id && (
          <Button
            variant={isFollowing ? "outline" : "primary"}
            size="sm"
            loading={followPending}
            onClick={() => onFollow(isFollowing)}
            className="flex-1"
            icon={!followPending ? (isFollowing ? <UserMinus size={11} /> : <UserPlus size={11} />) : undefined}
          >
            {isFollowing ? "Following" : "Follow"}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onViewProfile}
          icon={<ExternalLink size={13} />}
        />
      </Flex>
    </Flex>
  );
}
