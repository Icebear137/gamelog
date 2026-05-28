"use client";

import { useRouter } from "next/navigation";
import { Gamepad2 } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-6">
      <div className="w-16 h-16 bg-violet-600 rounded-2xl flex items-center justify-center">
        <Gamepad2 size={32} />
      </div>
      <div>
        <h1 className="text-4xl font-bold mb-3">Track your games.</h1>
        <h1 className="text-4xl font-bold text-violet-400 mb-4">Share the journey.</h1>
        <p className="text-gray-400 max-w-md">
          GameLog is your social gaming journal — log games, rate them, write reviews, and see what your friends are playing.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => router.push("/register")}
          className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
        >
          Get Started
        </button>
        <button
          onClick={() => router.push("/discover")}
          className="bg-white/8 hover:bg-gray-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
        >
          Explore
        </button>
      </div>
    </div>
  );
}
