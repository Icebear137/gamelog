export const ACTIVITY_SELECT = {
  id: true,
  type: true,
  createdAt: true,
  user: { select: { id: true, username: true, avatar: true } },
  gameEntry: {
    select: {
      id: true,
      status: true,
      rating: true,
      review: true,
      playtime: true,
      platform: true,
      game: {
        select: { id: true, rawgId: true, name: true, slug: true, coverImage: true, genres: true },
      },
    },
  },
  _count: { select: { likes: true, comments: true } },
} as const;
