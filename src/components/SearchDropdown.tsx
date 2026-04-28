import React, { useEffect, useRef, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import type { CatalogProduct } from '../data';

interface SearchDropdownProps {
  query: string;
  onNavigate: (page: string) => void;
  onClose: () => void;
}

export function SearchDropdown({ query, onNavigate, onClose }: SearchDropdownProps) {
  const [results, setResults] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Закрываем при клике вне dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Дебаунс-запрос к API
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/products?q=${encodeURIComponent(query)}&limit=5`)
        .then(r => r.json())
        .then(data => setResults(data.items ?? []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  if (query.length < 2) return null;

  const goSearch = () => {
    onNavigate(`search-${encodeURIComponent(query)}`);
    onClose();
  };

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl shadow-slate-900/10 border border-slate-100 z-[200] overflow-hidden"
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-6 text-slate-400 text-sm">
          <Loader2 size={16} className="animate-spin" />
          Ищем...
        </div>
      ) : results.length === 0 ? (
        <div className="py-6 text-center text-sm text-slate-400">
          Ничего не найдено по запросу «{query}»
        </div>
      ) : (
        <>
          <ul>
            {results.map(product => (
              <li key={product.id}>
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                  onMouseDown={() => {
                    onNavigate(`product-${product.id}`);
                    onClose();
                  }}
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100">
                    {product.imageUrl && (
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{product.title}</p>
                    {product.oem && (
                      <p className="text-[11px] text-slate-400 font-mono truncate">{product.oem}</p>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-slate-900 whitespace-nowrap flex-shrink-0">
                    {product.priceFormatted}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-slate-100">
            <button
              onMouseDown={goSearch}
              className="w-full flex items-center justify-center gap-2 py-3 text-[13px] font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <Search size={14} />
              Показать все результаты по «{query}»
            </button>
          </div>
        </>
      )}
    </div>
  );
}
