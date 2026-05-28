"use client";

import { useRouter } from "next/navigation";
import SpoilerText from "./SpoilerText";

interface Props {
  body: string;
  className?: string;
}

/**
 * Renders a comment body with:
 * - @username → clickable link to the user's profile
 * - [spoiler]...[/spoiler] → click-to-reveal blurred block
 */
export default function CommentBody({ body, className }: Props) {
  const router = useRouter();

  // Split on @mentions and [spoiler] blocks, preserving delimiters
  const parts = body.split(/(@\w+|\[spoiler\][\s\S]*?\[\/spoiler\])/gi);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        // @mention
        if (/^@\w+$/.test(part)) {
          const username = part.slice(1);
          return (
            <span
              key={i}
              role="link"
              tabIndex={0}
              className="text-violet-400 hover:text-violet-300 cursor-pointer font-medium transition-colors outline-none"
              onClick={() => router.push(`/user/${username}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") router.push(`/user/${username}`);
              }}
            >
              {part}
            </span>
          );
        }

        // [spoiler] block — delegate to SpoilerText
        if (/^\[spoiler\]/i.test(part)) {
          return <SpoilerText key={i} text={part} />;
        }

        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
