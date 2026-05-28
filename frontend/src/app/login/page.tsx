"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Gamepad2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/api/auth/login", { email, password });
      login(res.data.token, res.data.user);
      router.push("/");
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8 text-violet-400">
          <Gamepad2 size={28} />
          <span className="text-xl font-bold text-white">GameLog</span>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl p-6 space-y-4">
          <h1 className="text-white font-bold text-xl text-center mb-2">Welcome back</h1>

          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-400 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-gray-400 text-xs mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-violet-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-xs mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-violet-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <p className="text-center text-gray-500 text-sm">
            No account?{" "}
            <Link href="/register" className="text-violet-400 hover:text-violet-300">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

