import { api } from "@/lib/api";
import { ApiConstant } from "@/constant";
import type { GameReview } from "@/lib/types";

export const searchGamesService = (params: Record<string, string | number>) =>
  api.get(ApiConstant.GAMES_SEARCH, { params }).then((r) => r.data);

export const getGameService = (rawgId: number) =>
  api.get(ApiConstant.GAME_DETAIL(rawgId)).then((r) => r.data);

export const getGameReviewsService = (rawgId: number, sort = "recent") =>
  api.get<GameReview[]>(ApiConstant.GAME_REVIEWS(rawgId), { params: { sort } }).then((r) => r.data);

export const getGameTagsService = (rawgId: number) =>
  api.get(ApiConstant.GAME_TAGS(rawgId)).then((r) => r.data);

export const addGameTagService = (rawgId: number, tag: string) =>
  api.post(ApiConstant.GAME_TAGS(rawgId), { tag }).then((r) => r.data);

export const voteGameTagService = (tagId: string) =>
  api.post(ApiConstant.GAME_TAGS_VOTE(tagId)).then((r) => r.data);

export const getGameActivitiesService = (rawgId: number) =>
  api.get(ApiConstant.GAME_ACTIVITIES(rawgId)).then((r) => r.data);

export const getGameFriendsService = (rawgId: number) =>
  api.get(ApiConstant.GAME_FRIENDS(rawgId)).then((r) => r.data);

export const getNewReleasesService = () =>
  api.get(ApiConstant.GAMES_NEW_RELEASES).then((r) => r.data);

export const getUpcomingGamesService = () =>
  api.get(ApiConstant.GAMES_UPCOMING).then((r) => r.data);

export const getTrendingGamesService = () =>
  api.get(ApiConstant.GAMES_TRENDING).then((r) => r.data);

export const getRecommendationsService = () =>
  api.get(ApiConstant.GAMES_RECOMMENDATIONS).then((r) => r.data);

export const getGlobalReviewsService = (sort = "recent") =>
  api.get<GameReview[]>(ApiConstant.GAMES_REVIEWS, { params: { sort } }).then((r) => r.data);

export const getPopularTagsService = () =>
  api.get(ApiConstant.GAMES_POPULAR_TAGS).then((r) => r.data);

export const getGamesByTagService = (tag: string) =>
  api.get(ApiConstant.GAMES_BY_TAG(encodeURIComponent(tag))).then((r) => r.data);
