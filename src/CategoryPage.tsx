import React, { useState, useEffect } from 'react';
import {
  ChevronDown, ChevronRight, SlidersHorizontal,
  Grid2x2, List, X
} from 'lucide-react';
import { categories, type CatalogProduct } from './data';
import { useProducts } from './hooks/useProducts';
import { useGroups } from './hooks/useGroups';

const BMW_MODELS = [
  '1 серия', '2 серия', '3 серия', '4 серия', '5 серия',
  '6 серия', '7 серия', '8 серия',
  'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7',
  'M2', 'M3', 'M4', 'M5', 'M8',
  'i3', 'i4', 'i7', 'iX', 'Z4',
];

interface CategoryPageProps {
  categoryId: string;
  initialSubcat?: string;
  onNavigate: (page: string) => void;
  key?: React.Key;
}

export function CategoryPage({ categoryId, initialSubcat = '', onNavigate }: CategoryPageProps) {
  const [modelsOpen, setModelsOpen] = useState(true);
  const [subcatsOpen, setSubcatsOpen] = useState(true);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  // поколения: { 'X5': ['F15', 'G05'], ... }
  const [selectedBodies, setSelectedBodies] = useState<Record<string, string[]>>({});
  const [selectedSubcat, setSelectedSubcat] = useState<string>(initialSubcat);
  const [sort, setSort] = useState('new');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  // Синхронизируем выбранную подкатегорию при навигации из верхнего меню
  useEffect(() => {
    setSelectedSubcat(initialSubcat);
  }, [initialSubcat]);

  const category = categories.find(c => c.id === categoryId);
  const groups = useGroups(categoryId);

  const { products: rawProducts, total, loading } = useProducts(categoryId, sort, undefined, selectedSubcat || undefined);

  // уникальные поколения (body) по каждой модели из текущих товаров
  const bodiesByModel: Record<string, string[]> = {};
  for (const p of rawProducts) {
    if (!p.donor?.body) continue;
    const modelKey = BMW_MODELS.find(m => p.model.includes(m.replace(' серия', '')));
    if (!modelKey) continue;
    if (!bodiesByModel[modelKey]) bodiesByModel[modelKey] = [];
    if (!bodiesByModel[modelKey].includes(p.donor.body)) {
      bodiesByModel[modelKey].push(p.donor.body);
    }
  }
  // сортируем поколения по алфавиту внутри каждой модели
  for (const key of Object.keys(bodiesByModel)) {
    bodiesByModel[key].sort();
  }

  const categoryProducts: CatalogProduct[] = rawProducts.filter(p => {
    if (selectedModels.length === 0) return true;
    const matchedModel = selectedModels.find(m => p.model.includes(m.replace(' серия', '')));
    if (!matchedModel) return false;
    const bodies = selectedBodies[matchedModel];
    if (!bodies || bodies.length === 0) return true;
    return p.donor?.body ? bodies.includes(p.donor.body) : false;
  });

  const toggleModel = (model: string) => {
    setSelectedModels(prev => {
      if (prev.includes(model)) {
        // снимаем модель — чистим её поколения
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
            <ChevronRight size={13} className="opacity-50" />
            <button onClick={() => onNavigate('catalog')} className="hover:text-blue-600 transition-colors">Каталог</button>
            <ChevronRight size={13} className="opacity-50" />
            <span className="text-slate-700 font-semibold">{category?.title}</span>
          </nav>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 pt-6 md:pt-10">
        <h1 className="font-oswald font-semibold text-4xl md:text-6xl text-slate-900 mb-6 md:mb-10 tracking-tight">
          {category?.title}
        </h1>

        <div className="flex flex-col lg:flex-row gap-6 md:gap-8 items-start">
          {/* ── Sidebar ── */}
          <aside className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4">

            {/* BMW Series Filter */}
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
                        {/* поколения — показываем только если модель выбрана и есть данные */}
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
                        <button onClick={() => toggleBody(m, b)} className="hover:text-blue-900 transition-colors">
                          <X size={11} />
                        </button>
                      </span>
                    )) : (
                      <span key={m} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 text-[12px] font-semibold px-3 py-1 rounded-full">
                        {m}
                        <button onClick={() => toggleModel(m)} className="hover:text-blue-900 transition-colors">
                          <X size={11} />
                        </button>
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

            {/* Подкатегории */}
            {groups.length > 0 && (
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
                      onClick={() => setSelectedSubcat('')}
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
                        onClick={() => setSelectedSubcat(prev => prev === g.subCategory ? '' : g.subCategory)}
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

          {/* ── Main content ── */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-white rounded-2xl border border-slate-100 px-4 sm:px-6 py-3.5">
              <div className="flex items-center gap-3 text-[13px] text-slate-500">
                <SlidersHorizontal size={15} />
                {loading
                  ? <span className="font-medium text-slate-400">Загрузка...</span>
                  : <span className="font-medium text-slate-700">{total} товаров</span>
                }
              </div>

              <div className="flex items-center justify-between w-full sm:w-auto sm:justify-start gap-4 sm:gap-5">
                <div className="flex items-center gap-2 text-[13px] text-slate-600">
                  <span className="hidden sm:inline text-slate-400">Сортировка:</span>
                  <select
                    value={sort}
                    onChange={e => setSort(e.target.value)}
                    className="border-none bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer text-[13px]"
                  >
                    <option value="new">Новинки</option>
                    <option value="price_asc">Цена ↑</option>
                    <option value="price_desc">Цена ↓</option>
                  </select>
                </div>

                <div className="flex items-center gap-1 pl-4 border-l border-slate-100">
                  <button
                    onClick={() => setView('grid')}
                    className={`p-2 rounded-lg transition-colors ${view === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-blue-600'}`}
                  >
                    <Grid2x2 size={15} />
                  </button>
                  <button
                    onClick={() => setView('list')}
                    className={`p-2 rounded-lg transition-colors ${view === 'list' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-blue-600'}`}
                  >
                    <List size={15} />
                  </button>
                </div>
              </div>
            </div>

            {/* Products */}
            {loading ? (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white border border-slate-100 rounded-2xl overflow-hidden animate-pulse">
                    <div className="aspect-[4/3] bg-slate-100" />
                    <div className="p-5 flex flex-col gap-3">
                      <div className="h-3 bg-slate-100 rounded w-1/2" />
                      <div className="h-5 bg-slate-100 rounded w-3/4" />
                      <div className="h-4 bg-slate-100 rounded w-full" />
                      <div className="h-7 bg-slate-100 rounded w-1/3 mt-2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : categoryProducts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">
                Товары в этой категории не найдены
              </div>
            ) : view === 'grid' ? (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-5">
                {categoryProducts.map(product => (
                  <div key={product.id} onClick={() => onNavigate(`product-${product.id}`)} className="bg-white border border-slate-100 rounded-2xl flex flex-col group hover:shadow-xl hover:shadow-slate-200/60 hover:border-slate-200 hover:-translate-y-1 transition-all relative overflow-hidden cursor-pointer">
                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">Фото отсутствует</div>
                      )}
                      {product.conditionRaw !== 'contract' && (
                        <span className={`absolute top-3 left-3 text-[10px] font-bold px-2 py-1 rounded-full ${
                          product.conditionRaw === 'new' ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-white'
                        }`}>{product.condition}</span>
                      )}
                      {product.position && (
                        <span className="absolute top-3 right-3 text-[10px] font-semibold bg-white/90 text-slate-700 px-2 py-1 rounded-full">{product.position}</span>
                      )}
                    </div>

                    <div className="p-5 flex flex-col flex-1">
                      <span className="text-[10px] text-slate-400 mb-1 font-medium tracking-wide uppercase">{product.oem}</span>
                      <h3 className="font-oswald font-semibold text-base text-slate-900 leading-snug mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
                        {product.title}
                      </h3>

                      {product.donor && (
                        <div className="text-[11px] text-slate-500 mb-3 flex flex-col gap-0.5">
                          <span>{product.donor.brand} {product.donor.model} {product.donor.year} · {product.donor.body}</span>
                          {product.donor.engine && <span>Двигатель: {product.donor.engine}</span>}
                          {product.donor.mileage && <span>Пробег: {Number(product.donor.mileage).toLocaleString('ru-RU')} км</span>}
                          {product.color && <span>Цвет: {product.color}</span>}
                        </div>
                      )}

                      <div className="mt-auto">
                        <span className="text-xl font-oswald font-semibold text-slate-900 tracking-tight">{product.priceFormatted}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {categoryProducts.map(product => (
                  <div key={product.id} onClick={() => onNavigate(`product-${product.id}`)} className="bg-white border border-slate-100 rounded-2xl flex flex-col sm:flex-row gap-4 sm:gap-6 group hover:shadow-lg hover:border-slate-200 transition-all relative overflow-hidden p-4 sm:p-5 cursor-pointer">
                    <div className="relative w-full sm:w-40 h-40 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">Фото отсутствует</div>
                      )}
                      {product.conditionRaw !== 'contract' && (
                        <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          product.conditionRaw === 'new' ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-white'
                        }`}>{product.condition}</span>
                      )}
                    </div>

                    <div className="flex flex-col flex-1 justify-between py-1 min-w-0">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">{product.oem}</span>
                          {product.position && <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">{product.position}</span>}
                        </div>
                        <h3 className="font-oswald font-semibold text-lg text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
                          {product.title}
                        </h3>

                        {product.donor && (
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-slate-500">
                            <span>{product.donor.brand} {product.donor.model} {product.donor.year} · {product.donor.body}</span>
                            {product.donor.engine && <span>Двс: {product.donor.engine}</span>}
                            {product.donor.transmission && <span>КПП: {product.donor.transmission}</span>}
                            {product.donor.drive && <span>Привод: {product.donor.drive}</span>}
                            {product.donor.mileage && <span>Пробег: {Number(product.donor.mileage).toLocaleString('ru-RU')} км</span>}
                            {product.color && <span>Цвет: {product.color}</span>}
                            {product.donor.vin && <span className="font-mono">VIN: {product.donor.vin}</span>}
                          </div>
                        )}
                      </div>

                      <div className="mt-3">
                        <span className="text-2xl font-oswald font-semibold text-slate-900 tracking-tight whitespace-nowrap">{product.priceFormatted}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
