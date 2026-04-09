import { fetchAllNews } from '@/lib/rss';
import Header from '@/components/Header';
import FeaturedNews from '@/components/FeaturedNews';
import NewsContainer from '@/components/NewsContainer';
import Footer from '@/components/Footer';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Revalidate page every 5 minutes
export const revalidate = 300;

export default async function Home() {
  const news = await fetchAllNews();
  const today = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
  const featured = news.slice(0, 5);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      {/* Breaking news ticker */}
      {news.length > 0 && (
        <div className="bg-[#C41230] text-white overflow-hidden py-2 shrink-0">
          <div className="flex items-center gap-0">
            <span className="shrink-0 bg-[#C8A84B] text-gray-900 font-bold text-xs px-4 py-1 uppercase tracking-wider whitespace-nowrap z-10">
              Última hora
            </span>
            <div className="overflow-hidden flex-1">
              <div className="ticker-track">
                {[...news.slice(0, 12), ...news.slice(0, 12)].map((item, i) => (
                  <span key={`${item.id}-${i}`} className="inline-flex items-center">
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm px-6 hover:text-[#E5C76E] transition-colors whitespace-nowrap"
                    >
                      {item.title}
                    </a>
                    <span className="text-white/30 text-xs">·</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Date & stats bar */}
        <div className="flex items-center justify-between mb-8">
          <p className="text-gray-500 text-sm capitalize">{today}</p>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span>{news.length} noticias en directo</span>
          </div>
        </div>

        {/* Featured */}
        {featured.length > 0 && (
          <section className="mb-12">
            <FeaturedNews items={featured} />
          </section>
        )}

        {/* Divider */}
        <div className="border-t border-gray-200 mb-10" />

        {/* News grid */}
        <NewsContainer news={news} />
      </main>

      <Footer />
    </div>
  );
}
