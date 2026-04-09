'use client';

import { NewsItem } from '@/types/news';

interface Props {
  open: boolean;
  onClose: () => void;
  savedItems: NewsItem[];
  onRemove: (id: string) => void;
}

export default function SavedDrawer({ open, onClose, savedItems, onRemove }: Props) {
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
        className={`fixed bottom-0 left-0 right-0 z-50 bg-[#111] rounded-t-3xl transition-transform duration-300 ease-out max-h-[85dvh] flex flex-col ${
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
            <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <h2 className="text-white font-semibold text-base">Guardadas</h2>
            {savedItems.length > 0 && (
              <span className="bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                {savedItems.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-3">
          {savedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <svg className="w-12 h-12 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <p className="text-white/40 text-sm">No tienes noticias guardadas.</p>
              <p className="text-white/25 text-xs">Pulsa el icono de guardar en cualquier noticia.</p>
            </div>
          ) : (
            savedItems.map((item) => (
              <div
                key={item.id}
                className="flex gap-3 bg-white/5 rounded-2xl p-3 border border-white/8"
              >
                {/* Color thumbnail */}
                <div
                  className="w-16 h-16 rounded-xl shrink-0 overflow-hidden"
                  style={
                    item.imageUrl
                      ? undefined
                      : { background: `linear-gradient(135deg, ${item.sourceColor}80, ${item.sourceColor}30)` }
                  }
                >
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <span
                    className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold text-white mb-1"
                    style={{ backgroundColor: item.sourceColor }}
                  >
                    {item.source}
                  </span>
                  <p className="text-white text-sm font-medium leading-snug line-clamp-2 mb-1">
                    {item.title}
                  </p>
                  <p className="text-white/40 text-xs capitalize">{item.formattedDate}</p>
                </div>

                {/* Actions */}
                <div className="flex flex-col items-end justify-between shrink-0 gap-2">
                  {/* Remove */}
                  <button
                    onClick={() => onRemove(item.id)}
                    aria-label="Quitar de guardados"
                    className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <svg className="w-3.5 h-3.5 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </button>
                  {/* Open */}
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center active:scale-90 transition-transform"
                    aria-label="Leer noticia"
                  >
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            ))
          )}
          {/* Bottom padding for safe area */}
          <div className="h-6" />
        </div>
      </div>
    </>
  );
}
