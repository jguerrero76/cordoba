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
  // Refs for values read in event handlers (avoids stale closure with concurrent React)
  const pullDistanceRef = useRef(0);
  const visibleNewsLengthRef = useRef(0);

  // ── Hydrate from localStorage ──
  useEffect(() => {
    const seen = new Set<string>(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'));
    const saved = new Set<string>(JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'));
    setSavedIds(saved);
    const filtered = allNews.filter((n) => !seen.has(n.id));
    visibleNewsLengthRef.current = filtered.length;
    setVisibleNews(filtered);
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

  // Keep visibleNewsLengthRef in sync so touch handlers can read it without stale closure
  useEffect(() => {
    visibleNewsLengthRef.current = visibleNews.length;
  }, [visibleNews]);

  // ── Pull-to-refresh (touch only) ──
  // NOTE: pullDistance is intentionally NOT in deps — we use pullDistanceRef inside
  // handlers to avoid stale closures with React 19 concurrent rendering.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !ready) return;

    const onTouchStart = (e: TouchEvent) => {
      swipeStartY.current = e.touches[0].clientY;
      lastTouchY.current = e.touches[0].clientY;
      // Pull-down-to-refresh: only on first card when already at the top
      if (currentIndexRef.current === 0 && el.scrollTop <= 2) {
        touchStartY.current = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      lastTouchY.current = e.touches[0].clientY;
      if (touchStartY.current === null) return;
      const dy = e.touches[0].clientY - touchStartY.current;
      if (dy > 0) {
        const dist = Math.min(dy * 0.45, PULL_THRESHOLD * 1.2);
        pullDistanceRef.current = dist;
        setPullDistance(dist);
      }
    };

    const onTouchEnd = () => {
      const dy =
        swipeStartY.current !== null && lastTouchY.current !== null
          ? lastTouchY.current - swipeStartY.current
          : 0;
      const isOnLastCard =
        currentIndexRef.current === visibleNewsLengthRef.current - 1;

      // Swipe-up on last card → refresh (same as pull-to-refresh)
      if (dy < -60 && isOnLastCard) {
        setRefreshing(true);
        router.refresh();
        setTimeout(() => setRefreshing(false), 1800);
      } else if (dy < -30 && !isOnLastCard) {
        // Swiping to next card → brief loading overlay
        setTransitioning(true);
        setTimeout(() => setTransitioning(false), 800);
      }

      swipeStartY.current = null;
      lastTouchY.current = null;

      // Pull-down-to-refresh from first card
      if (touchStartY.current !== null) {
        if (pullDistanceRef.current >= PULL_THRESHOLD) {
          setRefreshing(true);
          router.refresh();
          setTimeout(() => setRefreshing(false), 1800);
        }
        pullDistanceRef.current = 0;
        setPullDistance(0);
        touchStartY.current = null;
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [ready, router]);

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
    visibleNewsLengthRef.current = allNews.length;
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
    const readToday = allNews.length;
    const isEmpty = readToday === 0;

    return (
      <>
        <div className="story-frame bg-black flex flex-col overflow-hidden relative">
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-yellow-400/8 blur-3xl" />
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            {/* Icon */}
            <div className="relative mb-7">
              <div className="w-28 h-28 rounded-full bg-yellow-400/10 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-yellow-400/15 flex items-center justify-center">
                  {isEmpty ? (
                    <svg className="w-9 h-9 text-yellow-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                  ) : (
                    <svg className="w-9 h-9 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
              </div>
              {!isEmpty && (
                <span className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-black text-[10px] font-black">
                  ✓
                </span>
              )}
            </div>

            {/* Heading */}
            <h1 className="text-white text-3xl font-black mb-2">
              {isEmpty ? 'Sin noticias aún' : '¡Al día!'}
            </h1>
            <p className="text-white/45 text-sm leading-relaxed mb-8 max-w-xs">
              {isEmpty
                ? 'No hay noticias de Córdoba publicadas hoy todavía.\nVuelve más tarde.'
                : 'Has leído todas las noticias disponibles de hoy. Las nuevas noticias aparecen cada pocos minutos.'}
            </p>

            {/* Stats card */}
            {!isEmpty && (
              <div className="w-full max-w-xs bg-white/5 border border-white/10 rounded-2xl p-4 mb-7 flex items-center justify-around">
                <div className="text-center">
                  <p className="text-yellow-400 text-2xl font-black">{readToday}</p>
                  <p className="text-white/35 text-[11px] mt-0.5">leídas hoy</p>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <p className="text-yellow-400 text-2xl font-black">{savedItems.length}</p>
                  <p className="text-white/35 text-[11px] mt-0.5">guardadas</p>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <p className="text-yellow-400 text-2xl font-black">5'</p>
                  <p className="text-white/35 text-[11px] mt-0.5">refresco</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3 w-full max-w-xs">
              {/* Primary: refresh */}
              <button
                onClick={() => router.refresh()}
                className="w-full py-4 bg-yellow-400 text-black rounded-2xl font-bold text-base active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-lg shadow-yellow-400/20"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Buscar nuevas noticias
              </button>

              {/* Secondary: saved */}
              {savedItems.length > 0 && (
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="w-full py-3.5 bg-white/8 border border-white/12 text-white rounded-2xl font-semibold text-sm active:scale-95 transition-transform flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  Ver guardadas ({savedItems.length})
                </button>
              )}

              {/* Tertiary: reset */}
              {!isEmpty && (
                <button
                  onClick={resetSeen}
                  className="w-full py-3 text-white/30 text-sm font-medium active:text-white/60 transition-colors"
                >
                  Volver a leer todo
                </button>
              )}
            </div>
          </div>

          {/* Bottom hint */}
          <p className="text-white/20 text-xs text-center pb-8">
            Desliza hacia abajo desde el inicio para refrescar
          </p>
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
