"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Label from "@radix-ui/react-label";
import { Text, Heading, Flex } from "@radix-ui/themes";
import { Save, Camera, ImagePlus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { dispatchToast } from "@/lib/toast";
import type { AuthUser } from "@/lib/stores/auth";
import Avatar from "@/components/Avatar";

export function ProfileSection({ user }: { user: AuthUser }) {
  const { login, token } = useAuth();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);

  const [bio, setBio] = useState(user.bio ?? "");
  const [avatar, setAvatar] = useState(user.avatar ?? "");
  const [banner, setBanner] = useState(user.banner ?? "");
  const [steamId, setSteamId] = useState(user.steamId ?? "");
  const [discordTag, setDiscordTag] = useState(user.discordTag ?? "");

  useEffect(() => {
    setBio(user.bio ?? "");
    setAvatar(user.avatar ?? "");
    setBanner(user.banner ?? "");
    setSteamId(user.steamId ?? "");
    setDiscordTag(user.discordTag ?? "");
  }, [user.bio, user.avatar, user.banner, user.steamId, user.discordTag]);

  const profileMutation = useMutation({
    mutationFn: () =>
      api.patch("/api/users/me", {
        bio: bio || undefined,
        avatar: avatar || undefined,
        steamId: steamId || undefined,
        discordTag: discordTag || undefined,
      }),
    onSuccess: (res) => {
      login(token!, { ...user, ...res.data });
      qc.invalidateQueries({ queryKey: ["profile", user.username] });
      dispatchToast("Profile updated", "success");
    },
    onError: (err: any) => {
      dispatchToast(err?.response?.data?.error ?? "Failed to update profile", "error");
    },
  });

  const bannerMutation = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("banner", file);
      return api.post("/api/users/me/banner", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: (res) => {
      login(token!, { ...user, ...res.data });
      setBanner(res.data.banner ?? "");
      qc.invalidateQueries({ queryKey: ["profile", user.username] });
      dispatchToast("Banner updated", "success");
    },
    onError: (err: any) => {
      dispatchToast(err?.response?.data?.error ?? "Failed to upload banner", "error");
    },
  });

  const deleteBannerMutation = useMutation({
    mutationFn: () => api.delete("/api/users/me/banner"),
    onSuccess: (res) => {
      login(token!, { ...user, ...res.data });
      setBanner("");
      qc.invalidateQueries({ queryKey: ["profile", user.username] });
      dispatchToast("Banner removed", "success");
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
      login(token!, { ...user, ...res.data });
      setAvatar(res.data.avatar ?? "");
      dispatchToast("Avatar updated", "success");
    },
    onError: (err: any) => {
      dispatchToast(err?.response?.data?.error ?? "Failed to upload avatar", "error");
    },
  });

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl overflow-hidden space-y-4">

      {/* Banner preview */}
      <div className="relative h-30 bg-[linear-gradient(135deg,#0D1A2E_0%,#0E2338_35%,#0A1820_65%,#080E16_100%)] group">
        {banner && (
          <img
            src={banner}
            alt="Banner preview"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {!banner && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[12px] text-white/25">No banner · hover to add</span>
          </div>
        )}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => bannerInputRef.current?.click()}
            disabled={bannerMutation.isPending}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.25 rounded-md text-[11px] font-medium bg-black/60 text-white backdrop-blur-sm border border-white/15 hover:bg-black/75 transition-colors cursor-pointer disabled:opacity-50"
          >
            <ImagePlus size={11} />
            {bannerMutation.isPending ? "Uploading…" : banner ? "Change" : "Add banner"}
          </button>
          {banner && (
            <button
              type="button"
              onClick={() => deleteBannerMutation.mutate()}
              disabled={deleteBannerMutation.isPending}
              className="inline-flex items-center gap-1 px-2 py-1.25 rounded-md text-[11px] bg-black/60 text-red-400 backdrop-blur-sm border border-white/15 hover:bg-black/75 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Trash2 size={11} />
              Remove
            </button>
          )}
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) bannerMutation.mutate(file);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <div className="px-6 pb-6 space-y-4">
      <Heading size="4" as="h2">Edit Profile</Heading>

      <Flex align="center" gap="4">
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
          <Label.Root htmlFor="avatar-url" className="block">
            <Text as="span" size="1" color="gray">
              Avatar URL <Text as="span" size="1" color="gray">{"(or click camera to upload)"}</Text>
            </Text>
          </Label.Root>
          <input
            id="avatar-url"
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
            placeholder="https://..."
            className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-violet-500"
          />
        </div>
      </Flex>

      <div className="space-y-1.5">
        <Label.Root htmlFor="bio" className="block">
          <Text as="span" size="1" color="gray">Bio</Text>
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
        <Text as="p" size="1" color="gray" className="text-right">{bio.length}/300</Text>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label.Root htmlFor="steam-id" className="block">
            <Text as="span" size="1" color="gray">Steam ID</Text>
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
          <Label.Root htmlFor="discord-tag" className="block">
            <Text as="span" size="1" color="gray">Discord Tag</Text>
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
    </div>
  );
}
