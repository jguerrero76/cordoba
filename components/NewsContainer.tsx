'use client';

import { useState, useMemo } from 'react';
import { NewsItem } from '@/types/news';
import NewsCard from './NewsCard';

interface Props {
  news: NewsItem[];
}

const ITEMS_PER_PAGE = 12;

export default function NewsContainer({ news }: Props) {
  const [activeSource, setActiveSource] = useState('Todas');
  const [page, setPage] = useState(1);

  const sources = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = ['Todas'];
    news.forEach((n) => {
      if (!seen.has(n.source)) {
        seen.add(n.source);
        list.push(n.source);
      }
    });
    return list;
  }, [news]);

  const sourceColors = useMemo(() => {
    const map: Record<string, string> = {};
    news.forEach((n) => { map[n.source] = n.sourceColor; });
    return map;
  }, [news]);

  const filtered = useMemo(() => {
    const base = activeSource === 'Todas' ? news.slice(5) : news.filter((n) => n.source === activeSource);
    return base;
  }, [news, activeSource]);

  const visible = filtered.slice(0, page * ITEMS_PER_PAGE);
  const hasMore = visible.length < filtered.length;

  const handleFilter = (source: string) => {
    setActiveSource(source);
    setPage(1);
  };

  return (
    <section>
      {/* Section heading */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="h-6 w-1 rounded-full bg-[#7A1525]" />
          <h2 className="font-display text-xl font-bold text-gray-900">Últimas Noticias</h2>
        </div>
        <span className="text-sm text-gray-400 hidden sm:block">{filtered.length} artículos</span>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide -mx-1 px-1">
        {sources.map((source) => {
          const isActive = source === activeSource;
          const color = source !== 'Todas' ? sourceColors[source] : undefined;
          return (
            <button
              key={source}
              onClick={() => handleFilter(source)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
                isActive
                  ? 'text-white shadow-sm border-transparent'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
              }`}
              style={isActive ? { backgroundColor: color ?? '#7A1525', borderColor: color ?? '#7A1525' } : {}}
            >
              {source}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {visible.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          </div>
          <p className="font-medium text-gray-500">No hay noticias disponibles ahora mismo.</p>
          <p className="text-sm mt-1">Vuelve a intentarlo en unos minutos.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visible.map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}
          </div>

          {hasMore && (
            <div className="text-center mt-10">
              <button
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-2 px-8 py-3 bg-[#7A1525] text-white rounded-full font-medium hover:bg-[#9B1B30] transition-colors shadow-sm"
              >
                <span>Cargar más noticias</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
