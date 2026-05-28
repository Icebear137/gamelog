"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import * as Label from "@radix-ui/react-label";
import * as Separator from "@radix-ui/react-separator";
import { Save, KeyRound, Trash2, AlertTriangle, X, Lock, Camera, Mail } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { dispatchToast } from "@/lib/toast";
import Avatar from "@/components/Avatar";

export default function SettingsPage() {
  const { user, loading, login, logout, token } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [steamId, setSteamId] = useState("");
  const [discordTag, setDiscordTag] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isPrivate, setIsPrivate] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      setBio(user.bio ?? "");
      setAvatar(user.avatar ?? "");
      setSteamId(user.steamId ?? "");
      setDiscordTag(user.discordTag ?? "");
      setIsPrivate(user.isPrivate ?? false);
      setEmailNotifications(user.emailNotifications ?? true);
    }
  }, [user]);

  const profileMutation = useMutation({
    mutationFn: () =>
      api.patch("/api/users/me", {
        bio: bio || undefined,
        avatar: avatar || undefined,
        steamId: steamId || undefined,
        discordTag: discordTag || undefined,
        isPrivate,
        emailNotifications,
      }),
    onSuccess: (res) => {
      login(token!, { ...user!, ...res.data });
      qc.invalidateQueries({ queryKey: ["profile", user?.username] });
      dispatchToast("Profile updated", "success");
      setIsPrivate(res.data.isPrivate ?? false);
    },
    onError: (err: any) => {
      dispatchToast(err?.response?.data?.error ?? "Failed to update profile", "error");
    },
  });

  const avatarMutation = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("avatar", file);
      return api.post("/api/users/me/avatar", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: (res) => {
      login(token!, { ...user!, ...res.data });
      setAvatar(res.data.avatar ?? "");
      dispatchToast("Avatar updated", "success");
    },
    onError: (err: any) => {
      dispatchToast(err?.response?.data?.error ?? "Failed to upload avatar", "error");
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => api.delete("/api/auth/account", { data: { password: deletePassword } }),
    onSuccess: () => {
      setDeleteOpen(false);
      logout();
      router.push("/");
    },
    onError: (err: any) => {
      dispatchToast(err?.response?.data?.error ?? "Failed to delete account", "error");
    },
  });

  const passwordMutation = useMutation({
    mutationFn: () =>
      api.post("/api/auth/change-password", { currentPassword, newPassword }),
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

  if (loading || !user) return null;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Edit Profile */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-semibold">Edit Profile</h2>

        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <Avatar src={avatar || user.avatar} username={user.username} size="lg" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarMutation.isPending}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-full flex items-center justify-center shadow-lg transition-colors"
              title="Upload avatar"
            >
              <Camera size={13} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) avatarMutation.mutate(file);
                e.target.value = "";
              }}
            />
          </div>
          <div className="flex-1 space-y-1.5">
            <Label.Root htmlFor="avatar-url" className="block text-gray-400 text-xs">
              Avatar URL <span className="text-gray-600">(or click camera to upload)</span>
            </Label.Root>
            <input
              id="avatar-url"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="https://..."
              className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-violet-500"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label.Root htmlFor="bio" className="block text-gray-400 text-xs">
            Bio
          </Label.Root>
          <textarea
            id="bio"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={300}
            placeholder="Tell others about yourself..."
            className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-violet-500 resize-none"
          />
          <p className="text-gray-600 text-xs text-right">{bio.length}/300</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label.Root htmlFor="steam-id" className="block text-gray-400 text-xs">
              Steam ID
            </Label.Root>
            <input
              id="steam-id"
              value={steamId}
              onChange={(e) => setSteamId(e.target.value)}
              placeholder="your_steam_id"
              className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-violet-500"
            />
          </div>
          <div className="space-y-1.5">
            <Label.Root htmlFor="discord-tag" className="block text-gray-400 text-xs">
              Discord Tag
            </Label.Root>
            <input
              id="discord-tag"
              value={discordTag}
              onChange={(e) => setDiscordTag(e.target.value)}
              placeholder="user#1234"
              className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-violet-500"
            />
          </div>
        </div>

        <button
          onClick={() => profileMutation.mutate()}
          disabled={profileMutation.isPending}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Save size={15} />
          {profileMutation.isPending ? "Saving..." : "Save Profile"}
        </button>
      </div>

      {/* Change Password */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <KeyRound size={18} />
          Change Password
        </h2>

        <div className="space-y-1.5">
          <Label.Root htmlFor="current-password" className="block text-gray-400 text-xs">
            Current Password
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
          <Label.Root htmlFor="new-password" className="block text-gray-400 text-xs">
            New Password
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
          <Label.Root htmlFor="confirm-password" className="block text-gray-400 text-xs">
            Confirm New Password
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
          onClick={() => {
            if (newPassword !== confirmPassword) {
              dispatchToast("Passwords do not match", "error");
              return;
            }
            passwordMutation.mutate();
          }}
          disabled={passwordMutation.isPending || !currentPassword || !newPassword}
          className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <KeyRound size={15} />
          {passwordMutation.isPending ? "Changing..." : "Change Password"}
        </button>
      </div>

      {/* Privacy */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl p-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Lock size={18} />
          Privacy
        </h2>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-300 font-medium">Private Profile</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Only your followers can see your library and activity. Your profile and username remain public.
            </p>
          </div>
          <button
            role="switch"
            aria-checked={isPrivate}
            onClick={() => setIsPrivate((v) => !v)}
            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${
              isPrivate ? "bg-violet-600" : "bg-gray-700"
            }`}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                isPrivate ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
        <button
          onClick={() => profileMutation.mutate()}
          disabled={profileMutation.isPending}
          className="mt-4 flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Save size={15} />
          {profileMutation.isPending ? "Saving..." : "Save Privacy"}
        </button>
      </div>

      {/* Email Notifications */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl p-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Mail size={18} />
          Email Notifications
        </h2>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-300 font-medium">Weekly Digest</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Receive a weekly summary of your activity — new followers, likes, comments, and feed highlights.
            </p>
          </div>
          <button
            role="switch"
            aria-checked={emailNotifications}
            onClick={() => setEmailNotifications((v) => !v)}
            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${
              emailNotifications ? "bg-violet-600" : "bg-gray-700"
            }`}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                emailNotifications ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
        <button
          onClick={() => profileMutation.mutate()}
          disabled={profileMutation.isPending}
          className="mt-4 flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Save size={15} />
          {profileMutation.isPending ? "Saving..." : "Save Preferences"}
        </button>
      </div>

      {/* Danger Zone */}
      <div className="bg-white/5 backdrop-blur-sm border border-red-900/50 rounded-2xl p-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-red-400 mb-4">
          <AlertTriangle size={18} />
          Danger Zone
        </h2>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-300 font-medium">Delete Account</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Permanently delete your account and all data. This cannot be undone.
            </p>
          </div>

          <Dialog.Root
            open={deleteOpen}
            onOpenChange={(v) => {
              setDeleteOpen(v);
              if (!v) setDeletePassword("");
            }}
          >
            <Dialog.Trigger asChild>
              <button className="shrink-0 flex items-center gap-2 bg-red-900/40 hover:bg-red-900/70 border border-red-800 text-red-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                <Trash2 size={15} />
                Delete
              </button>
            </Dialog.Trigger>

            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
              <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/5 backdrop-blur-sm border border-red-900/60 rounded-2xl p-6 w-full max-w-sm z-50">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-red-400 font-bold flex items-center gap-2">
                    <AlertTriangle size={16} />
                    Delete Account
                  </Dialog.Title>
                  <Dialog.Close asChild>
                    <button className="text-gray-400 hover:text-white">
                      <X size={18} />
                    </button>
                  </Dialog.Close>
                </div>

                <Dialog.Description className="text-sm text-gray-300 mb-4">
                  This action is permanent and cannot be undone. All your games, reviews, and activity will be deleted.
                </Dialog.Description>

                <Separator.Root className="h-px bg-white/8 mb-4" />

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label.Root htmlFor="delete-password" className="block text-gray-400 text-xs">
                      Enter your password to confirm
                    </Label.Root>
                    <input
                      id="delete-password"
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="Your password"
                      autoFocus
                      className="w-full bg-white/8 border border-red-900 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-red-600 transition-colors"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => deleteAccountMutation.mutate()}
                      disabled={!deletePassword || deleteAccountMutation.isPending}
                      className="flex items-center gap-2 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Trash2 size={15} />
                      {deleteAccountMutation.isPending ? "Deleting..." : "Confirm Delete"}
                    </button>
                    <Dialog.Close asChild>
                      <button className="bg-white/8 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                        Cancel
                      </button>
                    </Dialog.Close>
                  </div>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
    </div>
  );
}

