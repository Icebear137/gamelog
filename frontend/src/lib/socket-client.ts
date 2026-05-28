import { io, Socket } from "socket.io-client";

/** Module-level singleton — 1 WebSocket connection dùng chung toàn app */
let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  // Reuse nếu đã connected
  if (socket?.connected) return socket;
  // Cleanup stale socket trước khi tạo mới
  socket?.disconnect();

  socket = io(process.env.NEXT_PUBLIC_API_URL!, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30_000,
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

/** Lấy socket hiện tại (có thể null nếu chưa connect) */
export function getSocket(): Socket | null {
  return socket;
}
