'use client';

import { useMemo } from 'react';
import { ReadingHistory, StreakData } from '@/types/news';

const SOURCE_COLORS: Record<string, string> = {
  'Diario Córdoba':    '#C41230',
  'El Día de Córdoba': '#1D4ED8',
  'Cordópolis':        '#D97706',
  'La Voz de Córdoba': '#047857',
  'Córdoba Hoy':       '#B45309',
};

interface Props {
  open: boolean;
  onClose: () => void;
  history: ReadingHistory;
  streak: StreakData;
  savedCount: number;
}

function dateKey(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

export default function StatsModal({ open, onClose, history, streak, savedCount }: Props) {
  const todayKey = dateKey(0);

  // ── Last 7 days ──
  const week = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const offset = i - 6; // -6 … 0
      const key = dateKey(offset);
      const reads = history[key]?.total ?? 0;
      const d = new Date(); d.setDate(d.getDate() + offset);
      const label = d.toLocaleDateString('es-ES', { weekday: 'narrow' }).toUpperCase();
      return { key, reads, label, isToday: offset === 0 };
    }), [history]);

  // ── Per-source totals (all time) ──
  const sourceReads = useMemo(() => {
    const totals: Record<string, number> = {};
    Object.values(history).forEach(day =>
      Object.entries(day.sources).forEach(([src, n]) => {
        totals[src] = (totals[src] ?? 0) + n;
      })
    );
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [history]);

  const maxSource = sourceReads[0]?.[1] ?? 1;

  // ── Totals ──
  const readToday = history[todayKey]?.total ?? 0;
  const readWeek = week.reduce((s, d) => s + d.reads, 0);
  const readTotal = Object.values(history).reduce((s, d) => s + d.total, 0);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div
        className={`fixed bottom-0 left-3 right-3 z-50 bg-[#111] rounded-3xl mb-2 transition-transform duration-300 ease-out max-h-[88dvh] flex flex-col ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h2 className="text-white font-semibold text-base">Mis estadísticas</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

          {/* ── Hero numbers ── */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: readToday, label: 'Hoy', icon: '📰' },
              { value: streak.count, label: 'Racha', icon: '🔥' },
              { value: savedCount, label: 'Guardadas', icon: '🔖' },
            ].map(({ value, label, icon }) => (
              <div key={label} className="bg-white/5 border border-white/8 rounded-2xl p-3 text-center">
                <span className="text-lg">{icon}</span>
                <p className="text-yellow-400 text-2xl font-black mt-1">{value}</p>
                <p className="text-white/40 text-[11px] mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* ── Last 7 days ── */}
          <div className="bg-white/5 border border-white/8 rounded-2xl p-4">
            <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-3">
              Últimos 7 días
            </p>
            <div className="flex justify-between items-end gap-1">
              {week.map(({ key, reads, label, isToday }) => {
                const height = reads > 0 ? Math.max(20, Math.round((reads / Math.max(...week.map(d => d.reads), 1)) * 48)) : 4;
                return (
                  <div key={key} className="flex flex-col items-center gap-1.5 flex-1">
                    <div
                      className={`w-full rounded-full transition-all ${
                        reads > 0 ? 'bg-yellow-400' : 'bg-white/10'
                      } ${isToday ? 'ring-1 ring-yellow-400/60 ring-offset-1 ring-offset-[#111]' : ''}`}
                      style={{ height: `${height}px` }}
                    />
                    <span className={`text-[10px] font-semibold ${isToday ? 'text-yellow-400' : 'text-white/30'}`}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-3 pt-3 border-t border-white/8">
              <span className="text-white/40 text-xs">Esta semana</span>
              <span className="text-yellow-400 text-xs font-bold">{readWeek} noticias</span>
            </div>
          </div>

          {/* ── By source ── */}
          {sourceReads.length > 0 && (
            <div className="bg-white/5 border border-white/8 rounded-2xl p-4">
              <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-3">
                Por fuente
              </p>
              <div className="space-y-3">
                {sourceReads.map(([src, count]) => (
                  <div key={src}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-xs font-medium">{src}</span>
                      <span className="text-white/50 text-xs tabular-nums">{count}</span>
                    </div>
                    <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.round((count / maxSource) * 100)}%`,
                          backgroundColor: SOURCE_COLORS[src] ?? '#888',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Total ── */}
          <div className="bg-white/5 border border-white/8 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-semibold">Total leídas</p>
              <p className="text-white/35 text-xs mt-0.5">Desde que empezaste a usar la app</p>
            </div>
            <span className="text-yellow-400 text-2xl font-black">{readTotal}</span>
          </div>

          <div className="h-4" />
        </div>
      </div>
    </>
  );
}
