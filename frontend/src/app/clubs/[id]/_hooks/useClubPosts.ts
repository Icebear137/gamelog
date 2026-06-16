"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ClubPost, Sort } from "../_types";

export function useClubPosts(clubId: string, enabled: boolean) {
  const [sort, setSort] = useState<Sort>("newest");
  const [posts, setPosts] = useState<ClubPost[]>([]);

  const { data: fetchedPosts = [] } = useQuery<ClubPost[]>({
    queryKey: ["club-posts", clubId, sort],
    queryFn: () => api.get(`/api/clubs/${clubId}/posts?sort=${sort}`).then((r) => r.data),
    staleTime: 30_000,
    enabled,
  });

  useEffect(() => {
    if (fetchedPosts.length > 0) setPosts(fetchedPosts);
  }, [fetchedPosts]);

  const allPosts = posts.length > 0 ? posts : fetchedPosts;

  const addPost = useCallback((post: ClubPost) => {
    setPosts((prev) => [{ ...post, likedByMe: false }, ...prev]);
  }, []);

  const updatePost = useCallback((updated: ClubPost) => {
    setPosts((prev) => prev.map((p) => p.id === updated.id ? { ...p, ...updated } : p));
  }, []);

  const deletePost = useCallback((postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  return { sort, setSort, allPosts, addPost, updatePost, deletePost };
}
