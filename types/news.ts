export interface NewsItem {
  id: string;
  title: string;
  description: string;
  link: string;
  pubDate: string;
  formattedDate: string;
  source: string;
  sourceColor: string;
  badgeClass: string;
  imageUrl?: string;
  category: string;
}

export interface DayStats {
  total: number;   // articles scrolled into view (vistas)
  reads: number;   // articles opened via "Leer noticia" click (leídas)
  sources: Record<string, number>;
}

/** Keys are ISO date strings 'YYYY-MM-DD' */
export type ReadingHistory = Record<string, DayStats>;

export interface StreakData {
  count: number;
  lastDate: string; // 'YYYY-MM-DD'
}

export interface UserPrefs {
  hiddenSources: string[];   // source names the user has disabled
  onlyWithImage: boolean;    // hide articles without a photo
  textSize: 'normal' | 'large'; // title font size
}

export const DEFAULT_PREFS: UserPrefs = {
  hiddenSources: [],
  onlyWithImage: false,
  textSize: 'normal',
};

export interface NewsSource {
  name: string;
  rssUrl: string;
  fallbackUrls?: string[];
  color: string;
  badgeClass: string;
  /** When true, all articles from this feed are assumed to be local Córdoba news
   *  and skip the keyword/category filter. Use only for dedicated Córdoba sections. */
  trustedLocal?: boolean;
}
