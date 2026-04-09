import { NEWS_SOURCES } from '@/lib/rss';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gray-950 text-gray-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-[#C8A84B] rounded-full flex items-center justify-center font-bold text-[#7A1525] text-sm">
                C
              </div>
              <span className="font-display text-lg font-bold text-white">
                Córdoba <span className="text-[#C8A84B]">Hoy</span>
              </span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              Agregador de noticias de Córdoba, España. Recopilamos las últimas noticias de las principales fuentes de información de la ciudad de la Mezquita.
            </p>
          </div>

          {/* Sources */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
              Fuentes de información
            </h3>
            <ul className="space-y-2">
              {NEWS_SOURCES.map((source) => (
                <li key={source.name} className="flex items-center gap-2.5 text-sm text-gray-500">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: source.color }}
                  />
                  {source.name}
                </li>
              ))}
            </ul>
          </div>

          {/* Info */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
              Aviso legal
            </h3>
            <ul className="space-y-2.5 text-sm text-gray-500">
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 shrink-0 mt-0.5 text-[#C8A84B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Noticias actualizadas cada 5 minutos
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 shrink-0 mt-0.5 text-[#C8A84B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                El contenido es propiedad de cada fuente
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 shrink-0 mt-0.5 text-[#C8A84B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                No almacenamos contenido de terceros
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-8 text-center text-gray-600 text-sm">
          <p>© {year} Córdoba Hoy · Contenido propiedad de sus respectivos autores</p>
        </div>
      </div>
    </footer>
  );
}
