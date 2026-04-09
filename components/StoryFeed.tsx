'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { NewsItem } from '@/types/news';
import StoryCard from './StoryCard';
import SavedDrawer from './SavedDrawer';

const SEEN_KEY = 'cordoba_seen';
const SAVED_KEY = 'cordoba_saved';
const PULL_THRESHOLD = 75; // px needed to trigger refresh

interface Props {
  allNews: NewsItem[];
}

export default function StoryFeed({ allNews }: Props) {
  const router = useRouter();
  const [visibleNews, setVisibleNews] = useState<NewsItem[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  // Ref keeps currentIndex accessible in event handlers without stale closure
  const currentIndexRef = useRef(0);
  const touchStartY = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);
  const lastTouchY = useRef<number | null>(null);

  // ── Hydrate from localStorage ──
  useEffect(() => {
    const seen = new Set<string>(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'));
    const saved = new Set<string>(JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'));
    setSavedIds(saved);
    setVisibleNews(allNews.filter((n) => !seen.has(n.id)));
    setReady(true);
  }, [allNews]);

  // ── Track visible card + mark as seen ──
  useEffect(() => {
    if (!ready || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const idx = Number(entry.target.getAttribute('data-index'));
          const id = entry.target.getAttribute('data-id') ?? '';
          currentIndexRef.current = idx;
          setCurrentIndex(idx);
          setTransitioning(false);
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

  // ── Prevent scrolling back to already-seen cards ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => {
      const minTop = currentIndexRef.current * el.clientHeight;
      if (el.scrollTop < minTop - 4) {
        // Snap back instantly — no animation so the user doesn't see a jump
        el.scrollTop = minTop;
      }
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [ready]);

  // ── Pull-to-refresh (touch only) ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      swipeStartY.current = e.touches[0].clientY;
      lastTouchY.current = e.touches[0].clientY;
      // Only active on first card when already at the top
      if (currentIndexRef.current === 0 && el.scrollTop <= 2) {
        touchStartY.current = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      lastTouchY.current = e.touches[0].clientY;
      if (touchStartY.current === null) return;
      const dy = e.touches[0].clientY - touchStartY.current;
      if (dy > 0) {
        // Resist the pull with a dampening factor so it feels elastic
        setPullDistance(Math.min(dy * 0.45, PULL_THRESHOLD * 1.2));
      }
    };

    const onTouchEnd = () => {
      // Detect upward swipe → show transition loading indicator
      if (swipeStartY.current !== null && lastTouchY.current !== null) {
        const dy = lastTouchY.current - swipeStartY.current;
        if (dy < -30) {
          setTransitioning(true);
          // Safety fallback in case IntersectionObserver doesn't fire
          setTimeout(() => setTransitioning(false), 800);
        }
      }
      swipeStartY.current = null;
      lastTouchY.current = null;

      if (touchStartY.current === null) return;
      if (pullDistance >= PULL_THRESHOLD) {
        setRefreshing(true);
        setPullDistance(0);
        router.refresh();
        // Hide the refreshing indicator after a moment
        setTimeout(() => setRefreshing(false), 1800);
      } else {
        setPullDistance(0);
      }
      touchStartY.current = null;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [pullDistance, ready, router]);

  const toggleSave = useCallback((id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem(SAVED_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const savedItems = useMemo(
    () => allNews.filter((n) => savedIds.has(n.id)),
    [allNews, savedIds]
  );

  const resetSeen = () => {
    localStorage.removeItem(SEEN_KEY);
    setVisibleNews(allNews);
    currentIndexRef.current = 0;
    setCurrentIndex(0);
    if (containerRef.current) containerRef.current.scrollTop = 0;
  };

  // ── Pull indicator ──
  const pullProgress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const circumference = 2 * Math.PI * 10; // circle r=10

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
            <p className="text-white/40 text-sm mt-1">Desliza hacia abajo para buscar nuevas noticias.</p>
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
        <SavedDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}
          savedItems={savedItems} onRemove={toggleSave} />
      </>
    );
  }

  return (
    <>
      {/* Pull-to-refresh indicator */}
      <div
        className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center pointer-events-none transition-all duration-150"
        style={{ transform: `translateY(${pullDistance > 0 ? pullDistance - 28 : -28}px)` }}
      >
        {refreshing ? (
          <div className="w-7 h-7 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        ) : (
          <svg width="28" height="28" viewBox="0 0 28 28">
            <circle cx="14" cy="14" r="10" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" />
            <circle
              cx="14" cy="14" r="10"
              fill="none" stroke="white" strokeWidth="2.5"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - pullProgress)}
              strokeLinecap="round"
              transform="rotate(-90 14 14)"
            />
          </svg>
        )}
        {!refreshing && pullProgress >= 1 && (
          <span className="text-white/70 text-[10px] mt-1">Suelta para actualizar</span>
        )}
      </div>

      {/* Card transition loading overlay */}
      {transitioning && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none">
          <div className="w-9 h-9 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-white/50 text-xs mt-3 tracking-wide">Cargando noticia...</p>
        </div>
      )}

      {/* Top progress bar */}
      <div className="fixed top-0 left-0 right-0 z-40 h-0.5 bg-white/15 pointer-events-none">
        <div
          className="h-full bg-white transition-all duration-300 ease-out"
          style={{ width: `${((currentIndex + 1) / visibleNews.length) * 100}%` }}
        />
      </div>

      {/* Saved button */}
      <button
        onClick={() => setDrawerOpen(true)}
        aria-label="Ver noticias guardadas"
        className="fixed top-3 right-4 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/15 active:scale-95 transition-transform"
      >
        <svg
          className={`w-4 h-4 ${savedItems.length > 0 ? 'text-yellow-400' : 'text-white/50'}`}
          fill={savedItems.length > 0 ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
        {savedItems.length > 0 && (
          <span className="text-yellow-400 text-xs font-bold tabular-nums">{savedItems.length}</span>
        )}
      </button>

      {/* Feed */}
      <div ref={containerRef} className="story-container">
        {visibleNews.map((item, index) => (
          <StoryCard
            key={item.id}
            item={item}
            index={index}
            isLast={index === visibleNews.length - 1}
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

      <SavedDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}
        savedItems={savedItems} onRemove={toggleSave} />
    </>
  );
}
