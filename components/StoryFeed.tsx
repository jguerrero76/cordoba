'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { NewsItem } from '@/types/news';
import StoryCard from './StoryCard';
import SavedDrawer from './SavedDrawer';

const SEEN_KEY = 'cordoba_seen';
const SAVED_KEY = 'cordoba_saved';

interface Props {
  allNews: NewsItem[];
}

export default function StoryFeed({ allNews }: Props) {
  const [visibleNews, setVisibleNews] = useState<NewsItem[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Hydrate from localStorage
  useEffect(() => {
    const seen = new Set<string>(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'));
    const saved = new Set<string>(JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'));
    setSavedIds(saved);
    setVisibleNews(allNews.filter((n) => !seen.has(n.id)));
    setReady(true);
  }, [allNews]);

  // Track visible card + mark as seen via IntersectionObserver
  useEffect(() => {
    if (!ready || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const idx = Number(entry.target.getAttribute('data-index'));
          const id = entry.target.getAttribute('data-id') ?? '';
          setCurrentIndex(idx);
          const seen = new Set<string>(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'));
          seen.add(id);
          localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
        });
      },
      { root: containerRef.current, threshold: 0.6 }
    );

    containerRef.current.querySelectorAll('[data-index]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [visibleNews, ready]);

  const toggleSave = useCallback((id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem(SAVED_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  // Build the saved items list from allNews (preserves full article data)
  const savedItems = useMemo(
    () => allNews.filter((n) => savedIds.has(n.id)),
    [allNews, savedIds]
  );

  const resetSeen = () => {
    localStorage.removeItem(SEEN_KEY);
    setVisibleNews(allNews);
    setCurrentIndex(0);
    containerRef.current?.scrollTo({ top: 0 });
  };

  if (!ready) {
    return (
      <div className="story-frame bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (visibleNews.length === 0) {
    return (
      <>
        <div className="story-frame bg-black flex flex-col items-center justify-center gap-6 px-8 text-center">
          <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-white text-2xl font-bold mb-2">¡Al día!</p>
            <p className="text-white/50 text-sm">Has visto todas las noticias disponibles.</p>
            <p className="text-white/40 text-sm mt-1">Vuelve más tarde para nuevas noticias.</p>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            {savedItems.length > 0 && (
              <button
                onClick={() => setDrawerOpen(true)}
                className="px-8 py-3 bg-yellow-400 text-black rounded-full font-semibold text-sm active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                Ver guardadas ({savedItems.length})
              </button>
            )}
            <button
              onClick={resetSeen}
              className="px-8 py-3 bg-white text-black rounded-full font-semibold text-sm active:scale-95 transition-transform"
            >
              Volver a ver todo
            </button>
          </div>
        </div>

        <SavedDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          savedItems={savedItems}
          onRemove={toggleSave}
        />
      </>
    );
  }

  return (
    <>
      {/* Top progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-white/15 pointer-events-none">
        <div
          className="h-full bg-white transition-all duration-300 ease-out"
          style={{ width: `${((currentIndex + 1) / visibleNews.length) * 100}%` }}
        />
      </div>

      {/* Saved articles button (top-right) */}
      <button
        onClick={() => setDrawerOpen(true)}
        aria-label="Ver noticias guardadas"
        className="fixed top-3 right-4 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/15 active:scale-95 transition-transform"
      >
        <svg
          className={`w-4 h-4 ${savedItems.length > 0 ? 'text-yellow-400' : 'text-white/50'}`}
          fill={savedItems.length > 0 ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
        {savedItems.length > 0 && (
          <span className="text-yellow-400 text-xs font-bold tabular-nums">{savedItems.length}</span>
        )}
      </button>

      {/* Story feed */}
      <div ref={containerRef} className="story-container">
        {visibleNews.map((item, index) => (
          <StoryCard
            key={item.id}
            item={item}
            index={index}
            isFirst={index === 0}
            isSaved={savedIds.has(item.id)}
            onToggleSave={() => toggleSave(item.id)}
          />
        ))}
      </div>

      {/* Counter */}
      <div className="fixed bottom-5 left-4 z-50 pointer-events-none">
        <span className="text-white/40 text-xs tabular-nums">
          {currentIndex + 1} / {visibleNews.length}
        </span>
      </div>

      {/* Saved drawer */}
      <SavedDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        savedItems={savedItems}
        onRemove={toggleSave}
      />
    </>
  );
}
