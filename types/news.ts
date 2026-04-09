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
  color: string;
  badgeClass: string;
}
