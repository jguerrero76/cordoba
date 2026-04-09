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
}

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
