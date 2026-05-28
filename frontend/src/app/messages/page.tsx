"use client";

import { MessageCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function MessagesPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-600">
        <MessageCircle size={40} className="opacity-20" />
        <p className="text-sm">Sign in to view your messages.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-600 select-none">
      <div className="w-16 h-16 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/8 flex items-center justify-center">
        <MessageCircle size={28} className="text-gray-700" />
      </div>
      <div className="text-center">
        <p className="text-sm text-gray-500">Select a conversation</p>
        <p className="text-xs text-gray-700 mt-1">or visit someone's profile to start chatting</p>
      </div>
    </div>
  );
}

