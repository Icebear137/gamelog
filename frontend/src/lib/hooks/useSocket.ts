"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/stores/auth";
import { useRealtimeStore } from "@/lib/stores/realtime";
import { connectSocket, disconnectSocket } from "@/lib/socket-client";

/**
 * Duy trì kết nối WebSocket (Socket.io) cho user đang đăng nhập.
 * Xử lý tất cả real-time events:
 *   - "notification"  → invalidate notif-count + notifications
 *   - "new_post"      → hiển thị banner "New posts" trên SocialFeed
 *   - "new_message"   → invalidate conversations + messages-unread
 *
 * Singleton pattern: socket được tạo 1 lần, tất cả component dùng chung.
 * Mount hook này 1 lần duy nhất trong layout/client wrapper.
 */
export function useSocket() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const qc = useQueryClient();
  const setFeedNew = useRealtimeStore((s) => s.setFeedNew);

  useEffect(() => {
    if (!user || !token) {
      disconnectSocket();
      return;
    }

    const socket = connectSocket(token);

    function onNotification() {
      qc.invalidateQueries({ queryKey: ["notif-count"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    }

    function onNewPost() {
      setFeedNew(useRealtimeStore.getState().newFeedCount + 1);
    }

    function onNewMessage(data: { conversationId: string }) {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["messages-unread"] });
      qc.invalidateQueries({ queryKey: ["messages", data.conversationId] });
    }

    socket.on("notification", onNotification);
    socket.on("new_post", onNewPost);
    socket.on("new_message", onNewMessage);

    return () => {
      socket.off("notification", onNotification);
      socket.off("new_post", onNewPost);
      socket.off("new_message", onNewMessage);
    };
  }, [user, token, qc, setFeedNew]);
}
