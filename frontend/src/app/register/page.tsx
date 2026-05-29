"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Text, Heading, Flex } from "@radix-ui/themes";
import { Gamepad2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
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
      const res = await api.post("/api/auth/register", { username, email, password });
      login(res.data.token, res.data.user);
      router.push("/");
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Flex className="min-h-[80vh]" align="center" justify="center">
      <div className="w-full max-w-sm">
        <Flex align="center" gap="2" justify="center" className="mb-8 text-violet-400">
          <Gamepad2 size={28} />
          <span className="text-xl font-bold text-white">GameLog</span>
        </Flex>

        <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl p-6 space-y-4">
          <Heading size="5" className="text-center mb-2">Create your account</Heading>

          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-400 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block mb-1.5"><Text as="span" size="1" color="gray">Username</Text></label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              pattern="[a-zA-Z0-9_]+"
              minLength={3}
              maxLength={30}
              className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-violet-500"
              placeholder="gamer_tag"
            />
          </div>

          <div>
            <label className="block mb-1.5"><Text as="span" size="1" color="gray">Email</Text></label>
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
            <label className="block mb-1.5"><Text as="span" size="1" color="gray">Password</Text></label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-violet-500"
              placeholder="min. 6 characters"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>

          <Text as="p" size="2" color="gray" className="text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-violet-400 hover:text-violet-300">
              Login
            </Link>
          </Text>
        </form>
      </div>
    </Flex>
  );
}

