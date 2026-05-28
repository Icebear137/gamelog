"use client";

import { useSocket } from "@/lib/hooks/useSocket";

/** Duy trì kết nối WebSocket cho real-time events. Renders nothing. */
export default function NotificationStream() {
  useSocket();
  return null;
}
