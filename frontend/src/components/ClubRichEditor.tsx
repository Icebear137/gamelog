"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import LinkExt from "@tiptap/extension-link";
import ImageExt from "@tiptap/extension-image";
import {
  Bold, Italic, UnderlineIcon, Strikethrough,
  List, ListOrdered, Link2, Code, Minus,
  Image, Check, X, Loader2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

interface Props {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

function ToolbarBtn({
  onClick, active, title, children, disabled,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      disabled={disabled}
      className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
        active
          ? "bg-violet-500/20 text-violet-300"
          : "text-gray-400 hover:text-white hover:bg-white/8"
      }`}
    >
      {children}
    </button>
  );
}

export function ClubRichEditor({ content, onChange, placeholder = "Write something…", minHeight = 120 }: Props) {
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const [uploading, setUploading]   = useState(false);
  const [showLink, setShowLink]     = useState(false);
  const [linkUrl, setLinkUrl]       = useState("");
  const linkInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: true, // client-only component, no SSR
    extensions: [
      // Disable extensions we configure manually to avoid duplicate name warnings
      StarterKit.configure({
        codeBlock: false,

        link: false,
        underline: false,
      }),
      Underline,
      Placeholder.configure({ placeholder }),
      LinkExt.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-violet-400 underline cursor-pointer" },
      }),
      ImageExt.configure({
        HTMLAttributes: { class: "max-w-full rounded-lg my-2" },
        inline: false,
        allowBase64: false,
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: "outline-none text-sm text-white leading-relaxed min-h-[inherit] prose prose-invert max-w-none",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.isEmpty ? "" : editor.getHTML());
    },
  });

  useEffect(() => {
    if (showLink) setTimeout(() => linkInputRef.current?.focus(), 50);
  }, [showLink]);

  useEffect(() => { return () => { editor?.destroy(); }; }, [editor]);

  function applyLink() {
    if (!editor) return;
    const url = linkUrl.trim();
    if (!url) {
      editor.chain().focus().unsetLink().run();
    } else {
      const href = url.startsWith("http") ? url : `https://${url}`;
      editor.chain().focus().setLink({ href }).run();
    }
    setShowLink(false);
    setLinkUrl("");
  }

  function openLinkInput() {
    if (!editor) return;
    const existing = editor.getAttributes("link").href ?? "";
    setLinkUrl(existing);
    setShowLink(true);
  }

  async function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    e.target.value = "";

    setUploading(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await api.post("/api/upload/image", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      editor.chain().focus().setImage({ src: res.data.url, alt: file.name }).run();
    } catch {
      // silently ignore upload failure — user can retry
    } finally {
      setUploading(false);
    }
  }

  if (!editor) return null;

  return (
    <div className="bg-white/5 border border-white/10 focus-within:border-violet-500 rounded-xl overflow-hidden transition-colors">
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />

      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-white/8 flex-wrap">
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold (Ctrl+B)">
          <Bold size={14} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic (Ctrl+I)">
          <Italic size={14} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline (Ctrl+U)">
          <UnderlineIcon size={14} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough">
          <Strikethrough size={14} />
        </ToolbarBtn>

        <span className="w-px h-4 bg-white/10 mx-1 shrink-0" />

        <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list">
          <List size={14} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Ordered list">
          <ListOrdered size={14} />
        </ToolbarBtn>

        <span className="w-px h-4 bg-white/10 mx-1 shrink-0" />

        <ToolbarBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Inline code">
          <Code size={14} />
        </ToolbarBtn>

        {/* Link button — toggles inline input instead of alert */}
        <ToolbarBtn onClick={openLinkInput} active={editor.isActive("link") || showLink} title="Insert link">
          <Link2 size={14} />
        </ToolbarBtn>

        {/* Image upload */}
        <ToolbarBtn onClick={() => fileInputRef.current?.click()} active={false} title="Insert image" disabled={uploading}>
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Image size={14} />}
        </ToolbarBtn>

        <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Divider">
          <Minus size={14} />
        </ToolbarBtn>
      </div>

      {/* Inline link input */}
      {showLink && (
        <div className="flex items-center gap-2 px-3 py-2 bg-white/3 border-b border-white/8">
          <Link2 size={13} className="text-gray-500 shrink-0" />
          <input
            ref={linkInputRef}
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); applyLink(); }
              if (e.key === "Escape") { setShowLink(false); setLinkUrl(""); }
            }}
            placeholder="https://example.com"
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none"
          />
          <button onMouseDown={(e) => { e.preventDefault(); applyLink(); }}
            className="p-1 text-green-400 hover:text-green-300 transition-colors">
            <Check size={14} />
          </button>
          <button onMouseDown={(e) => { e.preventDefault(); setShowLink(false); setLinkUrl(""); }}
            className="p-1 text-gray-500 hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Editor area */}
      <div className="px-3 py-2.5" style={{ minHeight }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
