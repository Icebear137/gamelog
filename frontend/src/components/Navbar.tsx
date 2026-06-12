"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Gamepad2, Search, LogOut, User, Settings,
  Bell, List, MessageCircle, Shield,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import Avatar from "./Avatar";

const NAV_LINKS = [
  ["Discover",    "/discover"   ],
  ["Reviews",     "/reviews"    ],
  ["Clubs",       "/clubs"      ],
  ["Leaderboard", "/leaderboard"],
] as const;

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
    <nav className="gl-nav">
      <div className="gl-nav-inner">
        {/* ── Logo ── */}
        <Link href="/" className="gl-logo">
          <div className="gl-logo-icon">
            <Gamepad2 size={16} color="#fff" />
          </div>
          <span className="gl-logo-text">GameLog</span>
        </Link>

        {/* ── Nav links ── */}
        <div className="gl-nav-links">
          {NAV_LINKS.map(([label, href]) => (
            <Link key={label} href={href} className="gl-nav-link">{label}</Link>
          ))}
        </div>

        {/* ── Right side ── */}
        <div className="gl-nav-actions">
          {user ? (
            <>
              {/* Search */}
              <Link href="/search" className="gl-nav-icon-btn" aria-label="Search">
                <Search size={17} />
              </Link>

              {/* Messages */}
              <Link href="/messages" className="gl-nav-icon-btn" aria-label="Messages">
                <MessageCircle size={18} />
                {unreadMsgs > 0 && (
                  <span className="gl-nav-badge">{unreadMsgs > 9 ? "9+" : unreadMsgs}</span>
                )}
              </Link>

              {/* Notifications */}
              <Link href="/notifications" className="gl-nav-icon-btn" aria-label="Notifications">
                <Bell size={18} />
                {unreadNotifs > 0 && (
                  <span className="gl-nav-badge">{unreadNotifs > 9 ? "9+" : unreadNotifs}</span>
                )}
              </Link>

              {/* User dropdown */}
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className="gl-nav-user-btn" aria-label="User menu">
                    <Avatar src={user.avatar} username={user.username} size="sm" />
                    <span className="gl-nav-username">{user.username}</span>
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content className="gl-dropdown" align="end" sideOffset={10}>
                    <DropdownMenu.Item asChild>
                      <Link href={`/user/${user.username}`} className="gl-dropdown-item">
                        <User size={14} /> Profile
                      </Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item asChild>
                      <Link href="/library" className="gl-dropdown-item">
                        <Gamepad2 size={14} /> My Library
                      </Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item asChild>
                      <Link href="/lists" className="gl-dropdown-item">
                        <List size={14} /> My Lists
                      </Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item asChild>
                      <Link href="/settings" className="gl-dropdown-item">
                        <Settings size={14} /> Settings
                      </Link>
                    </DropdownMenu.Item>
                    {(user as any).isAdmin && (
                      <>
                        <div className="gl-dropdown-sep" />
                        <DropdownMenu.Item asChild>
                          <Link href="/admin" className="gl-dropdown-item gl-dropdown-item-admin">
                            <Shield size={14} /> Admin Panel
                          </Link>
                        </DropdownMenu.Item>
                      </>
                    )}
                    <div className="gl-dropdown-sep" />
                    <DropdownMenu.Item
                      onSelect={handleLogout}
                      className="gl-dropdown-item gl-dropdown-item-danger"
                    >
                      <LogOut size={14} /> Logout
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </>
          ) : (
            <>
              <button className="gl-btn-ghost" onClick={() => router.push("/login")}>
                Sign in
              </button>
              <button className="gl-btn-primary" onClick={() => router.push("/register")}>
                Join free
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
