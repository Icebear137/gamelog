import { api } from "@/lib/api";
import { ApiConstant } from "@/constant";
import type { User, Activity, GameEntry, GameReview } from "@/lib/types";

export const getUserService = (username: string) =>
  api.get<User>(ApiConstant.USER(username)).then((r) => r.data);

export const searchUsersService = (q: string) =>
  api.get(ApiConstant.USERS_SEARCH, { params: { q } }).then((r) => r.data);

export const discoverUsersService = () =>
  api.get(ApiConstant.USERS_DISCOVER).then((r) => r.data);

export const updateProfileService = (data: Partial<User>) =>
  api.patch(ApiConstant.ME, data).then((r) => r.data);

export const followUserService = (username: string) =>
  api.post(ApiConstant.USER_FOLLOW(username)).then((r) => r.data);

export const unfollowUserService = (username: string) =>
  api.delete(ApiConstant.USER_FOLLOW(username)).then((r) => r.data);

export const getUserActivitiesService = (username: string) =>
  api.get<Activity[]>(ApiConstant.USER_ACTIVITIES(username)).then((r) => r.data);

export const getUserGamesService = (username: string, status?: string) =>
  api.get<GameEntry[]>(ApiConstant.USER_GAMES(username), { params: status ? { status } : {} }).then((r) => r.data);

export const getUserReviewsService = (username: string) =>
  api.get<GameReview[]>(ApiConstant.USER_REVIEWS(username)).then((r) => r.data);

export const getUserCompareService = (username: string) =>
  api.get(ApiConstant.USER_COMPARE(username)).then((r) => r.data);

export const getUserStatsService = (username: string, year?: number) =>
  api.get(ApiConstant.USER_STATS(username), { params: year ? { year } : {} }).then((r) => r.data);

export const getUserFollowersService = (username: string) =>
  api.get(ApiConstant.USER_FOLLOWERS(username)).then((r) => r.data);

export const getUserFollowingService = (username: string) =>
  api.get(ApiConstant.USER_FOLLOWING(username)).then((r) => r.data);

export const getUserAchievementsService = (username: string) =>
  api.get(ApiConstant.USER_ACHIEVEMENTS(username)).then((r) => r.data);

export const getMyAchievementsService = () =>
  api.get(ApiConstant.ME_ACHIEVEMENTS).then((r) => r.data);

export const getUserChallengeService = (username: string, year?: number) =>
  api.get(ApiConstant.USER_CHALLENGE(username), { params: year ? { year } : {} }).then((r) => r.data);

export const updateNotificationPrefsService = (prefs: Record<string, boolean>) =>
  api.patch(ApiConstant.ME, prefs).then((r) => r.data);
