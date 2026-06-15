"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Library, List, Users, Trophy, MessageCircle,
  Gamepad2, Star, TrendingUp,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import AddGameModal from "@/components/AddGameModal";

const NAV = [
  { href: "/library",     label: "My Library",   icon: Library      },
  { href: "/reviews",     label: "Reviews",      icon: Star         },
  { href: "/lists",       label: "Lists",        icon: List         },
  { href: "/clubs",       label: "Clubs",        icon: Users        },
  { href: "/leaderboard", label: "Leaderboard",  icon: Trophy       },
  { href: "/messages",    label: "Messages",     icon: MessageCircle },
];

export default function LeftSidebar() {
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  return (
    <>
      {/* User profile card */}
      <Link href={`/user/${user.username}`} className="flex flex-col items-center gap-2 px-3 py-4 bg-gx-surface border border-gx-border rounded-xl no-underline transition-colors text-center hover:border-gx-amber/30">
        {user.avatar ? (
          <img src={user.avatar} alt={user.username} className="w-13 h-13 rounded-full object-cover border-2 border-gx-amber block" />
        ) : (
          <div className="w-13 h-13 rounded-full bg-gx-surface-2 border-2 border-gx-amber flex items-center justify-center text-[19px] font-extrabold text-gx-amber font-bebas shrink-0">
            {user.username.slice(0, 2).toUpperCase()}
          </div>
        )}
        <p className="text-sm font-bold text-gx-text-1 m-0 truncate max-w-full">{user.username}</p>
        <p style={{ fontSize: 11, color: "var(--gx-text-3)", margin: 0 }}>View Profile →</p>
      </Link>

      {/* Quick log button */}
      <div style={{ paddingTop: 6 }}>
        <AddGameModal
          trigger={
            <button
              className="group flex items-center gap-2.5 px-2 py-1.75 rounded-lg text-[13px] font-medium text-gx-text-2 no-underline transition-all border-none bg-none cursor-pointer w-full hover:bg-gx-surface-2 hover:text-gx-text-1 data-[active=true]:bg-gx-amber/13 data-[active=true]:text-gx-amber"
              style={{ justifyContent: "flex-start" }}
            >
              <span className="w-7 h-7 rounded-[7px] flex items-center justify-center shrink-0 transition-colors group-hover:bg-gx-amber/12 group-data-[active=true]:bg-gx-amber/12" style={{ background: "rgba(232,147,42,0.12)" }}>
                <Gamepad2 size={13} style={{ color: "var(--gx-amber)" }} />
              </span>
              <span className="flex-1 text-left" style={{ color: "var(--gx-amber)", fontWeight: 600 }}>
                Log a Game
              </span>
            </button>
          }
        />
      </div>

      <div className="h-px bg-gx-border my-2.5" />

      {/* Navigation */}
      <div className="flex flex-col gap-1">
        <p className="text-[10px] font-bold tracking-widest uppercase text-gx-text-3 px-1 mb-0.5 flex items-center gap-1.25">
          <TrendingUp size={9} />
          Navigate
        </p>
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center gap-2.5 px-2 py-1.75 rounded-lg text-[13px] font-medium text-gx-text-2 no-underline transition-all border-none bg-none cursor-pointer w-full hover:bg-gx-surface-2 hover:text-gx-text-1 data-[active=true]:bg-gx-amber/13 data-[active=true]:text-gx-amber"
            data-active={pathname === href}
          >
            <span className="w-7 h-7 rounded-[7px] bg-gx-surface-2 flex items-center justify-center shrink-0 transition-colors group-hover:bg-gx-amber/12 group-data-[active=true]:bg-gx-amber/12">
              <Icon size={13} />
            </span>
            <span className="flex-1 text-left">{label}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
