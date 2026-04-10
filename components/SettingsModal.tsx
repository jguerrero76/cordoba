'use client';

import { UserPrefs } from '@/types/news';

const SOURCES = [
  { name: 'Diario Córdoba',    color: '#C41230' },
  { name: 'El Día de Córdoba', color: '#1D4ED8' },
  { name: 'Cordópolis',        color: '#D97706' },
  { name: 'La Voz de Córdoba', color: '#047857' },
  { name: 'Córdoba Hoy',       color: '#B45309' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  prefs: UserPrefs;
  onPrefsChange: (next: Partial<UserPrefs>) => void;
  onResetSeen: () => void;
  readToday: number;
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      aria-pressed={on}
      className={`relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0 ${
        on ? 'bg-yellow-400' : 'bg-white/20'
      }`}
    >
      <span
        className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
          on ? 'translate-x-7' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-white/35 text-[11px] font-semibold uppercase tracking-widest px-5 pt-5 pb-2">
      {children}
    </p>
  );
}

export default function SettingsModal({ open, onClose, prefs, onPrefsChange, onResetSeen, readToday }: Props) {
  const toggleSource = (name: string) => {
    const hidden = prefs.hiddenSources.includes(name)
      ? prefs.hiddenSources.filter((s) => s !== name)
      : [...prefs.hiddenSources, name];
    onPrefsChange({ hiddenSources: hidden });
  };

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
        className={`fixed bottom-0 left-0 right-0 z-50 bg-[#111] rounded-t-3xl transition-transform duration-300 ease-out max-h-[88dvh] flex flex-col ${
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
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h2 className="text-white font-semibold text-base">Ajustes</h2>
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

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1">

          {/* ── Fuentes ── */}
          <SectionLabel>Fuentes de noticias</SectionLabel>
          <div className="px-5 space-y-1">
            {SOURCES.map((src) => {
              const active = !prefs.hiddenSources.includes(src.name);
              return (
                <div
                  key={src.name}
                  className="flex items-center justify-between py-3 border-b border-white/6"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                      style={{ backgroundColor: src.color }}
                    >
                      {src.name.charAt(0)}
                    </div>
                    <span className={`text-sm font-medium ${active ? 'text-white' : 'text-white/35'}`}>
                      {src.name}
                    </span>
                  </div>
                  <Toggle on={active} onChange={() => toggleSource(src.name)} />
                </div>
              );
            })}
          </div>

          {/* ── Contenido ── */}
          <SectionLabel>Contenido</SectionLabel>
          <div className="px-5 space-y-1">
            <div className="flex items-center justify-between py-3 border-b border-white/6">
              <div>
                <p className="text-white text-sm font-medium">Solo noticias con imagen</p>
                <p className="text-white/35 text-xs mt-0.5">Oculta artículos sin foto</p>
              </div>
              <Toggle
                on={prefs.onlyWithImage}
                onChange={() => onPrefsChange({ onlyWithImage: !prefs.onlyWithImage })}
              />
            </div>

            <div className="flex items-center justify-between py-3 border-b border-white/6">
              <div>
                <p className="text-white text-sm font-medium">Texto grande</p>
                <p className="text-white/35 text-xs mt-0.5">Título más grande en las tarjetas</p>
              </div>
              <Toggle
                on={prefs.textSize === 'large'}
                onChange={() =>
                  onPrefsChange({ textSize: prefs.textSize === 'large' ? 'normal' : 'large' })
                }
              />
            </div>
          </div>

          {/* ── Historial ── */}
          <SectionLabel>Historial</SectionLabel>
          <div className="px-5 pb-2">
            <div className="bg-white/5 border border-white/8 rounded-2xl p-4 flex items-center justify-between mb-3">
              <div>
                <p className="text-white text-sm font-medium">Noticias leídas hoy</p>
                <p className="text-white/40 text-xs mt-0.5">Se resetean a medianoche</p>
              </div>
              <span className="text-yellow-400 text-xl font-black">{readToday}</span>
            </div>
            <button
              onClick={() => { onResetSeen(); onClose(); }}
              className="w-full py-3 bg-white/8 border border-white/12 rounded-2xl text-white/70 text-sm font-medium active:scale-95 transition-transform"
            >
              Volver a ver todas las noticias
            </button>
          </div>

          <div className="h-8" />
        </div>
      </div>
    </>
  );
}
