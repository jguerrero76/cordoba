import { NewsItem } from '@/types/news';

interface Props {
  items: NewsItem[];
}

function SourceBadge({ source, color }: { source: string; color: string }) {
  return (
    <span
      className="inline-block px-2.5 py-0.5 text-xs font-semibold text-white rounded-full"
      style={{ backgroundColor: color }}
    >
      {source}
    </span>
  );
}

export default function FeaturedNews({ items }: Props) {
  const [main, ...rest] = items;
  const secondary = rest.slice(0, 4);

  if (!main) return null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="h-6 w-1 rounded-full bg-[#7A1525]" />
        <h2 className="font-display text-xl font-bold text-gray-900">Noticias Destacadas</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:h-[420px]">
        {/* Main featured */}
        <a
          href={main.link}
          target="_blank"
          rel="noopener noreferrer"
          className="lg:col-span-2 relative rounded-2xl overflow-hidden group block h-64 lg:h-full"
        >
          {main.imageUrl ? (
            <img
              src={main.imageUrl}
              alt={main.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div
              className="w-full h-full"
              style={{
                background: `linear-gradient(135deg, ${main.sourceColor} 0%, ${main.sourceColor}80 100%)`,
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5 lg:p-7 text-white">
            <SourceBadge source={main.source} color={main.sourceColor} />
            <h3 className="mt-2 text-xl lg:text-2xl xl:text-3xl font-display font-bold leading-tight line-clamp-3 group-hover:text-[#E5C76E] transition-colors">
              {main.title}
            </h3>
            {main.description && (
              <p className="mt-2 text-white/70 text-sm line-clamp-2 hidden lg:block">
                {main.description}
              </p>
            )}
            <p className="mt-2 text-white/50 text-xs capitalize">{main.formattedDate}</p>
          </div>
        </a>

        {/* Secondary cards */}
        <div className="flex flex-col gap-3">
          {secondary.map((item) => (
            <a
              key={item.id}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex gap-3 bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200 flex-1"
            >
              <div className="shrink-0 w-[72px] h-[56px] rounded-lg overflow-hidden">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <div
                    className="w-full h-full"
                    style={{
                      background: `linear-gradient(135deg, ${item.sourceColor}50, ${item.sourceColor}20)`,
                    }}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <SourceBadge source={item.source} color={item.sourceColor} />
                <h4 className="mt-1 text-sm font-semibold text-gray-900 line-clamp-2 leading-snug group-hover:text-[#7A1525] transition-colors">
                  {item.title}
                </h4>
                <p className="text-xs text-gray-400 mt-0.5 capitalize">{item.formattedDate}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
