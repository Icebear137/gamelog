"use client";

import DOMPurify from "dompurify";

export function PostBody({ html }: { html: string }) {
  const clean = typeof window !== "undefined" ? DOMPurify.sanitize(html) : html;
  return (
    <div
      className="club-post-content"
      style={{ fontSize: 13, color: "var(--gx-text-2)", lineHeight: 1.65 }}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
