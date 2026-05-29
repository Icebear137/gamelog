"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import * as Label from "@radix-ui/react-label";
import { Text, Heading, Flex } from "@radix-ui/themes";
import { KeyRound } from "lucide-react";
import { api } from "@/lib/api";
import { dispatchToast } from "@/lib/toast";

export function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const passwordMutation = useMutation({
    mutationFn: () => api.post("/api/auth/change-password", { currentPassword, newPassword }),
    onSuccess: () => {
      dispatchToast("Password changed", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: any) => {
      dispatchToast(err?.response?.data?.error ?? "Failed to change password", "error");
    },
  });

  function handleSubmit() {
    if (newPassword !== confirmPassword) {
      dispatchToast("Passwords do not match", "error");
      return;
    }
    passwordMutation.mutate();
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl p-6 space-y-4">
      <Heading size="4" as="h2">
        <Flex align="center" gap="2">
          <KeyRound size={18} />
          Change Password
        </Flex>
      </Heading>

      <div className="space-y-1.5">
        <Label.Root htmlFor="current-password" className="block">
          <Text as="span" size="1" color="gray">Current Password</Text>
        </Label.Root>
        <input
          id="current-password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
        />
      </div>

      <div className="space-y-1.5">
        <Label.Root htmlFor="new-password" className="block">
          <Text as="span" size="1" color="gray">New Password</Text>
        </Label.Root>
        <input
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
        />
      </div>

      <div className="space-y-1.5">
        <Label.Root htmlFor="confirm-password" className="block">
          <Text as="span" size="1" color="gray">Confirm New Password</Text>
        </Label.Root>
        <input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={passwordMutation.isPending || !currentPassword || !newPassword}
        className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        <KeyRound size={15} />
        {passwordMutation.isPending ? "Changing..." : "Change Password"}
      </button>
    </div>
  );
}
