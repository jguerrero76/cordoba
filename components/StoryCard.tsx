'use client';

import { useState } from 'react';
import { NewsItem } from '@/types/news';

interface Props {
  item: NewsItem;
  index: number;
  isLast: boolean;
  isSaved: boolean;
  onToggleSave: () => void;
}

function timeAgo(pubDate: string): string {
  try {
    const mins = Math.floor((Date.now() - new Date(pubDate).getTime()) / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `hace ${mins}min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs}h`;
    return `hace ${Math.floor(hrs / 24)}d`;
  } catch {
    return '';
  }
}

export default function StoryCard({ item, index, isLast, isSaved, onToggleSave }: Props) {
  const [copied, setCopied] = useState(false);
  const [pulse, setPulse] = useState(false);

  const handleSave = () => {
    onToggleSave();
    setPulse(true);
    setTimeout(() => setPulse(false), 300);
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: item.title, text: item.description, url: item.link });
      } else {
        await navigator.clipboard.writeText(item.link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // user cancelled
    }
  };

  const color = item.sourceColor;

  return (
    <div
      data-id={item.id}
      data-index={index}
      className="story-card relative overflow-hidden bg-black select-none"
    >
      {/* ── Background ── */}
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover scale-105"
          draggable={false}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse at 25% 25%, ${color}55 0%, transparent 55%),
              radial-gradient(ellipse at 75% 70%, ${color}33 0%, transparent 50%),
              linear-gradient(145deg, #111 0%, #000 100%)
            `,
          }}
        />
      )}

      {/* ── Gradient layers — cinematic ── */}
      {/* Top vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent" style={{ height: '45%' }} />
      {/* Bottom blackout — builds up content area */}
      <div className="absolute bottom-0 left-0 right-0 h-3/4 bg-gradient-to-t from-black via-black/80 to-transparent" />
      {/* Subtle color wash from source */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1/2 opacity-20"
        style={{ background: `linear-gradient(to top, ${color}, transparent)` }}
      />

      {/* ── Source chip — top left ── */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 pt-14 pb-2">
        <div
          className="flex items-center gap-1.5 px-3 py-1 rounded-full"
          style={{ backgroundColor: `${color}cc` }}
        >
          <span className="text-white font-bold text-xs tracking-wide">{item.source}</span>
        </div>
        <span className="text-white/50 text-xs bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full">
          {timeAgo(item.pubDate)}
        </span>
      </div>

      {/* ── Right action buttons ── */}
      <div className="absolute right-3 bottom-32 z-30 flex flex-col items-center gap-5">
        {/* Save */}
        <button
          onClick={handleSave}
          aria-label={isSaved ? 'Quitar de guardados' : 'Guardar noticia'}
          className={`flex flex-col items-center gap-1.5 transition-transform duration-150 ${pulse ? 'scale-125' : 'scale-100'}`}
        >
          <div
            className={`w-13 h-13 w-[52px] h-[52px] rounded-2xl flex items-center justify-center transition-all duration-200 shadow-lg ${
              isSaved
                ? 'bg-yellow-400 shadow-yellow-400/40'
                : 'bg-white/10 backdrop-blur-md border border-white/20'
            }`}
          >
            <svg
              className={`w-5 h-5 transition-colors ${isSaved ? 'text-gray-900' : 'text-white'}`}
              fill={isSaved ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </div>
          <span className={`text-[11px] font-semibold drop-shadow ${isSaved ? 'text-yellow-400' : 'text-white/70'}`}>
            {isSaved ? 'Guardado' : 'Guardar'}
          </span>
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          aria-label="Compartir noticia"
          className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform"
        >
          <div className="w-[52px] h-[52px] rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </div>
          <span className="text-white/70 text-[11px] font-semibold drop-shadow">
            {copied ? '¡Listo!' : 'Compartir'}
          </span>
        </button>
      </div>

      {/* ── Bottom content ── */}
      <div className="absolute bottom-0 left-0 right-[72px] z-30 px-5 pb-14">

        {/* Title */}
        <h2
          className="text-white font-black leading-tight mb-2.5"
          style={{
            fontSize: 'clamp(20px, 5.5vw, 26px)',
            textShadow: '0 2px 12px rgba(0,0,0,0.9)',
          }}
        >
          {item.title}
        </h2>

        {/* Description */}
        {item.description && (
          <p className="text-white/60 text-sm leading-relaxed line-clamp-2 mb-4">
            {item.description}
          </p>
        )}

        {/* Read CTA */}
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 active:scale-95 transition-transform"
        >
          <span
            className="px-4 py-2 rounded-full text-sm font-bold text-white flex items-center gap-1.5"
            style={{ backgroundColor: `${color}dd` }}
          >
            Leer noticia
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </span>
        </a>
      </div>

      {/* ── Decorative frame ── */}
      {/* Outer border ring */}
      <div
        className="absolute inset-2 rounded-[28px] pointer-events-none z-20"
        style={{
          border: `1.5px solid ${color}55`,
          boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.05), 0 0 40px ${color}18`,
        }}
      />
      {/* Corner brackets — top-left */}
      <div className="absolute top-5 left-5 w-7 h-7 pointer-events-none z-20"
        style={{ borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}`, borderRadius: '10px 0 0 0' }} />
      {/* top-right */}
      <div className="absolute top-5 right-5 w-7 h-7 pointer-events-none z-20"
        style={{ borderTop: `2px solid ${color}`, borderRight: `2px solid ${color}`, borderRadius: '0 10px 0 0' }} />
      {/* bottom-left */}
      <div className="absolute bottom-5 left-5 w-7 h-7 pointer-events-none z-20"
        style={{ borderBottom: `2px solid ${color}`, borderLeft: `2px solid ${color}`, borderRadius: '0 0 0 10px' }} />
      {/* bottom-right */}
      <div className="absolute bottom-5 right-5 w-7 h-7 pointer-events-none z-20"
        style={{ borderBottom: `2px solid ${color}`, borderRight: `2px solid ${color}`, borderRadius: '0 0 10px 0' }} />

      {/* ── Swipe hint ── */}
      {isLast ? (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-0.5 animate-bounce pointer-events-none">
          <svg className="w-4 h-4 text-white/30" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-white/25 text-[10px] tracking-widest uppercase">Actualizar</span>
        </div>
      ) : (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-0.5 animate-bounce pointer-events-none">
          <svg className="w-4 h-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span className="text-white/25 text-[10px] tracking-widest uppercase">Desliza</span>
        </div>
      )}
    </div>
  );
}
