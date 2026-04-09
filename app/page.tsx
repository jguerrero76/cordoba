import { fetchAllNews } from '@/lib/rss';
import StoryFeed from '@/components/StoryFeed';

export const revalidate = 300;

export default async function Home() {
  const news = await fetchAllNews();
  return <StoryFeed allNews={news} />;
}
