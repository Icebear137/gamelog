import axios from "axios";

const RAWG_BASE = "https://api.rawg.io/api";
const key = process.env.RAWG_API_KEY;

export interface RawgGame {
  id: number;
  name: string;
  slug: string;
  background_image: string | null;
  released: string | null;
  rating: number;
  genres: { id: number; name: string }[];
  description_raw?: string;
  platforms?: { platform: { id: number; name: string; slug: string } }[];
  developers?: { id: number; name: string }[];
  publishers?: { id: number; name: string }[];
  website?: string | null;
  metacritic?: number | null;
  esrb_rating?: { id: number; name: string; slug: string } | null;
  playtime?: number;
}

export async function searchGames(query: string, page = 1): Promise<RawgGame[]> {
  try {
    const res = await axios.get(`${RAWG_BASE}/games`, {
      params: { key, search: query, page, page_size: 15 },
    });
    return res.data.results ?? [];
  } catch {
    return [];
  }
}

export async function getGamesList(params: Record<string, unknown>): Promise<RawgGame[]> {
  try {
    const res = await axios.get(`${RAWG_BASE}/games`, { params: { key, ...params } });
    return res.data.results ?? [];
  } catch {
    return [];
  }
}

export async function getGameById(id: number): Promise<RawgGame | null> {
  try {
    const res = await axios.get(`${RAWG_BASE}/games/${id}`, { params: { key } });
    return res.data;
  } catch {
    return null;
  }
}

export function extractYear(released: string | null): number | null {
  if (!released) return null;
  const y = parseInt(released.split("-")[0]);
  return isNaN(y) ? null : y;
}
