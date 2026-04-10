'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { NewsItem, UserPrefs, DEFAULT_PREFS, ReadingHistory, StreakData } from '@/types/news';
import StoryCard from './StoryCard';
import SavedDrawer from './SavedDrawer';
import SettingsModal from './SettingsModal';
import StatsModal from './StatsModal';

const SEEN_KEY = 'cordoba_seen';
const SAVED_KEY = 'cordoba_saved';
const PREFS_KEY = 'cordoba_prefs';
const STATS_KEY = 'cordoba_stats';
const STREAK_KEY = 'cordoba_streak';
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [prefs, setPrefs] = useState<UserPrefs>(DEFAULT_PREFS);
  const [readingHistory, setReadingHistory] = useState<ReadingHistory>({});
  const [streakData, setStreakData] = useState<StreakData>({ count: 0, lastDate: '' });
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
  const displayedNewsRef = useRef<NewsItem[]>([]);

  // ── Hydrate from localStorage ──
  useEffect(() => {
    const seen = new Set<string>(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'));
    const saved = new Set<string>(JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'));
    const savedPrefs: UserPrefs = { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') };
    const history: ReadingHistory = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
    const streak: StreakData = JSON.parse(localStorage.getItem(STREAK_KEY) || '{"count":0,"lastDate":""}');
    setSavedIds(saved);
    setPrefs(savedPrefs);
    setReadingHistory(history);
    setStreakData(streak);
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

          // Mark as seen
          const seen = new Set<string>(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'));
          seen.add(id);
          localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));

          // Record read stat
          const item = displayedNewsRef.current[idx];
          if (item) {
            const todayKey = new Date().toISOString().split('T')[0];

            // Update history
            const history: ReadingHistory = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
            const day = history[todayKey] ?? { total: 0, sources: {} };
            day.total += 1;
            day.sources[item.source] = (day.sources[item.source] ?? 0) + 1;
            history[todayKey] = day;
            localStorage.setItem(STATS_KEY, JSON.stringify(history));
            setReadingHistory({ ...history });

            // Update streak (once per day)
            const streak: StreakData = JSON.parse(localStorage.getItem(STREAK_KEY) || '{"count":0,"lastDate":""}');
            if (streak.lastDate !== todayKey) {
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              const yesterdayKey = yesterday.toISOString().split('T')[0];
              streak.count = streak.lastDate === yesterdayKey ? streak.count + 1 : 1;
              streak.lastDate = todayKey;
              localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
              setStreakData({ ...streak });
            }
          }
        });
      },
      { root: containerRef.current, threshold: 0.6 }
    );

    containerRef.current.querySelectorAll('[data-index]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [visibleNews, prefs, ready]);

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

  // visibleNewsLengthRef is kept in sync with displayedNews below

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

  // Apply user preferences on top of the unseen list
  const displayedNews = useMemo(() => {
    return visibleNews.filter((n) => {
      if (prefs.hiddenSources.includes(n.source)) return false;
      if (prefs.onlyWithImage && !n.imageUrl) return false;
      return true;
    });
  }, [visibleNews, prefs]);

  // Keep refs in sync with displayedNews for touch handlers and stat tracking
  useEffect(() => {
    visibleNewsLengthRef.current = displayedNews.length;
    displayedNewsRef.current = displayedNews;
  }, [displayedNews]);

  const updatePrefs = useCallback((update: Partial<UserPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...update };
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

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

  if (displayedNews.length === 0) {
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
          style={{ width: `${((currentIndex + 1) / displayedNews.length) * 100}%` }}
        />
      </div>

      {/* Top-right buttons */}
      <div className="fixed top-3 right-4 z-50 flex items-center gap-2">
        {/* Stats */}
        <button
          onClick={() => setStatsOpen(true)}
          aria-label="Mis estadísticas"
          className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center active:scale-95 transition-transform"
        >
          <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </button>
        {/* Settings */}
        <button
          onClick={() => setSettingsOpen(true)}
          aria-label="Ajustes"
          className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center active:scale-95 transition-transform"
        >
          <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        {/* Saved */}
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Ver noticias guardadas"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/15 active:scale-95 transition-transform"
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
      </div>

      {/* Feed */}
      <div ref={containerRef} className="story-container">
        {displayedNews.map((item, index) => (
          <StoryCard
            key={item.id}
            item={item}
            index={index}
            isLast={index === displayedNews.length - 1}
            isSaved={savedIds.has(item.id)}
            onToggleSave={() => toggleSave(item.id)}
            textSize={prefs.textSize}
          />
        ))}
      </div>

      {/* Counter */}
      <div className="fixed bottom-5 left-4 z-50 pointer-events-none">
        <span className="text-white/40 text-xs tabular-nums">
          {currentIndex + 1} / {displayedNews.length}
        </span>
      </div>

      <SavedDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}
        savedItems={savedItems} onRemove={toggleSave} />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        prefs={prefs}
        onPrefsChange={updatePrefs}
        onResetSeen={resetSeen}
        readToday={allNews.length - visibleNews.length}
      />
      <StatsModal
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        history={readingHistory}
        streak={streakData}
        savedCount={savedItems.length}
      />
    </>
  );
}
