"use client";

import { useRef, useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, X, Send, Globe, Users } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/lib/auth-context";
import { createPostService } from "@/services/post.service";
import { api } from "@/lib/api";
import { dispatchToast } from "@/lib/toast";
import Avatar from "@/components/Avatar";

const MAX_IMAGES = 4;
const MAX_CHARS  = 2000;

export default function PostComposer() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [text, setText]           = useState("");
  const [images, setImages]       = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [visibility, setVisibility] = useState<"public" | "followers">("public");
  const fileRef = useRef<HTMLInputElement>(null);

  const remaining = MAX_CHARS - text.length;

  const createMutation = useMutation({
    mutationFn: () => createPostService({ textContent: text.trim() || undefined, images, visibility }),
    onSuccess: () => {
      setText("");
      setImages([]);
      qc.resetQueries({ queryKey: ["post-feed"] });
      dispatchToast("Post shared!", "success");
    },
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed to post", "error"),
  });

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || images.length >= MAX_IMAGES) return;
    const slots = MAX_IMAGES - images.length;
    const toUpload = Array.from(files).slice(0, slots);
    setUploading(true);
    try {
      const urls = await Promise.all(
        toUpload.map(async (file) => {
          const fd = new FormData();
          fd.append("image", file);
          const res = await api.post<{ url: string }>("/api/upload/image", fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          return res.data.url;
        })
      );
      setImages((prev) => [...prev, ...urls].slice(0, MAX_IMAGES));
    } catch {
      dispatchToast("Image upload failed", "error");
    } finally {
      setUploading(false);
    }
  }, [images.length]);

  const removeImage = (idx: number) =>
    setImages((prev) => prev.filter((_, i) => i !== idx));

  const canSubmit = !createMutation.isPending && !uploading &&
    (text.trim().length > 0 || images.length > 0) && remaining >= 0;

  if (!user) return null;

  return (
    <div className="bg-white/[0.03] border border-gx-border rounded-xl p-3.5 flex flex-col gap-2.5">
      <div className="flex gap-2.5 items-start">
        <Avatar src={user.avatar} username={user.username} size="sm" />
        <textarea
          className="flex-1 bg-transparent border-none outline-none resize-none text-gx-text-1 text-[14px] leading-normal [font-family:inherit] min-h-[60px] placeholder:text-gx-text-3"
          placeholder="What's on your mind?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          maxLength={MAX_CHARS + 50}
        />
      </div>

      {/* Image previews */}
      {images.length > 0 && (
        <div
          className={clsx(
            "grid gap-1.5 rounded-lg overflow-hidden",
            images.length === 1 ? "grid-cols-1" : "grid-cols-2"
          )}
        >
          {images.map((url, i) => (
            <div key={url} className="relative rounded-md overflow-hidden aspect-video bg-white/[0.05]">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                className="absolute top-1 right-1 bg-black/70 rounded-full w-5 h-5 flex items-center justify-center cursor-pointer text-white transition-colors hover:bg-[#dc2626]/80"
                onClick={() => removeImage(i)}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between pt-2 border-t border-gx-border">
        <div className="flex items-center gap-1.5">
          <button
            className="flex items-center gap-1 cursor-pointer text-gx-text-2 px-[7px] py-[5px] rounded-md text-[12px] transition-colors enabled:hover:bg-white/[0.06] enabled:hover:text-gx-text-1 disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || images.length >= MAX_IMAGES}
            title="Add images"
          >
            <ImagePlus size={15} />
            {uploading && <span style={{ fontSize: 10 }}>uploading…</span>}
          </button>

          <button
            className="flex items-center gap-1 cursor-pointer text-gx-text-2 border border-gx-border rounded-[20px] px-2 py-1 text-[11px] font-medium transition-colors enabled:hover:bg-white/[0.06] enabled:hover:text-gx-text-1 disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={() => setVisibility((v) => v === "public" ? "followers" : "public")}
            title={visibility === "public" ? "Visible to everyone" : "Followers only"}
          >
            {visibility === "public" ? <Globe size={13} /> : <Users size={13} />}
            <span>{visibility === "public" ? "Public" : "Followers"}</span>
          </button>

          <span
            className={clsx(
              "text-[11px] ml-1",
              remaining < 50 ? "text-[#f87171]" : "text-gx-text-3"
            )}
          >
            {remaining}
          </span>
        </div>

        <button
          className="flex items-center gap-[5px] px-3.5 py-[7px] rounded-lg cursor-pointer bg-gx-amber text-gx-navy text-[13px] font-bold transition-opacity disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:opacity-[0.88]"
          onClick={() => createMutation.mutate()}
          disabled={!canSubmit}
        >
          <Send size={13} />
          {createMutation.isPending ? "Posting…" : "Post"}
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={(e) => handleUpload(e.target.files)}
      />
    </div>
  );
}
