export const categories = [
  {
    id: 'mechanical-parts',
    title: 'Механические запчасти',
    links: [
      'Двигатели в сборе',
      'Коробки передач',
      'Турбокомпрессоры',
      'Генераторы',
      'Стартеры',
      'Радиаторы',
      'Компрессоры кондиционера',
      'Катализаторы / DPF',
      'Воздушные фильтры',
      'Патрубки наддува',
      'Webasto',
      'Детали двигателя',
    ],
  },
  {
    id: 'car-electronics',
    title: 'Автоэлектроника',
    links: [
      'Блоки управления',
      'Датчики',
      'Камеры и модули',
      'MULF / ULF / Combox',
      'Аккумуляторы',
      'Проводка',
      'Антенны',
      'Датчики слепых зон',
      'Переключатели',
    ],
  },
  {
    id: 'interior',
    title: 'Интерьер',
    links: [
      'Подушки безопасности',
      'Сиденья и обивка',
      'Дверные карты',
      'Рулевые колеса',
      'Приборные панели',
      'Центральная консоль',
      'Климат-контроль',
      'Проекция на стекло',
      'Декор и планки',
      'Зеркала внутренние',
      'Подлокотники',
      'Коврики',
      'Беспроводные зарядки',
      'USB / AUX',
      'Потолки',
    ],
  },
  {
    id: 'lights',
    title: 'Освещение',
    links: [
      'Фары передние',
      'Фонари задние',
      'Противотуманные фары',
      'Модули освещения',
    ],
  },
  {
    id: 'audio-systems',
    title: 'Аудиосистемы',
    links: [
      'Динамики',
      'Усилители',
      'Сабвуферы',
      'Чейнджеры',
      'Решетки динамиков',
    ],
  },
  {
    id: 'body-parts',
    title: 'Кузовные запчасти',
    links: [
      'Бамперы',
      'Крылья',
      'Двери',
      'Капоты',
      'Крышки багажника',
      'Зеркала',
      'Решетки радиатора',
      'Пороги',
      'Выхлопные системы',
      'Дверные ручки',
      'Эмблемы',
      'Фаркопы',
      'Рейлинги и багажники',
    ],
  },
  {
    id: 'navigation-entertainment',
    title: 'Мультимедиа',
    links: [
      'Дисплеи',
      'Головные устройства',
      'Навигация',
      'Джойстики',
      'Чейнджеры',
      'Мультимедиа',
    ],
  },
  {
    id: 'suspension',
    title: 'Подвеска',
    links: [
      'Амортизаторы',
      'Рычаги',
      'Стабилизаторы',
      'Ступицы',
      'Приводные валы',
      'Редукторы',
      'Рулевые рейки',
      'Подрамники',
    ],
  },
  {
    id: 'brake-system',
    title: 'Тормозная система',
    links: [
      'Суппорты',
      'Тормозные диски',
      'Тормозные колодки',
      'Насосы ABS',
      'Тормозные трубки',
    ],
  },
  {
    id: 'wheels-rims-tires',
    title: 'Колеса и шины',
    links: [
      'Диски',
      'Шины',
      'Комплекты колес',
    ],
  },
];

import catalogJson from './generated/catalog.json';

export interface DonorInfo {
  name: string;
  brand: string;
  model: string;
  year: string;
  body: string;
  engine: string;
  mileage: string;
  color: string;
  transmission: string;
  drive: string;
  vin: string;
  video: string;
  steeringWheel: string;
  trim: string;
}

export interface CatalogProduct {
  id: number;
  sku: string;
  title: string;
  donorId: string;
  brand: string;
  model: string;
  year: string;
  body: string;
  engine: string;
  imageUrl: string;
  photos: string[];
  color: string;
  conditionRaw: string;
  condition: string;
  isNew: boolean;
  price: number;
  priceFormatted: string;
  outOfStock: boolean;
  categoryId: string;
  oem: string;
  position: string;
  crossNumbers: string[];
  description: string;
  subCategory: string;
  donor: DonorInfo | null;
}

export const allProducts: CatalogProduct[] = (catalogJson as CatalogProduct[]).map(p => ({
  ...p,
  outOfStock: p.price <= 0,
}));

// Home page featured: first 6 items with photo and price
export const products = allProducts
  .filter(p => p.imageUrl && p.price > 0)
  .slice(0, 6)
  .map(p => ({
    id: p.id,
    title: p.title,
    sku: p.oem || p.sku,
    price: p.priceFormatted,
    imageUrl: p.imageUrl,
    isNew: p.isNew,
    isSale: false,
    outOfStock: p.outOfStock,
  }));

export const heroSlides = [
  {
    image: "https://alpincars.com/modules/ps_imageslider/images/26331a8568fe8553f2669e425a2c19d18a239093_01.webp",
    title: "Запчасти для Bmw и Mini",
    subtitle: "Только оригинальные детали для вашего авто"
  },
  {
    image: "https://alpincars.com/modules/ps_imageslider/images/fa846bf4dd23d57dafbe59eedb1d6978383a73f3_01.webp",
    title: "Более 200 000 деталей в наличии",
    subtitle: "Широкий ассортимент на нашем складе"
  },
  {
    image: "https://alpincars.com/modules/ps_imageslider/images/df343aef4297fba3dee26f95d69b6e46872d9a77_02.webp",
    title: "Обновите свой автомобиль",
    subtitle: "Современные решения для ремонта и тюнинга"
  }
];

export const blockLinks = [
  { title: "Автозвук", image: "https://alpincars.com/modules/flslider/images/5631124aeb31b19825311348405f1311fbde2fd4_a01.webp", categoryId: "audio-systems" },
  { title: "Детали салона", image: "https://alpincars.com/modules/flslider/images/17874f0ab615043674bd7013cb7c40013df4460b_a02.webp", categoryId: "interior" },
  { title: "Освещение", image: "https://alpincars.com/modules/flslider/images/bd3e7718d73721511c3bc0675e6c72f87766df3c_a03.webp", categoryId: "lights" },
  { title: "Подвеска и тормоза", image: "https://alpincars.com/modules/flslider/images/0dc879c134004f5e6c473990c488ba22b5b8398c_a04.webp", categoryId: "suspension" }
];
