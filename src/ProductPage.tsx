import React, { useState, useEffect } from 'react';
import {
  ChevronRight,
  Tag, Gauge, Palette, Hash,
  ChevronLeft, ChevronRight as ChevronRightIcon
} from 'lucide-react';
import { allProducts, categories, type CatalogProduct } from './data';

interface ProductPageProps {
  productId: number;
  onNavigate: (page: string) => void;
}

export function ProductPage({ productId, onNavigate }: ProductPageProps) {
  const [product, setProduct] = useState<CatalogProduct | null | undefined>(undefined);
  const [activeImage, setActiveImage] = useState(0);
  const [related, setRelated] = useState<CatalogProduct[]>([]);

  useEffect(() => {
    setProduct(undefined);
    setActiveImage(0);
    fetch(`/api/products/${productId}`)
      .then(r => {
        if (!r.ok) throw new Error('not found');
        return r.json();
      })
      .then(data => setProduct(data))
      .catch(() => {
        const found = allProducts.find(p => p.id === productId) ?? null;
        setProduct(found);
      });
  }, [productId]);

  useEffect(() => {
    if (!product) return;
    fetch(`/api/products?category=${product.categoryId}&limit=5`)
      .then(r => r.json())
      .then(data => {
        setRelated((data.items as CatalogProduct[]).filter(p => p.id !== product.id).slice(0, 4));
      })
      .catch(() => {
        setRelated(
          allProducts.filter(p => p.categoryId === product.categoryId && p.id !== product.id && p.imageUrl).slice(0, 4)
        );
      });
  }, [product?.categoryId, product?.id]);

  if (product === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center py-32 text-slate-400">
        Загрузка...
      </div>
    );
  }

  if (product === null) {
    return (
      <div className="flex-1 flex items-center justify-center py-32 text-slate-400">
        Товар не найден
      </div>
    );
  }

  const category = categories.find(c => c.id === product.categoryId);

  // Все фото товара из Базон (до 25 штук)
  const images = product.photos && product.photos.length > 0
    ? product.photos
    : [product.imageUrl].filter(Boolean);

  // Применяемость: собираем из полей товара
  const applicability = [product.brand, product.model, product.year, product.body, product.engine]
    .filter(Boolean)
    .join(' · ');

  const infoRows = [
    product.sku && { label: 'Артикул', value: product.sku, icon: <Hash size={15} /> },
    product.oem && { label: 'OEM-номер', value: product.oem, icon: <Hash size={15} /> },
    product.condition && { label: 'Состояние', value: product.condition, icon: <Tag size={15} /> },
    applicability && { label: 'Применяемость', value: applicability, icon: <Gauge size={15} /> },
    product.position && { label: 'Расположение', value: product.position, icon: <Gauge size={15} /> },
    product.color && {
      label: 'Цвет',
      value: product.color,
      icon: <Palette size={15} />,
      colorCircle: true
    },
  ].filter(Boolean) as any[];

  const getColorHex = (colorName: string) => {
    const colors: Record<string, string> = {
      'черный': '#000000',
      'белый': '#ffffff',
      'серый': '#808080',
      'серебристый': '#C0C0C0',
      'синий': '#1e40af',
      'красный': '#ef4444',
      'зеленый': '#10b981',
      'коричневый': '#78350f',
      'бежевый': '#f5f5dc',
      'желтый': '#facc15',
      'голубой': '#60a5fa',
      'золотистый': '#fbbf24',
      'фиолетовый': '#8b5cf6',
      'темно-синий': '#1e3a8a',
      'темно-серый': '#374151',
    };
    const key = colorName.toLowerCase().trim();
    return colors[key] || null;
  };

  return (
    <div className="flex-1 pb-24">
      {/* Breadcrumbs */}
      <div className="border-b border-slate-100 bg-white overflow-x-auto">
        <div className="w-full px-4 md:px-10 py-3.5 min-w-max">
          <nav className="flex items-center gap-2 text-[13px] text-slate-400">
            <button onClick={() => onNavigate('home')} className="hover:text-blue-600 transition-colors">
              Главная
            </button>
            <ChevronRight size={13} className="opacity-50" />
            <span className="hover:text-blue-600 cursor-pointer transition-colors">Каталог</span>
            {category && (
              <>
                <ChevronRight size={13} className="opacity-50" />
                <button
                  onClick={() => onNavigate(product.categoryId)}
                  className="hover:text-blue-600 transition-colors"
                >
                  {category.title}
                </button>
              </>
            )}
            <ChevronRight size={13} className="opacity-50" />
            <span className="text-slate-700 font-semibold line-clamp-1 max-w-[200px]">{product.title}</span>
          </nav>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 pt-8 md:pt-12">
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-16">

          {/* ── Images ── */}
          <div className="w-full lg:w-1/2 flex flex-col gap-4">
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-slate-100 border border-slate-100">
              {images[activeImage] ? (
                <img
                  src={images[activeImage]}
                  alt={product.title}
                  loading="eager"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300 text-sm">
                  Нет фото
                </div>
              )}
              {/* Condition badge */}
              {product.conditionRaw !== 'contract' && (
                <span className={`absolute top-4 left-4 text-[11px] font-bold px-3 py-1.5 rounded-full ${
                  product.conditionRaw === 'new' ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-white'
                }`}>{product.condition}</span>
              )}

              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImage(i => Math.max(0, i - 1))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() => setActiveImage(i => Math.min(images.length - 1, i + 1))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white transition-colors"
                  >
                    <ChevronRightIcon size={18} />
                  </button>
                </>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(idx)}
                    className={`flex-shrink-0 w-20 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                      idx === activeImage ? 'border-blue-600' : 'border-transparent hover:border-slate-300'
                    }`}
                  >
                    <img src={img} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Info ── */}
          <div className="w-full lg:w-1/2 flex flex-col gap-6">
            {product.oem && (
              <p className="text-[13px] text-slate-400 font-medium tracking-wide uppercase">{product.oem}</p>
            )}
            <h1 className="font-oswald font-semibold text-4xl md:text-5xl text-slate-900 leading-tight">
              {product.title}
            </h1>

            {/* Description / Compatibility directly under title */}
            {product.description && (
              <div className="text-base md:text-lg text-slate-600 leading-relaxed whitespace-pre-line border-l-4 border-blue-100 pl-4 py-1">
                {product.description}
              </div>
            )}

            {/* Price + stock */}
            <div className="flex items-end gap-4">
              <span className="font-oswald font-semibold text-3xl text-slate-900 tracking-tight">
                {product.priceFormatted}
              </span>
            </div>

            {/* Кнопка заказа — Phase 2 */}

            {/* Specifications */}
            {infoRows.length > 0 && (
              <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-900 text-[14px] uppercase tracking-wide">Характеристики</h3>
                </div>
                <div className="grid grid-cols-2 text-[13px]">
                  {infoRows.map((row, idx) => (
                    <div key={idx} className={`flex items-center gap-4 px-5 py-2.5 hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'border-r border-slate-100' : ''}`}>
                      <div className="flex items-center gap-2 text-slate-500 whitespace-nowrap shrink-0">
                        <span className="text-slate-400 shrink-0">{row.icon}</span>
                        {row.label}
                      </div>
                      <div className="flex items-center gap-2">
                        {row.colorCircle && getColorHex(row.value) && (
                          <span 
                            className="w-3.5 h-3.5 rounded-full border border-slate-200 shadow-sm" 
                            style={{ backgroundColor: getColorHex(row.value) || undefined }}
                          />
                        )}
                        <span className="text-slate-800 font-medium">{row.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {/* Cross-numbers */}
            {product.crossNumbers && product.crossNumbers.length > 0 && (
              <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900 text-[14px] uppercase tracking-wide">Кросс-номера / Маркировки</h3>
                  <span className="text-[11px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md font-medium">{product.crossNumbers.length}</span>
                </div>
                <div className="p-5">
                  <div className="flex flex-wrap gap-2">
                    {product.crossNumbers.map((num, i) => (
                      <span key={i} className="px-3 py-1.5 bg-slate-50 text-slate-700 rounded-xl text-[13px] font-mono border border-slate-100">
                        {num}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Donor info / Compatibility */}
            {product.donor && (
              <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-900 text-[14px] uppercase tracking-wide">Информация о доноре</h3>
                </div>
                <div className="grid grid-cols-2 text-[13px]">
                  {[
                    ['Марка / Модель', `${product.donor.brand} ${product.donor.model}`],
                    ['Год выпуска', product.donor.year],
                    ['Двигатель', product.donor.engine],
                    ['Коробка', product.donor.transmission],
                    ['Привод', product.donor.drive],
                    ['Пробег', product.donor.mileage ? `${Number(product.donor.mileage).toLocaleString('ru-RU')} км` : ''],
                  ].filter(([, v]) => v).map(([label, value], idx) => (
                    <div key={idx} className={`flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'border-r border-slate-100' : ''}`}>
                      <span className="text-slate-500 whitespace-nowrap shrink-0">{label}</span>
                      <span className="text-slate-800 font-semibold">{value}</span>
                    </div>
                  ))}
                </div>
                {product.donor.video && (
                  <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50">
                    <a 
                      href={product.donor.video} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-[13px] font-semibold transition-colors border border-red-100"
                    >
                      Смотреть видео работы
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Related products */}
        {related.length > 0 && (
          <div className="mt-16 md:mt-24">
            <h2 className="font-oswald font-semibold text-3xl text-slate-900 mb-8">Похожие товары</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {related.map(p => (
                <div
                  key={p.id}
                  onClick={() => onNavigate(`product-${p.id}`)}
                  className="bg-white border border-slate-100 rounded-2xl flex flex-col group hover:shadow-xl hover:shadow-slate-200/60 hover:border-slate-200 hover:-translate-y-1 transition-all cursor-pointer overflow-hidden"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img src={p.imageUrl} alt={p.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    {p.conditionRaw !== 'contract' && (
                      <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        p.conditionRaw === 'new' ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-white'
                      }`}>{p.condition}</span>
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <span className="text-[10px] text-slate-400 mb-1 uppercase font-medium">{p.oem}</span>
                    <h4 className="font-oswald font-semibold text-base text-slate-900 leading-snug mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {p.title}
                    </h4>
                    <div className="mt-auto">
                      <span className="text-lg font-oswald font-semibold text-slate-900">{p.priceFormatted}</span>
                      <p className={`text-xs font-semibold flex items-center gap-1.5 pt-2 mt-1.5 border-t border-slate-100 ${p.outOfStock ? 'text-slate-400' : 'text-emerald-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${p.outOfStock ? 'bg-slate-300' : 'bg-emerald-500'}`} />
                        {p.outOfStock ? 'Нет в наличии' : 'В наличии'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
