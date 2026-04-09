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

const parser = new Parser<Record<string, unknown>, CustomItem>({
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['content:encoded', 'contentEncoded'],
    ],
  },
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; CordobaNoticias/1.0; +https://github.com/jguerrero76/cordoba)',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
  },
});

export const NEWS_SOURCES: NewsSource[] = [
  {
    name: 'Diario Córdoba',
    rssUrl: 'https://www.diariocordoba.com/rss/',
    color: '#C41230',
    badgeClass: 'bg-red-700',
  },
  {
    name: 'El Día de Córdoba',
    rssUrl: 'https://eldiadecordoba.es/feed/',
    color: '#1A56DB',
    badgeClass: 'bg-blue-700',
  },
  {
    name: 'ABC Córdoba',
    rssUrl: 'https://www.abc.es/rss/feeds/abc_cordoba.xml',
    color: '#1E293B',
    badgeClass: 'bg-slate-800',
  },
  {
    name: 'Cordópolis',
    rssUrl: 'https://cordopolis.elespanol.com/rss/',
    color: '#6D28D9',
    badgeClass: 'bg-violet-700',
  },
  {
    name: 'La Voz de Córdoba',
    rssUrl: 'https://www.lavozdekordoba.com/feed/',
    color: '#047857',
    badgeClass: 'bg-emerald-700',
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

async function fetchFeed(source: NewsSource): Promise<NewsItem[]> {
  try {
    const feed = await parser.parseURL(source.rssUrl);
    return (feed.items || []).slice(0, 20).map((item, index) => {
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
  } catch (error) {
    console.error(`[RSS] Error fetching "${source.name}": ${(error as Error).message}`);
    return [];
  }
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
