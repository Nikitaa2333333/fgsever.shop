import React, { useState } from 'react';
import { ChevronDown, SlidersHorizontal, Grid2x2, List, X } from 'lucide-react';
import { categories, type CatalogProduct } from '../data';
import { useProducts } from '../hooks/useProducts';
import { useGroups } from '../hooks/useGroups';
import { useModels } from '../hooks/useModels';

const BMW_MODELS = [
  '1 серия', '2 серия', '3 серия', '4 серия', '5 серия',
  '6 серия', '7 серия', '8 серия',
  'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7',
  'M2', 'M3', 'M4', 'M5', 'M8',
  'i3', 'i4', 'i7', 'iX', 'Z4',
];

interface CatalogPageProps {
  onNavigate: (page: string) => void;
}

const PAGE_SIZE = 48;

export function CatalogPage({ onNavigate }: CatalogPageProps) {
  const [modelsOpen, setModelsOpen] = useState(true);
  const [catsOpen, setCatsOpen] = useState(true);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedBodies, setSelectedBodies] = useState<Record<string, string[]>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sort, setSort] = useState('new');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);
  const [selectedSubcat, setSelectedSubcat] = useState<string>('');
  const [subcatsOpen, setSubcatsOpen] = useState(true);

  const groups = useGroups(selectedCategory);
  const bodiesByModel = useModels(selectedCategory || undefined);

  const allSelectedBodies = Object.values(selectedBodies).flat();

  const { products: categoryProducts, total, loading } = useProducts(
    selectedCategory || undefined, sort, undefined,
    selectedSubcat || undefined,
    displayLimit,
    selectedModels.length > 0 ? selectedModels.join(',') : undefined,
    allSelectedBodies.length > 0 ? allSelectedBodies.join(',') : undefined,
  );

  const toggleModel = (model: string) => {
    setSelectedModels(prev => {
      if (prev.includes(model)) {
        setSelectedBodies(b => { const next = { ...b }; delete next[model]; return next; });
        return prev.filter(m => m !== model);
      }
      return [...prev, model];
    });
  };

  const toggleBody = (model: string, body: string) => {
    setSelectedBodies(prev => {
      const cur = prev[model] ?? [];
      return {
        ...prev,
        [model]: cur.includes(body) ? cur.filter(b => b !== body) : [...cur, body],
      };
    });
  };

  const handleCategoryChange = (catId: string) => {
    setSelectedCategory(prev => prev === catId ? '' : catId);
    setSelectedSubcat('');
    setDisplayLimit(PAGE_SIZE);
  };

  const handleSortChange = (newSort: string) => {
    setSort(newSort);
    setDisplayLimit(PAGE_SIZE);
  };

  return (
    <div className="flex-1 pb-24">
      {/* Breadcrumbs */}
      <div className="border-b border-slate-100 bg-white overflow-x-auto">
        <div className="w-full px-4 md:px-10 py-3.5 min-w-max">
          <nav className="flex items-center gap-2 text-[13px] text-slate-400">
            <button
              onClick={() => onNavigate('home')}
              className="hover:text-blue-600 transition-colors"
            >
              Главная
            </button>
            <span className="opacity-30 mx-1">›</span>
            <span className="text-slate-700 font-semibold">Каталог</span>
          </nav>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 pt-6 md:pt-10">
        <h1 className="font-oswald font-semibold text-4xl md:text-6xl text-slate-900 mb-6 md:mb-10 tracking-tight">
          Каталог
        </h1>

        <div className="flex flex-col lg:flex-row gap-6 md:gap-8 items-start">
          {/* Sidebar */}
          <aside className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4">

            {/* Фильтр по серии BMW */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <button
                onClick={() => setModelsOpen(v => !v)}
                className="w-full flex items-center justify-between px-6 py-4 font-semibold text-[15px] text-slate-800 hover:bg-slate-50 transition-colors"
              >
                Серия BMW
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-300 opacity-50 ${modelsOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {modelsOpen && (
                <div className="border-t border-slate-100 px-5 py-4 flex flex-col gap-1 max-h-96 overflow-y-auto">
                  {BMW_MODELS.map(model => {
                    const isSelected = selectedModels.includes(model);
                    const bodies = bodiesByModel[model] ?? [];
                    return (
                      <div key={model}>
                        <label className="flex items-center gap-3 cursor-pointer group py-1.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleModel(model)}
                            className="w-4 h-4 rounded border-slate-300 accent-blue-600 cursor-pointer flex-shrink-0"
                          />
                          <span className="text-[13px] text-slate-600 group-hover:text-blue-600 transition-colors select-none font-medium">
                            {model}
                          </span>
                          {bodies.length > 0 && (
                            <span className="ml-auto text-[11px] text-slate-400">{bodies.length}</span>
                          )}
                        </label>
                        {isSelected && bodies.length > 0 && (
                          <div className="ml-7 mb-1 flex flex-col gap-1">
                            {bodies.map(body => (
                              <label key={body} className="flex items-center gap-2.5 cursor-pointer group py-1">
                                <input
                                  type="checkbox"
                                  checked={(selectedBodies[model] ?? []).includes(body)}
                                  onChange={() => toggleBody(model, body)}
                                  className="w-3.5 h-3.5 rounded border-slate-300 accent-blue-500 cursor-pointer flex-shrink-0"
                                />
                                <span className="text-[12px] text-slate-500 group-hover:text-blue-600 transition-colors select-none font-mono">
                                  {body}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {selectedModels.length > 0 && (
                <div className="border-t border-slate-100 px-5 py-3 flex flex-wrap gap-2">
                  {selectedModels.map(m => {
                    const bodies = selectedBodies[m] ?? [];
                    return bodies.length > 0 ? bodies.map(b => (
                      <span key={`${m}-${b}`} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 text-[12px] font-semibold px-3 py-1 rounded-full">
                        {m} · <span className="font-mono">{b}</span>
                        <button onClick={() => toggleBody(m, b)} className="hover:text-blue-900 transition-colors"><X size={11} /></button>
                      </span>
                    )) : (
                      <span key={m} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 text-[12px] font-semibold px-3 py-1 rounded-full">
                        {m}
                        <button onClick={() => toggleModel(m)} className="hover:text-blue-900 transition-colors"><X size={11} /></button>
                      </span>
                    );
                  })}
                  <button
                    onClick={() => { setSelectedModels([]); setSelectedBodies({}); }}
                    className="text-[12px] text-slate-400 hover:text-red-500 transition-colors"
                  >
                    Сбросить
                  </button>
                </div>
              )}
            </div>

            {/* Фильтр по категории */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <button
                onClick={() => setCatsOpen(v => !v)}
                className="w-full flex items-center justify-between px-6 py-4 font-semibold text-[15px] text-slate-800 hover:bg-slate-50 transition-colors"
              >
                Категория
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-300 opacity-50 ${catsOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {catsOpen && (
                <div className="border-t border-slate-100 px-3 py-3 flex flex-col gap-0.5">
                  <button
                    onClick={() => { setSelectedCategory(''); setDisplayLimit(PAGE_SIZE); }}
                    className={`flex items-center justify-between px-4 py-2 text-[13px] rounded-xl transition-colors text-left ${
                      selectedCategory === '' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    Все категории
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryChange(cat.id)}
                      className={`flex items-center justify-between px-4 py-2 text-[13px] rounded-xl transition-colors text-left ${
                        selectedCategory === cat.id ? 'bg-blue-600 text-white font-semibold' : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
                      }`}
                    >
                      {cat.title}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Подкатегории — появляются когда выбрана категория */}
            {selectedCategory && groups.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <button
                  onClick={() => setSubcatsOpen(v => !v)}
                  className="w-full flex items-center justify-between px-6 py-4 font-semibold text-[15px] text-slate-800 hover:bg-slate-50 transition-colors"
                >
                  Подкатегории
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-300 opacity-50 ${subcatsOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {subcatsOpen && (
                  <div className="border-t border-slate-100 px-3 py-3 flex flex-col gap-0.5">
                    <button
                      onClick={() => { setSelectedSubcat(''); setDisplayLimit(PAGE_SIZE); }}
                      className={`flex items-center justify-between px-4 py-2 text-[13px] rounded-xl transition-colors text-left ${
                        selectedSubcat === '' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
                      }`}
                    >
                      <span>Все</span>
                      <span className={`text-[11px] font-medium ${selectedSubcat === '' ? 'text-blue-100' : 'text-slate-400'}`}>{total}</span>
                    </button>
                    {groups.map(g => (
                      <button
                        key={g.subCategory}
                        onClick={() => { setSelectedSubcat(prev => prev === g.subCategory ? '' : g.subCategory); setDisplayLimit(PAGE_SIZE); }}
                        className={`flex items-center justify-between px-4 py-2 text-[13px] rounded-xl transition-colors text-left ${
                          selectedSubcat === g.subCategory ? 'bg-blue-600 text-white font-semibold' : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
                        }`}
                      >
                        <span>{g.subCategory}</span>
                        <span className={`text-[11px] font-medium ${selectedSubcat === g.subCategory ? 'text-blue-100' : 'text-slate-400'}`}>{g.count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </aside>

          {/* Основной контент */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-white rounded-2xl border border-slate-100 px-4 sm:px-6 py-3.5">
              <div className="flex items-center gap-3 text-[13px] text-slate-500">
                <SlidersHorizontal size={15} />
                {loading
                  ? <span className="font-medium text-slate-400">Загрузка...</span>
                  : <span className="font-medium text-slate-700">{categoryProducts.length} товаров</span>
                }
              </div>
              <div className="flex items-center justify-between w-full sm:w-auto sm:justify-start gap-4 sm:gap-5">
                <div className="flex items-center gap-2 text-[13px] text-slate-600">
                  <span className="hidden sm:inline text-slate-400">Сортировка:</span>
                  <select
                    value={sort}
                    onChange={e => handleSortChange(e.target.value)}
                    className="border-none bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer text-[13px]"
                  >
                    <option value="new">Новинки</option>
                    <option value="price_asc">Цена ↑</option>
                    <option value="price_desc">Цена ↓</option>
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setView('grid')}
                    className={`p-1.5 rounded-lg transition-colors ${view === 'grid' ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <Grid2x2 size={16} />
                  </button>
                  <button
                    onClick={() => setView('list')}
                    className={`p-1.5 rounded-lg transition-colors ${view === 'list' ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <List size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Сетка товаров */}
            {loading ? (
              <div className={`grid gap-4 ${view === 'grid' ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-100 overflow-hidden animate-pulse">
                    <div className="bg-slate-100 aspect-square" />
                    <div className="p-4 space-y-2">
                      <div className="h-3 bg-slate-100 rounded w-3/4" />
                      <div className="h-3 bg-slate-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : categoryProducts.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <p className="text-lg font-medium">Товары не найдены</p>
              </div>
            ) : (
              <div className={`grid gap-4 ${view === 'grid' ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                {categoryProducts.map(product => (
                  <div
                    key={product.id}
                    onClick={() => onNavigate(`product-${product.id}`)}
                    className={`bg-white rounded-2xl border border-slate-100 overflow-hidden cursor-pointer hover:border-blue-200 hover:shadow-md transition-all duration-200 group ${view === 'list' ? 'flex gap-4 items-start p-4' : ''}`}
                  >
                    <div className={`bg-slate-50 overflow-hidden flex-shrink-0 ${view === 'list' ? 'w-28 h-28 rounded-xl' : 'aspect-square'}`}>
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs text-center p-2">
                          Фото отсутствует
                        </div>
                      )}
                    </div>
                    <div className={view === 'list' ? 'flex-1 min-w-0' : 'p-3 md:p-4'}>
                      <p className="text-[11px] text-slate-400 mb-1 truncate">{product.brand} {product.model} {product.year}</p>
                      <p className={`font-medium text-slate-900 leading-snug mb-2 ${view === 'list' ? 'text-sm' : 'text-[13px] line-clamp-2'}`}>
                        {product.title}
                      </p>
                      {product.sku && (
                        <p className="text-[11px] text-slate-400 mb-2 font-mono">{product.sku}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-[15px]">{product.priceFormatted}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Кнопка "Показать ещё" */}
            {!loading && displayLimit < total && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => setDisplayLimit(prev => prev + PAGE_SIZE)}
                  className="bg-white border border-slate-200 hover:border-blue-400 text-slate-700 hover:text-blue-600 font-semibold px-8 py-3 rounded-full transition-all"
                >
                  Показать ещё ({Math.min(PAGE_SIZE, total - displayLimit)} из {total - displayLimit} оставшихся)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
