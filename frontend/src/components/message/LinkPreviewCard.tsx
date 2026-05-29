"use client";

import { useQuery } from "@tanstack/react-query";
import { Text } from "@radix-ui/themes";
import { api } from "@/lib/api";

interface LinkPreviewData {
  url: string;
  title: string;
  description: string | null;
  image: string | null;
  siteName: string;
}

interface Props { url: string; isOwn: boolean }

export function LinkPreviewCard({ url, isOwn }: Props) {
  const { data, isLoading, isError } = useQuery<LinkPreviewData>({
    queryKey: ["link-preview", url],
    queryFn: () =>
      api.get(`/api/messages/link-preview?url=${encodeURIComponent(url)}`, {
        silentOnError: true,
      } as any).then((r) => r.data),
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className={`mt-1.5 rounded-2xl overflow-hidden border max-w-60 animate-pulse ${isOwn ? "border-violet-500/20 bg-violet-900/10 rounded-br-sm" : "border-white/8 bg-white/4 rounded-bl-sm"}`}>
        <div className="h-24 bg-white/5" />
        <div className="px-3 py-2.5 space-y-1.5">
          <div className="h-3 bg-white/10 rounded w-4/5" />
          <div className="h-2.5 bg-white/8 rounded w-full" />
          <div className="h-2 bg-white/6 rounded w-2/5 mt-2" />
        </div>
      </div>
    );
  }

  if (isError || !data?.title) return null;

  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`mt-1.5 block rounded-2xl overflow-hidden border max-w-60 group/link transition-opacity hover:opacity-90 ${isOwn ? "border-violet-500/30 bg-violet-900/20 rounded-br-sm" : "border-white/10 bg-white/5 rounded-bl-sm"}`}
    >
      {data.image && (
        <div className="relative h-28 w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.image}
            alt=""
            className="w-full h-full object-cover group-hover/link:brightness-90 transition-all duration-200"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}
      <div className="px-3 py-2.5">
        <Text as="p" size="1" weight="bold" className="leading-snug line-clamp-2">{data.title}</Text>
        {data.description && (
          <p className="text-[11px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">{data.description}</p>
        )}
        <p className="text-[10px] text-violet-400 font-medium mt-1.5">🔗 {data.siteName}</p>
      </div>
    </a>
  );
}
