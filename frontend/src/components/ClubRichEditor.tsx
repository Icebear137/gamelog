"use client";

import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import LinkExt from "@tiptap/extension-link";
import ImageExt from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import type { NodeViewProps } from "@tiptap/react";
import {
  Bold, Italic, UnderlineIcon, Strikethrough,
  List, ListOrdered, Link2, Code, Minus,
  Image, Check, X, Loader2,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Heading1, Heading2, Heading3, Quote,

} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

interface Props {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

// ── Resizable Image Node View ─────────────────────────────────────────────────

const SIZE_PRESETS = [
  { label: "S",   value: "25%" },
  { label: "M",   value: "50%" },
  { label: "L",   value: "75%" },
  { label: "Full", value: "100%" },
];

const ALIGN_OPTIONS = [
  { icon: <AlignLeft size={12} />,   value: "left",   title: "Align left" },
  { icon: <AlignCenter size={12} />, value: "center", title: "Align center" },
  { icon: <AlignRight size={12} />,  value: "right",  title: "Align right" },
];

function ResizableImageView({ node, updateAttributes, selected }: NodeViewProps) {
  const { src, alt, width = "100%", "data-align": align = "center" } = node.attrs as {
    src: string; alt?: string; width?: string; "data-align"?: string;
  };

  // Local state for the custom size input
  const [customWidth, setCustomWidth] = useState(width);
  // Sync when external attribute changes (e.g. preset button click)
  useEffect(() => setCustomWidth(width), [width]);

  function applyCustomWidth() {
    const val = customWidth.trim();
    if (!val) return;
    // Auto-append px if user typed a plain number
    const final = /^\d+(\.\d+)?$/.test(val) ? `${val}px` : val;
    updateAttributes({ width: final });
  }

  // Use margin-based alignment (no float) to keep toolbar always visible
  const imgContainerStyle: React.CSSProperties = {
    width,
    display: "block",
    marginLeft:  align === "right"  ? "auto" : align === "center" ? "auto"  : "0",
    marginRight: align === "left"   ? "auto" : align === "center" ? "auto"  : "0",
  };

  return (
    <NodeViewWrapper className="w-full my-1">
      {/* Toolbar — rendered ABOVE the container div, not inside it, so overflow never clips it */}
      {selected && (
        <div
          className="flex items-center gap-0.5 bg-zinc-900 border border-white/15 rounded-lg px-1.5 py-1 shadow-xl mb-1 flex-wrap"
          style={{ width: "fit-content", marginLeft: imgContainerStyle.marginLeft, marginRight: imgContainerStyle.marginRight }}
          onMouseDown={(e) => {
            // Allow mousedown on input to pass through so it can receive focus
            if ((e.target as HTMLElement).tagName !== "INPUT") e.preventDefault();
          }}
        >
          {/* Quick-size presets */}
          {SIZE_PRESETS.map((s) => (
            <button
              key={s.value}
              onClick={() => { updateAttributes({ width: s.value }); setCustomWidth(s.value); }}
              title={s.value}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                width === s.value ? "bg-violet-600 text-white" : "text-gray-400 hover:text-white hover:bg-white/8"
              }`}
            >
              {s.label}
            </button>
          ))}

          <span className="w-px h-3 bg-white/15 mx-0.5" />

          {/* Custom size input — mousedown allowed through */}
          <input
            value={customWidth}
            onChange={(e) => setCustomWidth(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation(); // prevent Tiptap from intercepting keystrokes
              if (e.key === "Enter") { e.preventDefault(); applyCustomWidth(); }
            }}
            onBlur={applyCustomWidth}
            onClick={(e) => e.stopPropagation()}
            placeholder="300px / 60%"
            title="Custom width — press Enter to apply"
            className="w-24 px-1.5 py-0.5 text-[10px] bg-white/8 border border-white/15 focus:border-violet-500 rounded text-white placeholder-gray-600 outline-none"
          />

          <span className="w-px h-3 bg-white/15 mx-0.5" />

          {/* Alignment */}
          {ALIGN_OPTIONS.map((a) => (
            <button
              key={a.value}
              onClick={() => updateAttributes({ "data-align": a.value })}
              title={a.title}
              className={`p-1 rounded transition-colors ${
                align === a.value ? "bg-violet-600 text-white" : "text-gray-400 hover:text-white hover:bg-white/8"
              }`}
            >
              {a.icon}
            </button>
          ))}
        </div>
      )}

      {/* Image — uses margin-based alignment, no float */}
      <div
        className={selected ? "ring-2 ring-violet-500 ring-offset-1 ring-offset-zinc-950 rounded" : ""}
        style={imgContainerStyle}
      >
        <img
          src={src}
          alt={alt ?? ""}
          draggable={false}
          style={{ display: "block", width: "100%", borderRadius: "0.375rem" }}
        />
      </div>
    </NodeViewWrapper>
  );
}

// Extend the image extension with the custom NodeView
const ResizableImage = ImageExt.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: "100%", parseHTML: (el) => el.style.width || el.getAttribute("width") || "100%" },
      "data-align": { default: "center", parseHTML: (el) => el.getAttribute("data-align") ?? "center" },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});

// ── Toolbar button ────────────────────────────────────────────────────────────

function ToolbarBtn({ onClick, active, title, children, disabled }: {
  onClick: () => void; active?: boolean; title: string; children: React.ReactNode; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      disabled={disabled}
      className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
        active ? "bg-violet-500/20 text-violet-300" : "text-gray-400 hover:text-white hover:bg-white/8"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="w-px h-4 bg-white/10 mx-0.5 shrink-0" />;
}

// ── Main editor ───────────────────────────────────────────────────────────────

export function ClubRichEditor({ content, onChange, placeholder = "Write something…", minHeight = 120 }: Props) {
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const [uploading, setUploading]   = useState(false);
  const [showLink, setShowLink]     = useState(false);
  const [linkUrl, setLinkUrl]       = useState("");
  const linkInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: true,
    extensions: [
      StarterKit.configure({ codeBlock: false, link: false, underline: false }),
      Underline,
      Placeholder.configure({ placeholder }),
      LinkExt.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-violet-400 underline cursor-pointer" },
      }),
      ResizableImage.configure({ inline: false, allowBase64: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
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
    if (!url) { editor.chain().focus().unsetLink().run(); }
    else {
      const href = url.startsWith("http") ? url : `https://${url}`;
      editor.chain().focus().setLink({ href }).run();
    }
    setShowLink(false); setLinkUrl("");
  }

  function openLinkInput() {
    if (!editor) return;
    setLinkUrl(editor.getAttributes("link").href ?? "");
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
      const res = await api.post("/api/upload/image", form, { headers: { "Content-Type": "multipart/form-data" } });
      editor.chain().focus().setImage({ src: res.data.url, alt: file.name }).run();
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? "Image upload failed";
      import("@/lib/toast").then(({ dispatchToast }) => dispatchToast(msg, "error"));
    } finally {
      setUploading(false);
    }
  }

  if (!editor) return null;

  const isHeading = (level: 1 | 2 | 3) => editor.isActive("heading", { level });

  return (
    <div className="bg-white/5 border border-white/10 focus-within:border-violet-500 rounded-xl overflow-hidden transition-colors">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-0 px-2 py-1.5 border-b border-white/8 flex-wrap">
        {/* Headings */}
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={isHeading(1)} title="Heading 1">
          <Heading1 size={14} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={isHeading(2)} title="Heading 2">
          <Heading2 size={14} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={isHeading(3)} title="Heading 3">
          <Heading3 size={14} />
        </ToolbarBtn>

        <Divider />

        {/* Formatting */}
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
          <Bold size={14} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
          <Italic size={14} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline">
          <UnderlineIcon size={14} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough">
          <Strikethrough size={14} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Inline code">
          <Code size={14} />
        </ToolbarBtn>

        <Divider />

        {/* Alignment */}
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("left").run()}    active={editor.isActive({ textAlign: "left" })}    title="Align left">    <AlignLeft    size={14} /></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("center").run()}  active={editor.isActive({ textAlign: "center" })}  title="Align center">  <AlignCenter  size={14} /></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("right").run()}   active={editor.isActive({ textAlign: "right" })}   title="Align right">   <AlignRight   size={14} /></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })} title="Justify">        <AlignJustify size={14} /></ToolbarBtn>

        <Divider />

        {/* Lists & blocks */}
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()}  active={editor.isActive("bulletList")}  title="Bullet list">  <List         size={14} /></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Ordered list"> <ListOrdered  size={14} /></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()}  active={editor.isActive("blockquote")}  title="Blockquote">   <Quote        size={14} /></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false}                          title="Divider">       <Minus        size={14} /></ToolbarBtn>

        <Divider />

        {/* Link & image */}
        <ToolbarBtn onClick={openLinkInput} active={editor.isActive("link") || showLink} title="Insert link">
          <Link2 size={14} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => fileInputRef.current?.click()} active={false} title="Insert image (click to resize after inserting)" disabled={uploading}>
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Image size={14} />}
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
          <button onMouseDown={(e) => { e.preventDefault(); applyLink(); }} className="p-1 text-green-400 hover:text-green-300 transition-colors">
            <Check size={14} />
          </button>
          <button onMouseDown={(e) => { e.preventDefault(); setShowLink(false); setLinkUrl(""); }} className="p-1 text-gray-500 hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Editor area */}
      <div className="px-3 py-2.5" style={{ minHeight }}>
        <EditorContent editor={editor} />
      </div>

      {/* Hint */}
      <div className="px-3 pb-2 text-[10px] text-gray-600">
        Click an image to resize or reposition it
      </div>
    </div>
  );
}
