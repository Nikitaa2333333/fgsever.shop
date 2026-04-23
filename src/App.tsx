import React, { useState, useEffect } from 'react';
import { 
  Search, ShoppingCart, User, Phone, Menu, X, 
  ChevronDown, ShieldCheck, Truck, RefreshCcw,
  Facebook, Instagram, Youtube, Mail, ChevronRight
} from 'lucide-react';
import { categories, products, heroSlides, blockLinks } from './data';
import { CategoryPage } from './CategoryPage';
import { ProductPage } from './ProductPage';
import logo from './logo.png';

function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeMobileCategory, setActiveMobileCategory] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<string>('home');

  const navigate = (page: string) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsMobileMenuOpen(false);
    setActiveCategory(null);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800 bg-slate-50 normal-case">
      
      <div className="bg-blue-600 text-white text-[13px] py-2 px-4 text-center font-medium">
        Оригинальные запчасти BMW и Mini • Быстрая доставка по всей России • Более 200 000 позиций в каталоге
      </div>

      <header className="bg-white text-slate-800 border-b border-slate-200 sticky top-0 z-50 transition-all shadow-sm">
        <div className="w-full mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
          
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-blue-600 transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div className="flex items-center cursor-pointer group" onClick={() => navigate('home')}>
              <img src={logo} alt="FG SEVER" className="h-10 w-auto" />
            </div>
          </div>

          <div className="hidden lg:flex flex-1 max-w-2xl mx-8 relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
              <Search size={18} />
            </div>
            <input 
              type="text" 
              placeholder="Поиск по номеру детали или названию..." 
              className="w-full bg-slate-100 text-slate-900 border border-transparent rounded-full py-3 pl-12 pr-6 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all font-sans text-sm"
            />
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            <div className="hidden md:flex items-center gap-3 text-slate-600">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <Phone size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-400 font-medium">Связаться с нами</span>
                <a href="tel:+74991100045" className="text-sm font-bold text-slate-800 hover:text-blue-600 transition-colors">+7 (499) 110–00–45</a>
              </div>
            </div>
            
            <a href="#" className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors">
               <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                 <User size={20} />
               </div>
            </a>

            <a href="#" className="flex items-center gap-3 text-slate-600 hover:text-blue-600 transition-colors">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20">
                  <ShoppingCart size={18} />
                </div>
                <span className="absolute -top-1 -right-1 bg-slate-900 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  0
                </span>
              </div>
              <div className="hidden lg:flex flex-col">
                <span className="text-xs text-slate-400 font-medium">Корзина</span>
                <span className="text-sm font-bold text-slate-800">0 ₽</span>
              </div>
            </a>
          </div>
        </div>

        <div className="hidden lg:block border-t border-slate-100 bg-white relative z-50" onMouseLeave={() => setActiveCategory(null)}>
          <div className="w-full mx-auto px-4 md:px-6 relative">
            <nav className="flex space-x-1 items-end overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pt-2 relative z-20">
              {categories.map((cat) => (
                <button 
                  key={cat.id} 
                  onMouseEnter={() => setActiveCategory(cat.id)}
                  onClick={() => navigate(cat.id)}
                  className={`flex-shrink-0 flex items-center gap-2 px-5 pt-3.5 pb-3 text-[14px] font-semibold transition-all whitespace-nowrap border-b-2
                    ${activeCategory === cat.id 
                      ? 'border-blue-600 text-blue-600' 
                      : 'border-transparent text-slate-600 hover:text-blue-600 hover:border-blue-200'
                    }`}
                >
                  {cat.title}
                  <ChevronDown size={14} className={`transition-transform duration-300 ${activeCategory === cat.id ? 'rotate-180 text-blue-600' : 'opacity-40'}`} />
                </button>
              ))}
            </nav>

            {activeCategory && (
              <div className="absolute top-full left-0 right-0 bg-white border-t border-slate-100 shadow-xl z-10 pt-6 pb-8 px-6 md:px-8 flex flex-wrap gap-2 rounded-b-2xl">
                {categories.find(c => c.id === activeCategory)?.links.map((link, idx) => (
                  <a 
                    key={idx} 
                    href={link.href} 
                    className="px-4 py-2 border border-slate-200 bg-slate-50 rounded-lg text-[13px] font-medium text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-colors"
                  >
                    {link.title}
                  </a>
                ))}
              </div>
            )}
            
            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 md:w-32 bg-gradient-to-l from-white to-transparent z-30" />
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 w-full bg-white border-b border-slate-200 shadow-lg p-4 z-50">
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={16} />
              </div>
              <input
                type="text"
                placeholder="Поиск деталей..."
                className="w-full bg-slate-100 text-slate-900 border border-transparent rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 text-sm"
              />
            </div>
            <ul className="flex flex-col gap-1 max-h-[65vh] overflow-y-auto">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                    onClick={() => setActiveMobileCategory(activeMobileCategory === cat.id ? null : cat.id)}
                  >
                    {cat.title}
                    <ChevronDown size={16} className={`transition-transform duration-200 opacity-50 ${activeMobileCategory === cat.id ? 'rotate-180 opacity-100 text-blue-600' : ''}`} />
                  </button>
                  {activeMobileCategory === cat.id && (
                    <div className="flex flex-col gap-0.5 pl-4 pb-2">
                      {cat.links.map((link, idx) => (
                        <a
                          key={idx}
                          href={link.href}
                          className="block px-4 py-2 text-sm text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          {link.title}
                        </a>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </header>

      {currentPage.startsWith('product-') ? (
        <ProductPage productId={Number(currentPage.replace('product-', ''))} onNavigate={navigate} />
      ) : currentPage !== 'home' ? (
        <CategoryPage categoryId={currentPage} onNavigate={navigate} />
      ) : (
      <main className="flex-1 w-full mx-auto px-4 md:px-6 pb-20">
        
        <section className="relative w-full h-[500px] md:h-[600px] lg:h-[700px] rounded-3xl overflow-hidden mt-6 shadow-xl shadow-blue-900/5 bg-slate-900">
          {/* Images only — crossfade cleanly */}
          {heroSlides.map((slide, index) => (
            <img
              key={index}
              src={slide.image}
              alt={slide.title}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
                index === activeSlide ? 'opacity-60' : 'opacity-0'
              }`}
            />
          ))}

          {/* Static gradient — always on top of images, never flickers */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/50 to-slate-900/10 z-10" />

          {/* Text content crossfades per slide */}
          <div className="absolute inset-0 z-20 flex items-center">
            <div className="px-8 md:px-16 w-full max-w-xl">
              <div className="grid">
                {heroSlides.map((slide, index) => (
                  <div
                    key={index}
                    className={`col-start-1 row-start-1 transition-all duration-700 ${
                      index === activeSlide ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                    }`}
                  >
                    <h2 className="font-oswald font-semibold text-4xl md:text-5xl lg:text-7xl text-white mb-4 leading-tight">
                      {slide.title}
                    </h2>
                    <p className="text-blue-100 text-lg md:text-xl mb-8 font-medium">
                      {slide.subtitle}
                    </p>
                    <a href="#" className="inline-flex bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-8 rounded-full transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:-translate-y-0.5">
                      Перейти в каталог
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dots */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-3 z-20">
            {heroSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveSlide(index)}
                className={`h-2.5 rounded-full transition-all ${index === activeSlide ? 'bg-blue-500 w-8' : 'w-2.5 bg-white/40 hover:bg-white/70'}`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mt-4">
          {blockLinks.map((block, idx) => (
            <button key={idx} onClick={() => navigate(block.categoryId)} className="group block relative overflow-hidden rounded-[2rem] bg-slate-900 shadow-xl h-[240px] md:h-[350px] lg:h-[400px] text-left w-full">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 flex via-slate-900/40 to-transparent opacity-90 group-hover:opacity-100 transition-opacity z-10" />
              <img 
                src={block.image} 
                alt={block.title} 
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100"
              />
              <div className="absolute inset-0 p-6 md:p-8 z-20 flex flex-col justify-end items-center text-center">
                <h3 className="text-white font-oswald font-semibold text-2xl md:text-3xl lg:text-4xl m-0 drop-shadow-xl translate-y-2 group-hover:translate-y-0 transition-transform duration-500">{block.title}</h3>
                <span className="text-blue-400 text-sm md:text-base font-semibold opacity-0 group-hover:opacity-100 transition-all duration-500 mt-2 translate-y-4 group-hover:translate-y-0">Смотреть каталог &rarr;</span>
              </div>
            </button>
          ))}
        </section>

        <section className="my-16 md:my-24">
          <h2 className="font-oswald font-semibold text-4xl md:text-5xl text-slate-800 m-0 mb-8 md:mb-12 tracking-tight">
            Почему выбирают нас
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            <div className="bg-white border border-slate-200 rounded-[2rem] p-8 md:p-10 flex flex-col group hover:border-blue-300 hover:shadow-md transition-all duration-300">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-blue-600 mb-8 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                <ShieldCheck size={28} strokeWidth={2} />
              </div>
              <h4 className="font-oswald font-semibold text-2xl text-slate-900 mb-4 leading-tight">Только<br />оригинал</h4>
              <p className="text-slate-500 text-sm leading-relaxed">Поставляем исключительно оригинальные запчасти BMW и Mini с гарантией производителя.</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-[2rem] p-8 md:p-10 flex flex-col group hover:border-blue-300 hover:shadow-md transition-all duration-300">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-blue-600 mb-8 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                <Search size={28} strokeWidth={2} />
              </div>
              <h4 className="font-oswald font-semibold text-2xl text-slate-900 mb-4 leading-tight">Более 200 000<br />позиций</h4>
              <p className="text-slate-500 text-sm leading-relaxed">Каталог деталей для всех моделей BMW и Mini — от кузовных элементов до электроники.</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-[2rem] p-8 md:p-10 flex flex-col group hover:border-blue-300 hover:shadow-md transition-all duration-300">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-blue-600 mb-8 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                <Truck size={28} strokeWidth={2} />
              </div>
              <h4 className="font-oswald font-semibold text-2xl text-slate-900 mb-4 leading-tight">Быстрая<br />доставка</h4>
              <p className="text-slate-500 text-sm leading-relaxed">Отправка в день заказа при наличии на складе. Доставка по всей России.</p>
            </div>

            <div className="bg-blue-600 border border-blue-600 rounded-[2rem] p-8 md:p-10 flex flex-col group relative overflow-hidden hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 transition-all duration-300">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-white mb-8 transition-all duration-300">
                <RefreshCcw size={28} strokeWidth={2} />
              </div>
              <h4 className="font-oswald font-semibold text-2xl text-white mb-4 leading-tight relative">Возврат<br />и обмен</h4>
              <p className="text-blue-100 text-sm leading-relaxed relative z-10">Возврат и обмен деталей в течение 30 дней. Гарантия качества на каждую позицию.</p>
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="flex items-end justify-between mb-8">
            <h2 className="font-oswald font-semibold text-3xl md:text-4xl text-slate-800 m-0">
              Новые поступления
            </h2>
            <a href="#" className="hidden sm:flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors gap-1">
              Все новинки <ChevronRight size={18} />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {products.map((product) => (
              <div key={product.id} onClick={() => navigate(`product-${product.id}`)} className="bg-white border text-center md:text-left border-slate-100 rounded-[2rem] flex flex-col group hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:border-slate-200 hover:-translate-y-1.5 transition-all relative overflow-hidden cursor-pointer">

                <div className="block relative aspect-[4/3] overflow-hidden">
                  <img
                    src={product.imageUrl}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>

                <div className="flex flex-col flex-1 p-8 pt-6 lg:p-10 lg:pt-8 bg-white z-10">
                  <span className="text-[13px] text-slate-400 mb-2 font-medium tracking-wide">
                    {product.sku}
                  </span>
                  <h3 className="font-oswald font-semibold text-2xl text-slate-900 leading-snug mb-8 group-hover:text-blue-600 transition-colors line-clamp-2">
                    {product.title}
                  </h3>
                  
                  <div className="mt-auto">
                    <div className="flex flex-wrap items-end md:justify-start justify-center gap-3 mb-4">
                      <span className="text-4xl font-oswald font-semibold text-slate-900 tracking-tight whitespace-nowrap">
                        {product.price}
                      </span>
                    </div>

                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center sm:hidden">
             <a href="#" className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors gap-1">
              Все новинки <ChevronRight size={16} />
            </a>
          </div>
        </section>

      </main>
      )}

      <footer className="bg-slate-950 pt-16 border-t border-slate-900">
        <div className="w-full mx-auto px-4 md:px-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-16">
            <div>
              <div className="flex items-center mb-6">
                <div className="font-oswald font-bold text-3xl text-white tracking-widest uppercase">
                  FGSEVER
                </div>
              </div>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                С 2014 года мы специализируемся на ремонте, тюнинге и дооснащении автомобилей BMW. Являемся экспертами в своем деле и гарантируем высокое качество работ.
              </p>
              <div className="flex gap-3">
                <a href="https://www.drive2.ru/o/FGSever" className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all font-bold text-xs" title="Drive2">
                  D2
                </a>
                <a href="https://www.youtube.com/channel/UCKmY606nJQvfmTJERgho6Pg" className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all">
                  <Youtube size={18} />
                </a>
                <a href="https://www.instagram.com/fgsever/" className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all">
                  <Instagram size={18} />
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-oswald text-xl font-medium text-white mb-6">Информация</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-slate-400 hover:text-blue-500 text-sm transition-colors">Политика конфиденциальности</a></li>
                <li><a href="#" className="text-slate-400 hover:text-blue-500 text-sm transition-colors">Доставка</a></li>
                <li><a href="#" className="text-slate-400 hover:text-blue-500 text-sm transition-colors">Оплата</a></li>
                <li><a href="#" className="text-slate-400 hover:text-blue-500 text-sm transition-colors">Политика возврата</a></li>
                <li><a href="#" className="text-slate-400 hover:text-blue-500 text-sm transition-colors">Правила магазина</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-oswald text-xl font-medium text-white mb-6">Наши услуги</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-slate-400 hover:text-blue-500 text-sm transition-colors">Техническое обслуживание</a></li>
                <li><a href="#" className="text-slate-400 hover:text-blue-500 text-sm transition-colors">Русификация и прошивка</a></li>
                <li><a href="#" className="text-slate-400 hover:text-blue-500 text-sm transition-colors">Дооснащение опциями</a></li>
                <li><a href="#" className="text-slate-400 hover:text-blue-500 text-sm transition-colors">Ремонт АКПП и ДВС</a></li>
                <li><a href="#" className="text-slate-400 hover:text-blue-500 text-sm transition-colors">Кодирование и диагностика</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-oswald text-xl font-medium text-white mb-6">Свяжитесь с нами</h4>
              <div className="space-y-4">
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  <strong className="text-slate-200 block mb-1">Наш адрес:</strong>
                  г. Москва, СВАО, <br />
                  ул. Декабристов, 45Бс2
                </p>
                
                <a href="tel:+74991100045" className="flex items-center gap-3 text-slate-300 hover:text-blue-500 transition-colors group">
                  <div className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center group-hover:border-blue-500 transition-colors">
                    <Phone size={16} />
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-500 font-medium mb-0.5">Телефон</span>
                    <span className="font-semibold text-sm">+7 (499) 110–00–45</span>
                  </div>
                </a>

                <a href="mailto:riverdale@inbox.ru" className="flex items-center gap-3 text-slate-300 hover:text-blue-500 transition-colors group">
                  <div className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center group-hover:border-blue-500 transition-colors">
                    <Mail size={16} />
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-500 font-medium mb-0.5">Email</span>
                    <span className="font-semibold text-sm">riverdale@inbox.ru</span>
                  </div>
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-xs">
              © {new Date().getFullYear()} FGSEVER. Все права защищены.
            </p>
            <div className="flex items-center gap-4 text-slate-600">
              <span className="text-sm font-semibold italic">Visa</span>
              <span className="text-sm font-semibold italic">MasterCard</span>
              <span className="text-sm font-semibold italic">Mir</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default App;
