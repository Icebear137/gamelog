// ── Auth ───────────────────────────────────────────────────────────────────
export const AUTH_ME              = "/api/auth/me";
export const AUTH_LOGIN           = "/api/auth/login";
export const AUTH_REGISTER        = "/api/auth/register";
export const AUTH_CHANGE_PASSWORD = "/api/auth/change-password";
export const AUTH_ACCOUNT         = "/api/auth/account";

// ── Games ──────────────────────────────────────────────────────────────────
export const GAMES_SEARCH       = "/api/games/search";
export const GAMES_GENRES       = "/api/games/genres";
export const GAMES_RECOMMENDATIONS = "/api/games/recommendations";
export const GAMES_TRENDING     = "/api/games/trending";
export const GAMES_NEW_RELEASES = "/api/games/new-releases";
export const GAMES_UPCOMING     = "/api/games/upcoming";
export const GAMES_POPULAR_TAGS = "/api/games/popular-tags";
export const GAMES_REVIEWS      = "/api/games/reviews";
export const GAMES_BY_TAG       = (tag: string)    => `/api/games/by-tag/${tag}`;
export const GAME_DETAIL        = (id: number)     => `/api/games/${id}`;
export const GAME_REVIEWS       = (id: number)     => `/api/games/${id}/reviews`;
export const GAME_TAGS          = (id: number)     => `/api/games/${id}/tags`;
export const GAME_TAGS_VOTE     = (tagId: string)  => `/api/games/tags/${tagId}/vote`;
export const GAME_FRIENDS       = (id: number)     => `/api/games/${id}/friends`;
export const GAME_ACTIVITIES    = (id: number)     => `/api/games/${id}/activities`;

// ── Entries ────────────────────────────────────────────────────────────────
export const ENTRIES            = "/api/entries";
export const ENTRIES_ME         = "/api/entries/me";
export const ENTRY_HELPFUL      = (id: string)     => `/api/entries/${id}/helpful`;
export const ENTRY_DELETE       = (rawgId: number) => `/api/entries/${rawgId}`;

// ── Users ──────────────────────────────────────────────────────────────────
export const USERS_SEARCH       = "/api/users/search";
export const USERS_DISCOVER     = "/api/users/discover";
export const ME                 = "/api/users/me";
export const ME_AVATAR          = "/api/users/me/avatar";
export const ME_CHALLENGE       = "/api/users/me/challenge";
export const ME_ACHIEVEMENTS    = "/api/users/me/achievements";
export const USER               = (u: string)      => `/api/users/${u}`;
export const USER_FOLLOW        = (u: string)      => `/api/users/${u}/follow`;
export const USER_GAMES         = (u: string)      => `/api/users/${u}/games`;
export const USER_ACTIVITIES    = (u: string)      => `/api/users/${u}/activities`;
export const USER_LISTS         = (u: string)      => `/api/users/${u}/lists`;
export const USER_REVIEWS       = (u: string)      => `/api/users/${u}/reviews`;
export const USER_FOLLOWERS     = (u: string)      => `/api/users/${u}/followers`;
export const USER_FOLLOWING     = (u: string)      => `/api/users/${u}/following`;
export const USER_STATS         = (u: string)      => `/api/users/${u}/stats`;
export const USER_CHALLENGE     = (u: string)      => `/api/users/${u}/challenge`;
export const USER_ACHIEVEMENTS  = (u: string)      => `/api/users/${u}/achievements`;
export const USER_COMPARE       = (u: string)      => `/api/users/${u}/compare`;

// ── Feed ───────────────────────────────────────────────────────────────────
export const FEED               = "/api/feed";
export const FEED_GLOBAL        = "/api/feed/global";

// ── Activities ─────────────────────────────────────────────────────────────
export const ACTIVITY           = (id: string)     => `/api/activities/${id}`;
export const ACTIVITY_LIKE      = (id: string)     => `/api/activities/${id}/like`;
export const ACTIVITY_COMMENTS  = (id: string)     => `/api/activities/${id}/comments`;

// ── Lists ──────────────────────────────────────────────────────────────────
export const LISTS              = "/api/lists";
export const LISTS_ME           = "/api/lists/me";
export const LISTS_DISCOVER     = "/api/lists/discover";
export const LIST               = (id: string)     => `/api/lists/${id}`;
export const LIST_LIKE          = (id: string)     => `/api/lists/${id}/like`;
export const LIST_COMMENTS      = (id: string)     => `/api/lists/${id}/comments`;
export const LIST_COMMENT       = (id: string, cId: string) => `/api/lists/${id}/comments/${cId}`;
export const LIST_GAMES         = (id: string)     => `/api/lists/${id}/games`;
export const LIST_GAME          = (id: string, gameId: string) => `/api/lists/${id}/games/${gameId}`;

// ── Messages ───────────────────────────────────────────────────────────────
export const CONVERSATIONS                   = "/api/messages/conversations";
export const CONVERSATION                    = (id: string) => `/api/messages/conversations/${id}`;
// CONVERSATION_MESSAGES is an alias for CONVERSATION — use CONVERSATION directly
export const CONVERSATION_IMAGES             = (id: string) => `/api/messages/conversations/${id}/images`;
export const CONVERSATION_AUDIO              = (id: string) => `/api/messages/conversations/${id}/audio`;
export const CONVERSATION_FILES              = (id: string) => `/api/messages/conversations/${id}/files`;
export const CONVERSATION_FORWARD            = (id: string) => `/api/messages/conversations/${id}/forward`;
export const CONVERSATION_POLLS              = (id: string) => `/api/messages/conversations/${id}/polls`;
export const CONVERSATION_GAME_NIGHTS        = (id: string) => `/api/messages/conversations/${id}/game-nights`;
export const CONVERSATION_PIN                = (id: string) => `/api/messages/conversations/${id}/pin`;
export const CONVERSATION_READ               = (id: string) => `/api/messages/conversations/${id}/read`;
export const CONVERSATION_MUTE               = (id: string) => `/api/messages/conversations/${id}/mute`;
export const CONVERSATION_MEMBERS            = (id: string) => `/api/messages/conversations/${id}/members`;
export const CONVERSATION_MEMBER             = (id: string, uid: string) => `/api/messages/conversations/${id}/members/${uid}`;
export const CONVERSATION_MEMBER_ROLE        = (id: string, uid: string) => `/api/messages/conversations/${id}/members/${uid}/role`;
export const CONVERSATION_AVATAR             = (id: string) => `/api/messages/conversations/${id}/avatar`;
export const CONVERSATION_GROUP              = (id: string) => `/api/messages/conversations/${id}/group`;
export const CONVERSATION_NICKNAMES          = (id: string) => `/api/messages/conversations/${id}/nicknames`;
export const CONVERSATION_NICKNAME           = (id: string, uid: string) => `/api/messages/conversations/${id}/nicknames/${uid}`;
export const CONVERSATION_SEARCH             = (id: string) => `/api/messages/conversations/${id}/search`;
// CONVERSATION_SHARED_IMAGES/FILES are aliases — use CONVERSATION_IMAGES/FILES directly
export const CONVERSATIONS_GROUP             = "/api/messages/conversations/group";
export const MESSAGE_REACTION                = (msgId: string) => `/api/messages/reactions/${msgId}`;
export const MESSAGE_DELETE                  = (convId: string, msgId: string) => `/api/messages/conversations/${convId}/messages/${msgId}`;
export const POLL_VOTE                       = (pollId: string) => `/api/messages/polls/${pollId}/vote`;
export const POLL_CLOSE                      = (pollId: string) => `/api/messages/polls/${pollId}/close`;
export const GAME_NIGHT_RSVP                 = (gnId: string)  => `/api/messages/game-nights/${gnId}/rsvp`;
export const LINK_PREVIEW                    = "/api/messages/link-preview";
export const MESSAGES_UNREAD_COUNT           = "/api/messages/unread-count";

// ── Notifications ──────────────────────────────────────────────────────────
export const NOTIFICATIONS           = "/api/notifications";
export const NOTIFICATIONS_UNREAD    = "/api/notifications/unread-count";
export const NOTIFICATIONS_READ_ALL  = "/api/notifications/read-all";

// ── AI ─────────────────────────────────────────────────────────────────────
export const AI_CHAT = "/api/ai/chat";

// ── Posts ──────────────────────────────────────────────────────────────────
export const POSTS               = "/api/posts";
export const POST                = (id: string) => `/api/posts/${id}`;
export const POST_LIKE           = (id: string) => `/api/posts/${id}/like`;
export const POST_COMMENTS       = (id: string) => `/api/posts/${id}/comments`;
