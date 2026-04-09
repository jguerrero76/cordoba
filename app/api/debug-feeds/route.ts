import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { NEWS_SOURCES } from '@/lib/rss';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
  'Cache-Control': 'no-cache',
};

const parser = new Parser({ timeout: 12000, headers: HEADERS });

export const dynamic = 'force-dynamic';

export async function GET() {
  const results = await Promise.all(
    NEWS_SOURCES.map(async (source) => {
      const urlsToTry = [source.rssUrl, ...(source.fallbackUrls ?? [])];
      const urlResults: { url: string; status: string; itemCount?: number; firstItem?: unknown }[] = [];

      for (const url of urlsToTry) {
        try {
          const feed = await parser.parseURL(url);
          const count = feed.items?.length ?? 0;
          urlResults.push({
            url,
            status: 'OK',
            itemCount: count,
            firstItem: count > 0
              ? {
                  title: feed.items[0].title,
                  pubDate: feed.items[0].pubDate || feed.items[0].isoDate,
                  categories: feed.items[0].categories,
                }
              : null,
          });
          break; // stop at first working URL
        } catch (err) {
          urlResults.push({ url, status: `ERROR: ${(err as Error).message}` });
        }
      }

      return { source: source.name, trustedLocal: source.trustedLocal ?? false, urls: urlResults };
    })
  );

  return NextResponse.json({ timestamp: new Date().toISOString(), sources: results }, { status: 200 });
}
