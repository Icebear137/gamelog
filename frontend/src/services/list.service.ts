import { api } from "@/lib/api";
import { ApiConstant } from "@/constant";
import type { GameListPreview, GameListDetail, GameListComment } from "@/lib/types";

export const getMyListsService = () =>
  api.get<GameListPreview[]>(ApiConstant.LISTS_ME).then((r) => r.data);

export const getDiscoverListsService = () =>
  api.get<GameListPreview[]>(ApiConstant.LISTS_DISCOVER).then((r) => r.data);

export const getListService = (id: string) =>
  api.get<GameListDetail>(ApiConstant.LIST(id)).then((r) => r.data);

export const createListService = (data: { name: string; description?: string; isPublic?: boolean }) =>
  api.post<GameListPreview>(ApiConstant.LISTS, data).then((r) => r.data);

export const updateListService = (id: string, data: Partial<{ name: string; description: string; isPublic: boolean }>) =>
  api.patch(ApiConstant.LIST(id), data).then((r) => r.data);

export const deleteListService = (id: string) =>
  api.delete(ApiConstant.LIST(id)).then((r) => r.data);

export const likeListService = (id: string) =>
  api.post(ApiConstant.LIST_LIKE(id)).then((r) => r.data);

export const unlikeListService = (id: string) =>
  api.delete(ApiConstant.LIST_LIKE(id)).then((r) => r.data);

export const getListCommentsService = (id: string) =>
  api.get<GameListComment[]>(ApiConstant.LIST_COMMENTS(id)).then((r) => r.data);

export const addListCommentService = (id: string, body: string) =>
  api.post<GameListComment>(ApiConstant.LIST_COMMENTS(id), { body }).then((r) => r.data);

export const deleteListCommentService = (id: string, commentId: string) =>
  api.delete(ApiConstant.LIST_COMMENT(id, commentId)).then((r) => r.data);

export const addGameToListService = (id: string, rawgId: number) =>
  api.post(ApiConstant.LIST_GAMES(id), { rawgId }).then((r) => r.data);

export const removeGameFromListService = (id: string, gameId: string) =>
  api.delete(ApiConstant.LIST_GAME(id, gameId)).then((r) => r.data);
