'use client';

import { NewsItem } from '@/types/news';

interface Props {
  item: NewsItem;
}

export default function NewsCard({ item }: Props) {
  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    img.style.display = 'none';
    const parent = img.parentElement;
    if (parent) {
      parent.style.background = `linear-gradient(135deg, ${item.sourceColor}40, ${item.sourceColor}15)`;
    }
  };

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer animate-fade-in"
    >
      {/* Image */}
      <div
        className="relative h-44 overflow-hidden shrink-0"
        style={
          !item.imageUrl
            ? { background: `linear-gradient(135deg, ${item.sourceColor}40, ${item.sourceColor}15)` }
            : {}
        }
      >
        {item.imageUrl && (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={handleImgError}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4">
        <span
          className="self-start px-2.5 py-0.5 text-xs font-semibold text-white rounded-full mb-2.5"
          style={{ backgroundColor: item.sourceColor }}
        >
          {item.source}
        </span>

        <h3 className="text-[15px] font-semibold text-gray-900 line-clamp-2 leading-snug mb-2 group-hover:text-[#7A1525] transition-colors flex-1">
          {item.title}
        </h3>

        {item.description && (
          <p className="text-gray-400 text-sm line-clamp-2 mb-3 leading-relaxed">
            {item.description}
          </p>
        )}

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-400 capitalize">{item.formattedDate}</span>
          <svg
            className="w-4 h-4 text-gray-300 group-hover:text-[#7A1525] transition-colors shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </div>
      </div>
    </a>
  );
}
