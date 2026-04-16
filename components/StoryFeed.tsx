'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { NewsItem, UserPrefs, DEFAULT_PREFS, ReadingHistory, StreakData } from '@/types/news';
import StoryCard from './StoryCard';
import SavedDrawer from './SavedDrawer';
import SettingsModal from './SettingsModal';
import StatsModal from './StatsModal';

const SEEN_KEY        = 'cordoba_seen';
const SAVED_KEY       = 'cordoba_saved';
const SAVED_ITEMS_KEY = 'cordoba_saved_items'; // full NewsItem data for saved articles (persists across days)
const PREFS_KEY       = 'cordoba_prefs';
const STATS_KEY       = 'cordoba_stats';
const STREAK_KEY      = 'cordoba_streak';
const PULL_THRESHOLD  = 75; // px needed to trigger refresh

// Wikimedia Commons — public-domain photos of Córdoba landmarks
const CORDOBA_IMAGES = [
  // Mezquita-Catedral interior: Diego Delso, CC BY-SA
  'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Mosque_Cathedral_of_Cordoba_2013_002.jpg/960px-Mosque_Cathedral_of_Cordoba_2013_002.jpg',
  // Puente Romano panorama: Ángel M. Felicísimo, CC BY
  'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/C%C3%B3rdoba_%285961773085%29.jpg/960px-C%C3%B3rdoba_%285961773085%29.jpg',
  // Patio de los Naranjos: Emilio J. Rodríguez Posada, CC BY-SA
  'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Patio_de_los_naranjos_C%C3%B3rdoba.jpg/960px-Patio_de_los_naranjos_C%C3%B3rdoba.jpg',
  // Medina Azahara: Álvaro Ibáñez, CC BY-SA
  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Medina_Azahara%2C_C%C3%B3rdoba.jpg/960px-Medina_Azahara%2C_C%C3%B3rdoba.jpg',
  // Alcázar de los Reyes Cristianos: Jl FilpoC, CC BY-SA
  'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Alc%C3%A1zar_de_C%C3%B3rdoba_-_Jard%C3%ADn.jpg/960px-Alc%C3%A1zar_de_C%C3%B3rdoba_-_Jard%C3%ADn.jpg',
];

interface WeatherData {
  temp: number;
  feelsLike: number;
  code: number;
  maxTemp: number;
  minTemp: number;
}

function weatherInfo(code: number): { emoji: string; label: string } {
  if (code === 0)  return { emoji: '☀️',  label: 'Despejado' };
  if (code <= 2)   return { emoji: '🌤️',  label: 'Poco nublado' };
  if (code === 3)  return { emoji: '☁️',  label: 'Nublado' };
  if (code <= 48)  return { emoji: '🌫️',  label: 'Niebla' };
  if (code <= 57)  return { emoji: '🌦️',  label: 'Llovizna' };
  if (code <= 67)  return { emoji: '🌧️',  label: 'Lluvia' };
  if (code <= 77)  return { emoji: '❄️',   label: 'Nieve' };
  if (code <= 82)  return { emoji: '🌦️',  label: 'Chubascos' };
  return              { emoji: '⛈️',  label: 'Tormenta' };
}

const FEED_CATEGORIES = [
  { id: 'all',      label: 'Todas'    },
  { id: 'deportes', label: 'Deportes' },
  { id: 'politica', label: 'Política' },
  { id: 'sucesos',  label: 'Sucesos'  },
  { id: 'cultura',  label: 'Cultura'  },
  { id: 'economia', label: 'Economía' },
  { id: 'otros',    label: 'Otros'    },
];

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
  const [activeCategory, setActiveCategory] = useState('all');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [cordobaImage, setCordobaImage] = useState(
    () => CORDOBA_IMAGES[Math.floor(Math.random() * CORDOBA_IMAGES.length)]
  );
  const [imageError, setImageError] = useState(false);
  const [prefs, setPrefs] = useState<UserPrefs>(DEFAULT_PREFS);
  const [readingHistory, setReadingHistory] = useState<ReadingHistory>({});
  const [streakData, setStreakData] = useState<StreakData>({ count: 0, lastDate: '' });
  // Persisted full item data so saved articles survive across days
  const [savedItemsMap, setSavedItemsMap] = useState<Record<string, NewsItem>>({});
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [noNewNews, setNoNewNews] = useState(false);
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
  const allNewsRef = useRef(allNews);
  const hasAutoRefreshed = useRef(false);

  // ── Hydrate from localStorage ──
  useEffect(() => {
    const seen = new Set<string>(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'));
    const saved = new Set<string>(JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'));
    const savedItemsData: Record<string, NewsItem> = JSON.parse(localStorage.getItem(SAVED_ITEMS_KEY) || '{}');
    const savedPrefs: UserPrefs = { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') };
    const history: ReadingHistory = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
    const streak: StreakData = JSON.parse(localStorage.getItem(STREAK_KEY) || '{"count":0,"lastDate":""}');
    // Merge: today's articles take priority over persisted data (fresher imageUrl etc.)
    allNews.forEach((n) => { if (saved.has(n.id)) savedItemsData[n.id] = n; });
    setSavedIds(saved);
    setSavedItemsMap(savedItemsData);
    setPrefs(savedPrefs);
    setReadingHistory(history);
    setStreakData(streak);
    const filtered = allNews.filter((n) => !seen.has(n.id));
    visibleNewsLengthRef.current = filtered.length;
    setVisibleNews(filtered);
    setReady(true);
  }, [allNews]);

  // Keep allNewsRef in sync for callbacks
  useEffect(() => { allNewsRef.current = allNews; }, [allNews]);

  // ── Fetch Córdoba weather once on mount ──
  useEffect(() => {
    fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=37.8882&longitude=-4.7794' +
      '&current=temperature_2m,weather_code,apparent_temperature' +
      '&daily=temperature_2m_max,temperature_2m_min' +
      '&timezone=Europe%2FMadrid&forecast_days=1'
    )
      .then((r) => r.json())
      .then((data: { current: { temperature_2m: number; weather_code: number; apparent_temperature: number }; daily: { temperature_2m_max: number[]; temperature_2m_min: number[] } }) => {
        setWeather({
          temp: Math.round(data.current.temperature_2m),
          feelsLike: Math.round(data.current.apparent_temperature),
          code: data.current.weather_code,
          maxTemp: Math.round(data.daily.temperature_2m_max[0]),
          minTemp: Math.round(data.daily.temperature_2m_min[0]),
        });
      })
      .catch(() => {});
  }, []);

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
            const day = history[todayKey] ?? { total: 0, reads: 0, sources: {} };
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
  }, [visibleNews, prefs, ready, activeCategory]);

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

  const toggleSave = useCallback((item: NewsItem) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
        setSavedItemsMap((m) => {
          const nm = { ...m };
          delete nm[item.id];
          localStorage.setItem(SAVED_ITEMS_KEY, JSON.stringify(nm));
          return nm;
        });
      } else {
        next.add(item.id);
        setSavedItemsMap((m) => {
          const nm = { ...m, [item.id]: item };
          localStorage.setItem(SAVED_ITEMS_KEY, JSON.stringify(nm));
          return nm;
        });
      }
      localStorage.setItem(SAVED_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const recordReadClick = useCallback((item: NewsItem) => {
    const todayKey = new Date().toISOString().split('T')[0];
    const history: ReadingHistory = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
    const day = history[todayKey] ?? { total: 0, reads: 0, sources: {} };
    day.reads = (day.reads ?? 0) + 1;
    history[todayKey] = day;
    localStorage.setItem(STATS_KEY, JSON.stringify(history));
    setReadingHistory({ ...history });
  }, []);

  // Saved items come from the persistent map — works across days
  const savedItems = useMemo(
    () => Object.values(savedItemsMap).filter((n) => savedIds.has(n.id)),
    [savedItemsMap, savedIds]
  );

  // Apply user preferences (source toggles, image filter)
  const filteredByPrefs = useMemo(() =>
    visibleNews.filter((n) => {
      if (prefs.hiddenSources.includes(n.source)) return false;
      if (prefs.onlyWithImage && !n.imageUrl) return false;
      return true;
    }),
  [visibleNews, prefs]);

  // Also apply active category filter
  const displayedNews = useMemo(() =>
    activeCategory === 'all'
      ? filteredByPrefs
      : filteredByPrefs.filter((n) => n.category === activeCategory),
  [filteredByPrefs, activeCategory]);

  // Article counts per category (based on prefs-filtered list, before category filter)
  const categoryCounts = useMemo(() => {
    const c: Record<string, number> = { all: filteredByPrefs.length };
    filteredByPrefs.forEach((n) => { c[n.category] = (c[n.category] ?? 0) + 1; });
    return c;
  }, [filteredByPrefs]);

  // Keep refs in sync with displayedNews for touch handlers and stat tracking
  useEffect(() => {
    visibleNewsLengthRef.current = displayedNews.length;
    displayedNewsRef.current = displayedNews;
  }, [displayedNews]);

  // Pick a new (different) random Córdoba image each time the empty state appears
  useEffect(() => {
    if (displayedNews.length !== 0) return;
    setCordobaImage((prev) => {
      const others = CORDOBA_IMAGES.filter((img) => img !== prev);
      return others[Math.floor(Math.random() * others.length)];
    });
    setImageError(false);
  }, [displayedNews.length]);

  // Reset scroll position when category changes
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.scrollTop = 0;
    currentIndexRef.current = 0;
    setCurrentIndex(0);
  }, [activeCategory]);

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

  const markAllSeen = () => {
    const seen = new Set<string>(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'));
    allNews.forEach((n) => seen.add(n.id));
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
    visibleNewsLengthRef.current = 0;
    setVisibleNews([]);
    currentIndexRef.current = 0;
    setCurrentIndex(0);
    if (containerRef.current) containerRef.current.scrollTop = 0;
    hasAutoRefreshed.current = false; // allow auto-refresh on next empty-state visit
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setNoNewNews(false);
    router.refresh();
    setTimeout(() => {
      setRefreshing(false);
      const seen = new Set<string>(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'));
      const hasNew = allNewsRef.current.some((n) => !seen.has(n.id));
      if (!hasNew) {
        setNoNewNews(true);
        setTimeout(() => setNoNewNews(false), 4000);
      }
    }, 2500);
  }, [router]);

  // ── Auto-refresh once when the empty state is first reached ──
  useEffect(() => {
    if (!ready || displayedNews.length > 0 || hasAutoRefreshed.current) return;
    hasAutoRefreshed.current = true;
    setRefreshing(true);
    router.refresh();
    setTimeout(() => {
      setRefreshing(false);
      const seen = new Set<string>(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'));
      const hasNew = allNewsRef.current.some((n) => !seen.has(n.id));
      if (!hasNew) {
        setNoNewNews(true);
        setTimeout(() => setNoNewNews(false), 4000);
      }
    }, 2500);
  }, [ready, displayedNews.length, router]);

  // ── Pull indicator ──
  const pullProgress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const circumference = 2 * Math.PI * 10; // circle r=10

  // ── Category filter chips (reused in multiple render paths) ──
  const chipsBar = (
    <div
      className="fixed left-0 right-0 z-40 flex gap-2 px-4 overflow-x-auto no-scrollbar pb-1"
      style={{ top: '52px' }}
    >
      {FEED_CATEGORIES.map((cat) => {
        const count = categoryCounts[cat.id] ?? 0;
        if (cat.id !== 'all' && count === 0) return null;
        return (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
              activeCategory === cat.id
                ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/30'
                : 'bg-black/55 backdrop-blur-md border border-white/20 text-white/70'
            }`}
          >
            {cat.label}
            {cat.id !== 'all' && (
              <span className={`ml-1 tabular-nums ${activeCategory === cat.id ? 'text-black/60' : 'text-white/35'}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  if (!ready) {
    return (
      <div className="story-frame bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // Category selected but no articles match — show simple message with chips
  if (displayedNews.length === 0 && activeCategory !== 'all' && filteredByPrefs.length > 0) {
    return (
      <>
        {chipsBar}
        <div className="story-frame bg-black flex flex-col items-center justify-center gap-5 px-6 text-center">
          <p className="text-white/50 text-sm">
            No hay noticias de <span className="text-white font-semibold">{FEED_CATEGORIES.find((c) => c.id === activeCategory)?.label}</span> publicadas hoy
          </p>
          <button
            onClick={() => setActiveCategory('all')}
            className="px-5 py-2.5 bg-yellow-400 text-black rounded-full text-sm font-bold active:scale-95 transition-transform"
          >
            Ver todas
          </button>
        </div>
      </>
    );
  }

  if (displayedNews.length === 0) {
    const todayKey = new Date().toISOString().split('T')[0];
    const viewsToday   = readingHistory[todayKey]?.total ?? 0;
    const readsToday   = readingHistory[todayKey]?.reads ?? 0;
    const totalViews   = Object.values(readingHistory).reduce((s, d) => s + d.total, 0);
    const activeDays   = Object.keys(readingHistory).length;
    const isEmpty      = allNews.length === 0;
    const { emoji, label } = weather ? weatherInfo(weather.code) : { emoji: '🌡️', label: '' };

    return (
      <>
        <div className="story-frame bg-black flex flex-col overflow-hidden">

          {/* ── Sin noticias aún ── */}
          {isEmpty ? (
            <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-6">
              <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                <svg className="w-9 h-9 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
              <div>
                <h1 className="text-white text-2xl font-black mb-2">Sin noticias aún</h1>
                <p className="text-white/40 text-sm leading-relaxed max-w-xs">
                  No hay noticias de Córdoba publicadas hoy todavía. Vuelve más tarde.
                </p>
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-6 py-3 bg-yellow-400 text-black rounded-2xl font-bold text-sm active:scale-95 transition-transform disabled:opacity-70 flex items-center gap-2"
              >
                {refreshing && <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />}
                {refreshing ? 'Buscando...' : 'Buscar nuevas noticias'}
              </button>
            </div>
          ) : (
            <>
              {/* ── Hero image ── */}
              <div className="relative shrink-0 overflow-hidden" style={{ height: '52vw', maxHeight: '260px' }}>
                {/* Auto-refresh progress bar */}
                {refreshing && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 z-10 overflow-hidden">
                    <div className="h-full bg-yellow-400 animate-pulse w-full" />
                  </div>
                )}
                {imageError ? (
                  <div className="w-full h-full" style={{
                    background: 'linear-gradient(160deg, #1a0a00 0%, #7c2d00 35%, #c2410c 60%, #f59e0b 85%, #fde68a 100%)',
                  }}>
                    <svg viewBox="0 0 400 200" className="absolute bottom-0 w-full" fill="#111" preserveAspectRatio="xMidYMax slice">
                      <path d="M0 200 L0 140 Q50 80 100 140 L100 200Z"/>
                      <path d="M90 200 L90 150 Q140 90 190 150 L190 200Z"/>
                      <path d="M180 200 L180 150 Q230 90 280 150 L280 200Z"/>
                      <path d="M270 200 L270 140 Q320 80 370 140 L370 200Z"/>
                      <rect x="0" y="195" width="400" height="10"/>
                    </svg>
                  </div>
                ) : (
                  <img
                    src={cordobaImage}
                    alt="Córdoba"
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black" />
                <div className="absolute bottom-4 left-5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg shadow-yellow-400/30">
                    <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-white text-2xl font-black leading-none drop-shadow-lg">¡Al día!</h1>
                    <p className="text-white/65 text-xs mt-0.5 drop-shadow">
                      {refreshing ? 'Buscando nuevas noticias…' : 'Has visto todas las noticias de hoy'}
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Scrollable content ── */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">

                {/* Weather */}
                {weather && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-white/35 text-[10px] font-semibold uppercase tracking-widest mb-2">Córdoba ahora</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-white text-4xl font-black">{weather.temp}°</span>
                        <span className="text-white/50 text-sm">{label}</span>
                      </div>
                      <p className="text-white/30 text-xs mt-1.5">
                        Sensación {weather.feelsLike}° · Máx {weather.maxTemp}° · Mín {weather.minTemp}°
                      </p>
                    </div>
                    <span className="text-5xl">{emoji}</span>
                  </div>
                )}

                {/* Today's stats */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-white/35 text-[10px] font-semibold uppercase tracking-widest mb-3">Hoy</p>
                  <div className="flex items-center justify-around">
                    <div className="text-center">
                      <p className="text-yellow-400 text-2xl font-black">{viewsToday}</p>
                      <p className="text-white/35 text-[11px] mt-0.5">vistas</p>
                    </div>
                    <div className="w-px h-8 bg-white/10" />
                    <div className="text-center">
                      <p className="text-yellow-400 text-2xl font-black">{readsToday}</p>
                      <p className="text-white/35 text-[11px] mt-0.5">leídas</p>
                    </div>
                    <div className="w-px h-8 bg-white/10" />
                    <div className="text-center">
                      <p className="text-yellow-400 text-2xl font-black">{savedItems.length}</p>
                      <p className="text-white/35 text-[11px] mt-0.5">guardadas</p>
                    </div>
                  </div>

                  {/* Historical totals */}
                  {activeDays > 0 && (
                    <>
                      <div className="border-t border-white/8 mt-4 pt-3">
                        <p className="text-white/35 text-[10px] font-semibold uppercase tracking-widest mb-3">Total histórico</p>
                        <div className="flex items-center justify-around">
                          <div className="text-center">
                            <p className="text-white/70 text-xl font-black">{totalViews}</p>
                            <p className="text-white/30 text-[10px] mt-0.5">noticias vistas</p>
                          </div>
                          <div className="w-px h-7 bg-white/10" />
                          <div className="text-center">
                            <p className="text-white/70 text-xl font-black">{streakData.count}</p>
                            <p className="text-white/30 text-[10px] mt-0.5">días de racha 🔥</p>
                          </div>
                          <div className="w-px h-7 bg-white/10" />
                          <div className="text-center">
                            <p className="text-white/70 text-xl font-black">{activeDays}</p>
                            <p className="text-white/30 text-[10px] mt-0.5">días activo</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* No-new-news toast (inline) */}
                {noNewNews && (
                  <div className="bg-white/8 border border-white/15 rounded-2xl px-4 py-3 text-center">
                    <p className="text-white/60 text-sm">No hay nuevas noticias aún. Vuelve en unos minutos.</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="w-full py-4 bg-yellow-400 text-black rounded-2xl font-bold text-base active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-lg shadow-yellow-400/20 disabled:opacity-70"
                  >
                    {refreshing ? (
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round"
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                    {refreshing ? 'Buscando...' : 'Buscar nuevas noticias'}
                  </button>

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

                  <button
                    onClick={resetSeen}
                    className="w-full py-3 text-white/30 text-sm font-medium active:text-white/60 transition-colors"
                  >
                    Volver a leer todo
                  </button>
                </div>

                <div className="h-4" />
              </div>
            </>
          )}
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
        {/* Mark all seen */}
        <button
          onClick={markAllSeen}
          aria-label="Marcar todas como vistas"
          className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center active:scale-95 transition-transform"
        >
          <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
          </svg>
        </button>
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

      {/* Category chips */}
      {chipsBar}

      {/* Feed */}
      <div ref={containerRef} className="story-container">
        {displayedNews.map((item, index) => (
          <StoryCard
            key={item.id}
            item={item}
            index={index}
            isLast={index === displayedNews.length - 1}
            isSaved={savedIds.has(item.id)}
            onToggleSave={() => toggleSave(item)}
            onRead={() => recordReadClick(item)}
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
