"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Gamepad2, Search, LogOut, User, Settings, Bell, List, MessageCircle, Shield } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { Flex } from "@radix-ui/themes";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import Avatar from "./Avatar";

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const { data: notifData } = useQuery<{ count: number }>({
    queryKey: ["notif-count"],
    queryFn: () => api.get("/api/notifications/unread-count").then((r) => r.data),
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: msgData } = useQuery<{ count: number }>({
    queryKey: ["messages-unread"],
    queryFn: () => api.get("/api/messages/unread-count").then((r) => r.data),
    enabled: !!user,
    staleTime: 60_000,
  });

  const unreadCount = notifData?.count ?? 0;
  const unreadMessages = msgData?.count ?? 0;

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <nav className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/8">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 text-violet-400 font-bold text-lg mr-4">
          <Gamepad2 size={22} />
          <span>GameLog</span>
        </Link>

        <Link href="/discover" className="text-gray-400 hover:text-white transition-colors text-sm">
          Discover
        </Link>
        <Link href="/lists/discover" className="text-gray-400 hover:text-white transition-colors text-sm">
          Lists
        </Link>
        <Link href="/reviews" className="text-gray-400 hover:text-white transition-colors text-sm">
          Reviews
        </Link>
        <Link href="/clubs" className="text-gray-400 hover:text-white transition-colors text-sm">
          Clubs
        </Link>
        <Link href="/leaderboard" className="text-gray-400 hover:text-white transition-colors text-sm">
          Leaderboard
        </Link>
        <Link href="/search" className="text-gray-400 hover:text-white transition-colors text-sm">
          <Search size={18} />
        </Link>

        <Flex align="center" gap="2" className="ml-auto">
          {user ? (
            <>
              <Link href="/messages" className="relative text-gray-400 hover:text-white transition-colors p-1.5">
                <MessageCircle size={20} />
                {unreadMessages > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 bg-violet-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                    {unreadMessages > 9 ? "9+" : unreadMessages}
                  </span>
                )}
              </Link>

              <Link href="/notifications" className="relative text-gray-400 hover:text-white transition-colors p-1.5">
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 bg-violet-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>

              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/8 transition-colors outline-none">
                    <Avatar src={user.avatar} username={user.username} size="sm" />
                    <span className="text-sm text-gray-200 font-medium max-w-28 truncate">{user.username}</span>
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-1 shadow-xl min-w-44 z-50"
                    align="end"
                    sideOffset={8}
                  >
                    <DropdownMenu.Item asChild>
                      <Link href={`/user/${user.username}`} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-white/8 rounded-lg outline-none cursor-pointer">
                        <User size={15} />
                        Profile
                      </Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item asChild>
                      <Link href="/library" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-white/8 rounded-lg outline-none cursor-pointer">
                        <Gamepad2 size={15} />
                        My Library
                      </Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item asChild>
                      <Link href="/lists" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-white/8 rounded-lg outline-none cursor-pointer">
                        <List size={15} />
                        My Lists
                      </Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item asChild>
                      <Link href="/settings" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-white/8 rounded-lg outline-none cursor-pointer">
                        <Settings size={15} />
                        Settings
                      </Link>
                    </DropdownMenu.Item>
                    {(user as any).isAdmin && (
                      <>
                        <DropdownMenu.Separator className="my-1 border-t border-white/15" />
                        <DropdownMenu.Item asChild>
                          <Link href="/admin" className="flex items-center gap-2 px-3 py-2 text-sm text-violet-400 hover:bg-violet-500/10 rounded-lg outline-none cursor-pointer font-medium">
                            <Shield size={15} />
                            Admin Panel
                          </Link>
                        </DropdownMenu.Item>
                      </>
                    )}
                    <DropdownMenu.Separator className="my-1 border-t border-white/15" />
                    <DropdownMenu.Item
                      onSelect={handleLogout}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-white/8 rounded-lg outline-none cursor-pointer"
                    >
                      <LogOut size={15} />
                      Logout
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </>
          ) : (
            <Flex align="center" gap="2">
              <Link href="/login" className="text-sm text-gray-400 hover:text-white px-3 py-1.5 transition-colors">
                Login
              </Link>
              <Link href="/register" className="text-sm bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg transition-colors">
                Sign Up
              </Link>
            </Flex>
          )}
        </Flex>
      </div>
    </nav>
  );
}

