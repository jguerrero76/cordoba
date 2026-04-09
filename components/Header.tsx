'use client';

import { useState } from 'react';

const NAV_ITEMS = ['Todas', 'Local', 'Deportes', 'Cultura', 'Economía', 'Sucesos'];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="bg-[#7A1525] text-white sticky top-0 z-50 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 bg-[#C8A84B] rounded-full flex items-center justify-center font-bold text-[#7A1525] text-lg select-none">
              C
            </div>
            <div>
              <span className="font-display text-2xl font-bold tracking-tight leading-none">
                Córdoba{' '}
                <span className="text-[#E5C76E]">Hoy</span>
              </span>
              <p className="text-white/50 text-xs hidden sm:block leading-none mt-0.5">
                Noticias de Córdoba, España
              </p>
            </div>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item}
                className="px-3 py-1.5 rounded-full text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-all"
              >
                {item}
              </button>
            ))}
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Abrir menú"
            className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#6B1020]">
          {NAV_ITEMS.map((item) => (
            <button
              key={item}
              onClick={() => setMobileOpen(false)}
              className="block w-full text-left px-6 py-3 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
