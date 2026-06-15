import { api } from "@/lib/api";
import * as C from "@/constant/api.const";
import type { Post, PostComment, FeedItem } from "@/lib/types";

export const getPostFeedService = (pageParam = 1, filter: "global" | "following" = "global") =>
  api.get<FeedItem[]>(C.POSTS, { params: { page: pageParam, filter } }).then((r) => r.data);

export const createPostService = (data: { textContent?: string; images?: string[]; visibility?: string }) =>
  api.post<Post>(C.POSTS, data).then((r) => r.data);

export const updatePostService = (id: string, data: { textContent?: string; images?: string[] }) =>
  api.put<Post>(C.POST(id), data).then((r) => r.data);

export const deletePostService = (id: string) =>
  api.delete(C.POST(id)).then((r) => r.data);

export const likePostService = (id: string) =>
  api.post<{ liked: boolean; count: number }>(C.POST_LIKE(id)).then((r) => r.data);

export const unlikePostService = (id: string) =>
  api.delete<{ liked: boolean; count: number }>(C.POST_LIKE(id)).then((r) => r.data);

export const getPostCommentsService = (id: string) =>
  api.get<PostComment[]>(C.POST_COMMENTS(id)).then((r) => r.data);

export const addPostCommentService = (id: string, body: string, parentId?: string) =>
  api.post<PostComment>(C.POST_COMMENTS(id), { body, parentId }).then((r) => r.data);
