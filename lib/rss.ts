import Parser from 'rss-parser';
import { NewsItem, NewsSource } from '@/types/news';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type CustomItem = {
  mediaContent?: { $?: { url?: string } } | Array<{ $?: { url?: string } }>;
  mediaThumbnail?: { $?: { url?: string } };
  contentEncoded?: string;
  enclosure?: { url?: string; type?: string };
};

// Browser-like headers to avoid being blocked by news sites
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
  'Cache-Control': 'no-cache',
};

const parser = new Parser<Record<string, unknown>, CustomItem>({
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['content:encoded', 'contentEncoded'],
    ],
  },
  timeout: 12000,
  headers: HEADERS,
});

export const NEWS_SOURCES: NewsSource[] = [
  {
    name: 'Diario Córdoba',
    rssUrl: 'https://www.diariocordoba.com/rss/',
    fallbackUrls: ['https://www.diariocordoba.com/noticias/cordoba/rss/'],
    color: '#C41230',
    badgeClass: 'bg-red-700',
  },
  {
    name: 'Cordópolis',
    rssUrl: 'https://cordopolis.eldiario.es/rss/',
    fallbackUrls: [
      'https://www.eldiario.es/andalucia/cordoba/rss/',
      'https://cordopolis.eldiario.es/feed/',
    ],
    color: '#D97706',
    badgeClass: 'bg-amber-600',
  },
  {
    name: 'El Día de Córdoba',
    rssUrl: 'https://eldiadecordoba.es/rss.xml',
    fallbackUrls: [
      'https://eldiadecordoba.es/feed/',
      'https://www.eldiadecordoba.es/feed/',
      'https://eldiadecordoba.es/rss/',
    ],
    color: '#1D4ED8',
    badgeClass: 'bg-blue-700',
  },
];

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractImage(item: CustomItem & Record<string, unknown>): string | undefined {
  try {
    if (item.mediaContent) {
      if (Array.isArray(item.mediaContent)) {
        const url = item.mediaContent[0]?.$?.url;
        if (url?.startsWith('http')) return url;
      } else if (typeof item.mediaContent === 'object') {
        const url = item.mediaContent.$?.url;
        if (url?.startsWith('http')) return url;
      }
    }
    if (item.mediaThumbnail?.$?.url?.startsWith('http')) {
      return item.mediaThumbnail.$.url;
    }
    if (item.enclosure?.url && item.enclosure.type?.startsWith('image/')) {
      return item.enclosure.url;
    }
    const searchIn = [item.contentEncoded as string, item['content'] as string]
      .filter(Boolean)
      .join(' ');
    if (searchIn) {
      const match = searchIn.match(/<img[^>]+src=["']([^"'\s>]+)["']/i);
      if (match?.[1]?.startsWith('http')) return match[1];
    }
  } catch {
    // ignore
  }
  return undefined;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return format(date, "d 'de' MMMM 'de' yyyy", { locale: es });
  } catch {
    return '';
  }
}

function mapItems(items: (Parser.Item & CustomItem)[], source: NewsSource): NewsItem[] {
  return (items || []).slice(0, 20).map((item, index) => {
    const rawDate = item.pubDate || item.isoDate || new Date().toISOString();
    const description = stripHtml(
      item.contentSnippet ||
      (item as unknown as { summary?: string }).summary ||
      item.contentEncoded ||
      item.content ||
      ''
    ).slice(0, 250);

    return {
      id: item.guid || item.link || `${source.name}-${index}-${Date.now()}`,
      title: stripHtml(item.title || 'Sin título'),
      description,
      link: item.link || '#',
      pubDate: rawDate,
      formattedDate: formatDate(rawDate),
      source: source.name,
      sourceColor: source.color,
      badgeClass: source.badgeClass,
      imageUrl: extractImage(item as CustomItem & Record<string, unknown>),
    };
  });
}

async function fetchFeed(source: NewsSource): Promise<NewsItem[]> {
  const urlsToTry = [source.rssUrl, ...(source.fallbackUrls ?? [])];

  for (const url of urlsToTry) {
    try {
      const feed = await parser.parseURL(url);
      if (feed.items?.length) {
        console.log(`[RSS] OK "${source.name}" (${url}) — ${feed.items.length} items`);
        return mapItems(feed.items, source);
      }
    } catch (error) {
      console.warn(`[RSS] FAIL "${source.name}" (${url}): ${(error as Error).message}`);
    }
  }

  console.error(`[RSS] All URLs failed for "${source.name}"`);
  return [];
}

export async function fetchAllNews(): Promise<NewsItem[]> {
  const results = await Promise.allSettled(NEWS_SOURCES.map(fetchFeed));

  const allNews: NewsItem[] = [];
  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      allNews.push(...result.value);
    }
  });

  return allNews.sort((a, b) => {
    const tA = new Date(a.pubDate).getTime();
    const tB = new Date(b.pubDate).getTime();
    return (isNaN(tB) ? 0 : tB) - (isNaN(tA) ? 0 : tA);
  });
}
