"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Gamepad2, LogOut, User, Settings,
  Bell, List, MessageCircle, Shield,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import Avatar from "./Avatar";
import NavSearchDropdown from "./NavSearchDropdown";

const ICON_BTN =
  "relative flex items-center justify-center w-9 h-9 rounded-[9px] text-gl-subtext no-underline transition-[color,background] duration-[180ms] hover:text-gl-text hover:bg-white/[0.06]";

const BADGE =
  "absolute top-0.5 right-0.5 min-w-4 h-4 bg-gl-violet text-white font-outfit text-[9px] font-bold rounded-[99px] flex items-center justify-center px-[3px] border-[1.5px] border-gl-bg";

const ITEM =
  "flex items-center gap-[9px] px-3 py-[9px] rounded-lg font-outfit text-[13px] font-normal no-underline cursor-pointer outline-none bg-transparent w-full transition-[background,color] duration-150";

const ITEM_DEFAULT =
  `${ITEM} text-gl-subtext hover:bg-white/[0.06] hover:text-gl-text data-highlighted:bg-white/[0.06] data-highlighted:text-gl-text`;

const ITEM_ADMIN =
  `${ITEM} text-gl-violet-light data-highlighted:bg-white/[0.06] data-highlighted:text-gl-text hover:bg-gl-violet/12! hover:text-gl-violet-light!`;

const ITEM_DANGER =
  `${ITEM} text-[#f87171] data-highlighted:bg-white/[0.06] data-highlighted:text-gl-text hover:bg-[rgba(248,113,113,0.1)]! hover:text-[#f87171]!`;

const SEP = "h-px bg-gl-border my-[5px]";

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

  const unreadNotifs = notifData?.count ?? 0;
  const unreadMsgs   = msgData?.count   ?? 0;

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <nav className="sticky top-0 z-50 bg-gl-bg/82 backdrop-blur-[20px] border-b border-gl-border">
      <div className="w-full px-5 h-16 flex items-center gap-4">

        {/* ── Logo ── */}
        <Link href="/" className="flex items-center gap-2.5 no-underline shrink-0">
          <div className="w-8 h-8 rounded-[9px] bg-[linear-gradient(135deg,#7C3AED_0%,#5B21B6_100%)] flex items-center justify-center shrink-0">
            <Gamepad2 size={16} color="#fff" />
          </div>
          <span className="font-outfit font-bold text-lg text-gl-text tracking-[-0.025em]">GameLog</span>
        </Link>

        {/* ── Search dropdown ── */}
        <NavSearchDropdown />

        {/* ── Right side actions ── */}
        <div className="flex items-center gap-1 shrink-0">
          {user ? (
            <>
              {/* Messages */}
              <Link href="/messages" className={ICON_BTN} aria-label="Messages">
                <MessageCircle size={18} />
                {unreadMsgs > 0 && (
                  <span className={BADGE}>{unreadMsgs > 9 ? "9+" : unreadMsgs}</span>
                )}
              </Link>

              {/* Notifications */}
              <Link href="/notifications" className={ICON_BTN} aria-label="Notifications">
                <Bell size={18} />
                {unreadNotifs > 0 && (
                  <span className={BADGE}>{unreadNotifs > 9 ? "9+" : unreadNotifs}</span>
                )}
              </Link>

              {/* User dropdown */}
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    className="flex items-center gap-2 py-[5px] pr-2.5 pl-1.5 rounded-[10px] bg-transparent cursor-pointer transition-[background] duration-[180ms] ml-1 hover:bg-white/[0.06]"
                    aria-label="User menu"
                  >
                    <Avatar src={user.avatar} username={user.username} size="sm" />
                    <span className="font-outfit text-[13px] font-medium text-gl-text max-w-[100px] overflow-hidden text-ellipsis whitespace-nowrap">{user.username}</span>
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    className="bg-gl-surface/96 backdrop-blur-[24px] border border-white/10 rounded-[14px] p-1.5 min-w-[180px] shadow-[0_24px_60px_rgba(0,0,0,0.6)] z-[100] outline-none"
                    align="end"
                    sideOffset={10}
                  >
                    <DropdownMenu.Item asChild>
                      <Link href={`/user/${user.username}`} className={ITEM_DEFAULT}>
                        <User size={14} /> Profile
                      </Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item asChild>
                      <Link href="/library" className={ITEM_DEFAULT}>
                        <Gamepad2 size={14} /> My Library
                      </Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item asChild>
                      <Link href="/lists" className={ITEM_DEFAULT}>
                        <List size={14} /> My Lists
                      </Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item asChild>
                      <Link href="/settings" className={ITEM_DEFAULT}>
                        <Settings size={14} /> Settings
                      </Link>
                    </DropdownMenu.Item>
                    {(user as any).isAdmin && (
                      <>
                        <div className={SEP} />
                        <DropdownMenu.Item asChild>
                          <Link href="/admin" className={ITEM_ADMIN}>
                            <Shield size={14} /> Admin Panel
                          </Link>
                        </DropdownMenu.Item>
                      </>
                    )}
                    <div className={SEP} />
                    <DropdownMenu.Item
                      onSelect={handleLogout}
                      className={ITEM_DANGER}
                    >
                      <LogOut size={14} /> Logout
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </>
          ) : (
            <>
              <button
                className="font-outfit text-sm font-normal text-gl-subtext bg-transparent cursor-pointer px-4 py-2 rounded-lg transition-[color,background] duration-[180ms] hover:text-gl-text hover:bg-white/[0.05]"
                onClick={() => router.push("/login")}
              >
                Sign in
              </button>
              <button
                className="font-outfit text-[13px] font-semibold text-white bg-[linear-gradient(135deg,#7C3AED_0%,#5B21B6_100%)] cursor-pointer px-[18px] py-2 rounded-lg transition-[opacity,transform] duration-[180ms] hover:opacity-[0.88] hover:-translate-y-px"
                onClick={() => router.push("/register")}
              >
                Join free
              </button>
            </>
          )}
        </div>

      </div>
    </nav>
  );
}
