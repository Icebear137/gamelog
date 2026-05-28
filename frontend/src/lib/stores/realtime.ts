import { create } from "zustand";

interface RealtimeState {
  /** Feed has new posts from followed users that haven't been loaded yet */
  feedHasNew: boolean;
  newFeedCount: number;
  setFeedNew: (count: number) => void;
  clearFeedNew: () => void;
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  feedHasNew: false,
  newFeedCount: 0,
  setFeedNew: (count) => set({ feedHasNew: true, newFeedCount: count }),
  clearFeedNew: () => set({ feedHasNew: false, newFeedCount: 0 }),
}));
