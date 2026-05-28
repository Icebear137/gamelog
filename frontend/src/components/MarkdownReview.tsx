"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import SpoilerText from "./SpoilerText";

interface Props {
  text: string;
  className?: string;
}

/**
 * Renders a review that may contain:
 * - Standard markdown (bold, italic, strikethrough, lists, etc.)
 * - [spoiler]...[/spoiler] click-to-reveal blocks
 *
 * Strategy: split on spoiler tags first, render non-spoiler segments as markdown.
 */
export default function MarkdownReview({ text, className }: Props) {
  const parts = text.split(/(\[spoiler\][\s\S]*?\[\/spoiler\])/gi);

  return (
    <div className={className}>
      {parts.map((part, i) => {
        const spoilerMatch = part.match(/^\[spoiler\]([\s\S]*?)\[\/spoiler\]$/i);
        if (spoilerMatch) {
          return (
            <SpoilerText key={i} text={part} />
          );
        }
        if (!part) return null;
        return (
          <ReactMarkdown
            key={i}
            remarkPlugins={[remarkGfm]}
            components={{
              // Inline elements — keep them inline
              p: ({ children }) => <span className="block mb-2 last:mb-0">{children}</span>,
              strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
              em: ({ children }) => <em className="italic text-gray-300">{children}</em>,
              del: ({ children }) => <del className="line-through text-gray-500">{children}</del>,
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-400 hover:text-violet-300 underline"
                >
                  {children}
                </a>
              ),
              ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 mb-2">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 mb-2">{children}</ol>,
              li: ({ children }) => <li className="text-gray-300">{children}</li>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-violet-700 pl-3 text-gray-400 italic my-2">
                  {children}
                </blockquote>
              ),
              code: ({ children }) => (
                <code className="bg-white/8 text-violet-300 px-1 py-0.5 rounded text-xs font-mono">
                  {children}
                </code>
              ),
              h1: ({ children }) => <h1 className="text-base font-bold text-white mt-2 mb-1">{children}</h1>,
              h2: ({ children }) => <h2 className="text-sm font-bold text-white mt-2 mb-1">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-semibold text-gray-200 mt-1">{children}</h3>,
            }}
          >
            {part}
          </ReactMarkdown>
        );
      })}
    </div>
  );
}
