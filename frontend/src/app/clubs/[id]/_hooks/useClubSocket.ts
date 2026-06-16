"use client";

import { useState, useEffect } from "react";
import { getSocket } from "@/lib/socket-client";
import type { ClubMember } from "../_types";

export function useClubSocket(members?: ClubMember[]) {
  const [onlineSet, setOnlineSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const memberIds = members?.map((m) => m.user.id) ?? [];

    function handlePresence({ userId, isOnline }: { userId: string; isOnline: boolean }) {
      setOnlineSet((prev) => {
        const next = new Set(prev);
        if (isOnline) next.add(userId); else next.delete(userId);
        return next;
      });
    }

    function queryAll() { memberIds.forEach((uid) => socket!.emit("get_presence", { userId: uid })); }

    socket.on("presence_update", handlePresence);
    socket.on("connect", queryAll);
    if (socket.connected && memberIds.length > 0) queryAll();

    return () => {
      socket.off("presence_update", handlePresence);
      socket.off("connect", queryAll);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members]);

  return onlineSet;
}
