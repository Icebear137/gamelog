// ── Static routes ──────────────────────────────────────────────────────────
export const HOME      = "/";
export const LOGIN     = "/login";
export const REGISTER  = "/register";
export const DISCOVER  = "/discover";
export const LIBRARY   = "/library";
export const LISTS     = "/lists";
export const LISTS_DISCOVER = "/lists/discover";
export const MESSAGES  = "/messages";
export const NOTIFICATIONS = "/notifications";
export const REVIEWS   = "/reviews";
export const SEARCH    = "/search";
export const SETTINGS  = "/settings";

// ── Dynamic routes ─────────────────────────────────────────────────────────
export const ACTIVITY  = (id: string)         => `/activity/${id}`;
export const GAME      = (rawgId: number)      => `/game/${rawgId}`;
export const GAME_TAG  = (tag: string)         => `/games/tag/${tag}`;
export const LIST      = (id: string)          => `/lists/${id}`;
export const CONVERSATION = (id: string)       => `/messages/${id}`;
export const USER      = (username: string)    => `/user/${username}`;
export const USER_COMPARE  = (username: string) => `/user/${username}/compare`;
export const USER_STATS    = (username: string) => `/user/${username}/stats`;
export const USER_FOLLOWERS = (username: string) => `/user/${username}/followers`;
export const USER_FOLLOWING = (username: string) => `/user/${username}/following`;
export const USER_GAMES    = (username: string) => `/user/${username}/games`;
