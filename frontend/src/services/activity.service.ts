import { api } from "@/lib/api";
import { ApiConstant } from "@/constant";
import type { Activity, Comment } from "@/lib/types";

export const getActivityService = (id: string) =>
  api.get<Activity>(ApiConstant.ACTIVITY(id)).then((r) => r.data);

export const likeActivityService = (id: string) =>
  api.post(ApiConstant.ACTIVITY_LIKE(id)).then((r) => r.data);

export const unlikeActivityService = (id: string) =>
  api.delete(ApiConstant.ACTIVITY_LIKE(id)).then((r) => r.data);

export const getActivityCommentsService = (id: string) =>
  api.get<Comment[]>(ApiConstant.ACTIVITY_COMMENTS(id)).then((r) => r.data);

export const addActivityCommentService = (id: string, body: string) =>
  api.post<Comment>(ApiConstant.ACTIVITY_COMMENTS(id), { body }).then((r) => r.data);

export const getFeedService = (pageParam = 0) =>
  api.get(ApiConstant.FEED, { params: { page: pageParam } }).then((r) => r.data);

export const getGlobalFeedService = () =>
  api.get(ApiConstant.FEED_GLOBAL).then((r) => r.data);
