import { api } from "@/lib/api";
import { ApiConstant } from "@/constant";
import type { GameEntry } from "@/lib/types";

export interface ICreateEntryPayload {
  rawgId: number;
  status: string;
  rating?: number | null;
  review?: string | null;
  playtime?: number | null;
  platform?: string | null;
}

export const getMyEntriesService = (status?: string) =>
  api.get<GameEntry[]>(ApiConstant.ENTRIES_ME, { params: status ? { status } : {} }).then((r) => r.data);

export const upsertEntryService = (data: ICreateEntryPayload) =>
  api.post<GameEntry>(ApiConstant.ENTRIES, data).then((r) => r.data);

export const deleteEntryService = (rawgId: number) =>
  api.delete(ApiConstant.ENTRY_DELETE(rawgId)).then((r) => r.data);

export const toggleReviewHelpfulService = (entryId: string) =>
  api.post(ApiConstant.ENTRY_HELPFUL(entryId)).then((r) => r.data);
