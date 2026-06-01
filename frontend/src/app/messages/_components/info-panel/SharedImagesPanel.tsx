"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ImageIcon, Loader2, X, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { Text } from "@radix-ui/themes";
import { api } from "@/lib/api";

interface ImageItem { url: string; messageId: string }

interface Props { conversationId: string }

export function SharedImagesPanel({ conversationId }: Props) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  const { data: images = [], isLoading } = useQuery<ImageItem[]>({
    queryKey: ["conv-images", conversationId],
    queryFn: () => api.get(`/api/messages/conversations/${conversationId}/images`).then((r) => r.data),
    staleTime: 30_000,
  });

  const visible = images.slice(0, 9);
  const extra = images.length - 9;

  function prev() { setLightbox((i) => (i! > 0 ? i! - 1 : images.length - 1)); }
  function next() { setLightbox((i) => (i! < images.length - 1 ? i! + 1 : 0)); }

  return (
    <>
      <div className="px-4 py-3 border-t border-white/8">
        <div className="flex items-center gap-1.5 mb-3">
          <ImageIcon size={12} className="text-gray-500" />
          <Text as="span" size="1" color="gray" className="font-medium">Images</Text>
          {images.length > 0 && (
            <span className="text-[10px] text-gray-600 ml-auto">{images.length}</span>
          )}
        </div>

        {isLoading && (
          <div className="flex justify-center py-4">
            <Loader2 size={16} className="animate-spin text-gray-600" />
          </div>
        )}

        {!isLoading && images.length === 0 && (
          <Text as="p" size="1" color="gray" className="text-center py-3">No images shared yet</Text>
        )}

        {!isLoading && images.length > 0 && (
          <div className="grid grid-cols-3 gap-1.5">
            {visible.map((img, idx) => (
              <button
                key={`${img.messageId}-${idx}`}
                onClick={() => setLightbox(idx)}
                className="aspect-square rounded-lg overflow-hidden bg-white/5 hover:ring-1 hover:ring-violet-500/60 transition-all relative group"
              >
                <Image
                  src={img.url}
                  alt=""
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                  sizes="80px"
                />
                {idx === 8 && extra > 0 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">+{extra}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors"
            onClick={() => setLightbox(null)}
          >
            <X size={20} />
          </button>
          {images.length > 1 && (
            <>
              <button
                className="absolute left-4 p-2 text-gray-400 hover:text-white transition-colors"
                onClick={(e) => { e.stopPropagation(); prev(); }}
              >
                <ChevronLeft size={28} />
              </button>
              <button
                className="absolute right-4 p-2 text-gray-400 hover:text-white transition-colors"
                onClick={(e) => { e.stopPropagation(); next(); }}
              >
                <ChevronRight size={28} />
              </button>
            </>
          )}
          <div className="relative max-w-3xl max-h-[85vh] w-full h-full mx-12" onClick={(e) => e.stopPropagation()}>
            <Image
              src={images[lightbox].url}
              alt=""
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 800px"
            />
          </div>
          <span className="absolute bottom-4 text-sm text-gray-500">
            {lightbox + 1} / {images.length}
          </span>
        </div>
      )}
    </>
  );
}
