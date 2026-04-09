'use client';

import { useState } from 'react';
import { NewsItem } from '@/types/news';

interface Props {
  item: NewsItem;
  index: number;
  isFirst: boolean;
  isSaved: boolean;
  onToggleSave: () => void;
}

export default function StoryCard({ item, index, isFirst, isSaved, onToggleSave }: Props) {
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

  return (
    <div
      data-id={item.id}
      data-index={index}
      className="story-card relative overflow-hidden bg-black select-none"
    >
      {/* Background */}
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(160deg, ${item.sourceColor}dd 0%, #000 65%)`,
          }}
        />
      )}

      {/* Gradient layers */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/85" />

      {/* ── Top bar ── */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pt-12 pb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
            style={{ backgroundColor: item.sourceColor }}
          >
            {item.source.charAt(0)}
          </div>
          <span className="text-white text-sm font-semibold drop-shadow">{item.source}</span>
        </div>
        <span className="text-white/50 text-xs capitalize">{item.formattedDate}</span>
      </div>

      {/* ── Right actions ── */}
      <div className="absolute right-3 bottom-28 z-10 flex flex-col items-center gap-5">
        {/* Read */}
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Leer noticia completa"
          className="flex flex-col items-center gap-1 active:scale-95 transition-transform"
        >
          <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </div>
          <span className="text-white/80 text-[11px] font-medium drop-shadow">Leer</span>
        </a>

        {/* Save */}
        <button
          onClick={handleSave}
          aria-label={isSaved ? 'Quitar de guardados' : 'Guardar noticia'}
          className={`flex flex-col items-center gap-1 transition-transform duration-150 ${pulse ? 'scale-125' : 'scale-100'}`}
        >
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-200 ${
              isSaved ? 'bg-yellow-400' : 'bg-black/40 backdrop-blur-md border border-white/20'
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
          <span className="text-white/80 text-[11px] font-medium drop-shadow">
            {isSaved ? 'Guardado' : 'Guardar'}
          </span>
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          aria-label="Compartir noticia"
          className="flex flex-col items-center gap-1"
        >
          <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </div>
          <span className="text-white/80 text-[11px] font-medium drop-shadow">
            {copied ? '¡Copiado!' : 'Compartir'}
          </span>
        </button>
      </div>

      {/* ── Bottom content ── */}
      <div className="absolute bottom-0 left-0 right-16 z-10 px-5 pb-10 pt-4">
        <h2 className="text-white text-[22px] font-bold leading-tight mb-2 drop-shadow-lg">
          {item.title}
        </h2>
        {item.description && (
          <p className="text-white/65 text-sm leading-relaxed line-clamp-2">
            {item.description}
          </p>
        )}
      </div>

      {/* Swipe hint (first card only) */}
      {isFirst && (
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
