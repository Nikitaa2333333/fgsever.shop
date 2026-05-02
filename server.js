import express from 'express';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { parse } from 'csv-parse/sync';
import db from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

const BAZON_PRODUCTS_URL = 'https://baz-on.ru/export/c3677/07d7c/partssever-site-products.csv';
const BAZON_CARS_URL    = 'https://baz-on.ru/export/c3677/7c88b/partssever-site-carsrc.csv';
const SYNC_INTERVAL_MS  = 20 * 60 * 1000; // 20 минут

let lastSync = null;
let syncError = null;

// --- Утилиты парсинга ---
function decode1251(buffer) {
  return new TextDecoder('windows-1251').decode(buffer);
}

// --- Category detection ---
const CATEGORY_MAP = [
  { id: 'mechanical-parts',         keywords: ['двигател', 'генератор', 'стартер', 'турбо', 'компрессор', 'коробка', 'кпп', 'радиатор', 'патрубок', 'охладитель', 'катализатор', 'фильтр', 'webasto', 'помпа', 'маслян'] },
  { id: 'car-electronics',          keywords: ['блок управления', 'аккумулятор', 'датчик', 'модуль', 'проводка', 'лямбда', 'антенна', 'реле', 'kafas', 'mulf', 'combox', 'видеомодул', 'камер', 'переключател'] },
  { id: 'interior',                 keywords: ['подушка безопасности', 'приборн', 'руль', 'консоль', 'зеркало внутренн', 'сиден', 'дверн карт', 'потолок', 'подлокотник', 'ковёр', 'коврик', 'декоративн', 'беспроводн', 'климат', 'usb', 'aux', 'проекц'] },
  { id: 'lights',                   keywords: ['фара', 'фонарь', 'противотуманн', 'освещен', 'поворотник', 'стоп-сигнал'] },
  { id: 'audio-systems',            keywords: ['динамик', 'усилитель', 'аудио', 'радио', 'колонк', 'сабвуф', 'чейнджер'] },
  { id: 'body-parts',               keywords: ['крыло', 'дверь', 'капот', 'бампер', 'крышка багажник', 'зеркало', 'решетка', 'порог', 'багажник', 'рейлинг', 'фаркоп', 'выхлоп', 'эмблема', 'ручка'] },
  { id: 'navigation-entertainment', keywords: ['дисплей', 'навигац', 'мультимедиа', 'джойстик', 'головное', 'монитор'] },
  { id: 'suspension',               keywords: ['амортизатор', 'рычаг', 'стабилизатор', 'подрамник', 'ступиц', 'привод', 'редуктор', 'рулевая рейка', 'вал'] },
  { id: 'brake-system',             keywords: ['тормоз', 'суппорт', 'колодк', 'диск тормоз', 'abs', 'трубк'] },
  { id: 'wheels-rims-tires',        keywords: ['диск', 'шина', 'колесо', 'резина'] },
];

function detectCategory(name) {
  const lower = name.toLowerCase();
  for (const cat of CATEGORY_MAP) {
    if (cat.keywords.some(kw => lower.includes(kw))) return cat.id;
  }
  return 'mechanical-parts';
}

// Подкатегории — keyword-matching внутри каждой категории
const SUBCATEGORY_MAP = {
  'mechanical-parts': [
    { name: 'Двигатели в сборе',      keywords: ['двигатель в сборе', 'мотор в сборе', 'двс в сборе'] },
    { name: 'Коробки передач',         keywords: ['коробка передач', 'кпп', 'акпп', 'мкпп', 'вариатор'] },
    { name: 'Турбокомпрессоры',        keywords: ['турбо', 'турбина', 'турбокомпрессор'] },
    { name: 'Генераторы',              keywords: ['генератор'] },
    { name: 'Стартеры',                keywords: ['стартер'] },
    { name: 'Радиаторы',               keywords: ['радиатор'] },
    { name: 'Компрессоры кондиционера',keywords: ['компрессор кондиц'] },
    { name: 'Катализаторы / DPF',      keywords: ['катализатор', 'dpf', 'сажевый'] },
    { name: 'Воздушные фильтры',       keywords: ['воздушный фильтр', 'фильтр воздуш'] },
    { name: 'Патрубки наддува',        keywords: ['патрубок'] },
    { name: 'Webasto',                 keywords: ['webasto'] },
    { name: 'Детали двигателя',        keywords: ['двигател', 'помпа', 'маслян', 'охладитель'] },
  ],
  'car-electronics': [
    { name: 'Блоки управления',        keywords: ['блок управления', 'блок модуль', 'ecu', 'egs', 'dme', 'cas'] },
    { name: 'Датчики',                 keywords: ['датчик', 'лямбда', 'nox'] },
    { name: 'Камеры и модули',         keywords: ['камер', 'kafas', 'видеомодул'] },
    { name: 'MULF / ULF / Combox',     keywords: ['mulf', 'ulf', 'combox'] },
    { name: 'Аккумуляторы',            keywords: ['аккумулятор'] },
    { name: 'Проводка',                keywords: ['проводка', 'жгут'] },
    { name: 'Антенны',                 keywords: ['антенна'] },
    { name: 'Датчики слепых зон',      keywords: ['слепых зон', 'bsm'] },
    { name: 'Переключатели',           keywords: ['переключател', 'реле'] },
  ],
  'interior': [
    { name: 'Подушки безопасности',    keywords: ['подушка безопасности', 'airbag', 'аирбаг'] },
    { name: 'Сиденья и обивка',        keywords: ['сиден', 'обивк'] },
    { name: 'Дверные карты',           keywords: ['дверн карт', 'карта двер'] },
    { name: 'Рулевые колеса',          keywords: ['руль', 'рулевое колесо'] },
    { name: 'Приборные панели',        keywords: ['приборн', 'щиток прибор'] },
    { name: 'Центральная консоль',     keywords: ['консол'] },
    { name: 'Климат-контроль',         keywords: ['климат'] },
    { name: 'Проекция на стекло',      keywords: ['проекц', 'hud'] },
    { name: 'Декор и планки',          keywords: ['декоративн', 'планк', 'накладк'] },
    { name: 'Зеркала внутренние',      keywords: ['зеркало внутренн', 'зеркало салон'] },
    { name: 'Подлокотники',            keywords: ['подлокотник'] },
    { name: 'Коврики',                 keywords: ['коврик', 'ковёр'] },
    { name: 'Беспроводные зарядки',    keywords: ['беспроводн'] },
    { name: 'USB / AUX',               keywords: ['usb', 'aux'] },
    { name: 'Потолки',                 keywords: ['потолок'] },
  ],
  'lights': [
    { name: 'Фары передние',           keywords: ['фара передн', 'фара прав', 'фара лев'] },
    { name: 'Фонари задние',           keywords: ['фонарь задн', 'фонарь прав', 'фонарь лев'] },
    { name: 'Противотуманные фары',    keywords: ['противотуманн'] },
    { name: 'Модули освещения',        keywords: ['модуль освещ', 'блок фар', 'адаптивн'] },
  ],
  'audio-systems': [
    { name: 'Динамики',                keywords: ['динамик', 'колонк'] },
    { name: 'Усилители',               keywords: ['усилитель'] },
    { name: 'Сабвуферы',               keywords: ['сабвуф'] },
    { name: 'Чейнджеры',               keywords: ['чейнджер'] },
    { name: 'Решетки динамиков',       keywords: ['решетка динамик', 'решётка динамик'] },
  ],
  'body-parts': [
    { name: 'Бамперы',                 keywords: ['бампер'] },
    { name: 'Крылья',                  keywords: ['крыло', 'крыл'] },
    { name: 'Двери',                   keywords: ['дверь', 'двер'] },
    { name: 'Капоты',                  keywords: ['капот'] },
    { name: 'Крышки багажника',        keywords: ['крышка багажник'] },
    { name: 'Зеркала',                 keywords: ['зеркало'] },
    { name: 'Решетки радиатора',       keywords: ['решетка радиатор', 'решётка радиатор'] },
    { name: 'Пороги',                  keywords: ['порог'] },
    { name: 'Выхлопные системы',       keywords: ['выхлоп'] },
    { name: 'Дверные ручки',           keywords: ['ручка двер', 'дверная ручка'] },
    { name: 'Эмблемы',                 keywords: ['эмблема'] },
    { name: 'Фаркопы',                 keywords: ['фаркоп'] },
    { name: 'Рейлинги и багажники',    keywords: ['рейлинг', 'багажник'] },
  ],
  'navigation-entertainment': [
    { name: 'Дисплеи',                 keywords: ['дисплей', 'монитор', 'экран'] },
    { name: 'Головные устройства',     keywords: ['головное', 'магнитол'] },
    { name: 'Навигация',               keywords: ['навигац'] },
    { name: 'Джойстики',               keywords: ['джойстик', 'контроллер'] },
    { name: 'Чейнджеры',               keywords: ['чейнджер'] },
    { name: 'Мультимедиа',             keywords: ['мультимедиа'] },
  ],
  'suspension': [
    { name: 'Амортизаторы',            keywords: ['амортизатор'] },
    { name: 'Рычаги',                  keywords: ['рычаг'] },
    { name: 'Стабилизаторы',           keywords: ['стабилизатор'] },
    { name: 'Ступицы',                 keywords: ['ступиц'] },
    { name: 'Приводные валы',          keywords: ['привод', 'полуось'] },
    { name: 'Редукторы',               keywords: ['редуктор'] },
    { name: 'Рулевые рейки',           keywords: ['рулевая рейка', 'рейка рул'] },
    { name: 'Подрамники',              keywords: ['подрамник'] },
  ],
  'brake-system': [
    { name: 'Суппорты',                keywords: ['суппорт'] },
    { name: 'Тормозные диски',         keywords: ['диск тормоз', 'тормозной диск'] },
    { name: 'Тормозные колодки',       keywords: ['колодк'] },
    { name: 'Насосы ABS',              keywords: ['abs', 'насос abs'] },
    { name: 'Тормозные трубки',        keywords: ['трубк'] },
  ],
  'wheels-rims-tires': [
    { name: 'Диски',                   keywords: ['диск'] },
    { name: 'Шины',                    keywords: ['шина', 'резина'] },
    { name: 'Комплекты колес',         keywords: ['комплект колес', 'колесо'] },
  ],
};

function detectSubCategory(name, categoryId) {
  const lower = name.toLowerCase();
  const subcats = SUBCATEGORY_MAP[categoryId];
  if (!subcats) return '';
  for (const sub of subcats) {
    if (sub.keywords.some(kw => lower.includes(kw))) return sub.name;
  }
  return '';
}

function formatCondition(raw) {
  if (raw === 'new') return 'Новый';
  if (raw === 'used') return 'Б/У';
  if (raw === 'contract') return 'Контракт';
  return raw;
}

function formatPosition(fb, lr, ud) {
  const map = { F: 'Передн.', B: 'Задн.', L: 'Лев.', R: 'Прав.', U: 'Верх.', D: 'Низ.' };
  return [map[fb], map[lr], map[ud]].filter(Boolean).join(' ');
}

// --- Подготовка SQL-запросов ---
const insertCarStmt = db.prepare(`
  INSERT INTO cars (id, name, brand, model, year, body, engine, steeringWheel, transmission, transmissionModel, drive, trim, vin, description, video, mileage, color, price)
  VALUES (@id, @name, @brand, @model, @year, @body, @engine, @steeringWheel, @transmission, @transmissionModel, @drive, @trim, @vin, @description, @video, @mileage, @color, @price)
`);

const insertProductStmt = db.prepare(`
  INSERT INTO products (sku, title, titleSearch, donorId, brand, model, year, body, engine, positionRaw_fb, positionRaw_lr, positionRaw_ud, position, color, oem, crossNumbers, manufacturer, description, photos, imageUrl, conditionRaw, condition, isNew, price, priceFormatted, warehouse, outOfStock, categoryId, subCategory)
  VALUES (@sku, @title, @titleSearch, @donorId, @brand, @model, @year, @body, @engine, @positionRaw_fb, @positionRaw_lr, @positionRaw_ud, @position, @color, @oem, @crossNumbers, @manufacturer, @description, @photos, @imageUrl, @conditionRaw, @condition, @isNew, @price, @priceFormatted, @warehouse, @outOfStock, @categoryId, @subCategory)
`);

const clearCarsStmt = db.prepare('DELETE FROM cars');
const clearProductsStmt = db.prepare('DELETE FROM products');

// Транзакция для обновления всей базы
const updateDatabaseTx = db.transaction((carsRecords, productsRecords) => {
  clearCarsStmt.run();
  clearProductsStmt.run();

  // Добавляем машины
  let carsCount = 0;
  for (const r of carsRecords) {
    insertCarStmt.run({
      id: r['Номер'],
      name: r['Поставка'],
      brand: r['Марка'],
      model: r['Модель'],
      year: r['Год'],
      body: r['Кузов'],
      engine: r['Двигатель'],
      steeringWheel: r['Руль (L/R)']?.split(':')[0] || '',
      transmission: r['Тип КПП (/automatic/manual/variator)']?.split(':')[0] || '',
      transmissionModel: r['Модель КПП'],
      drive: r['Привод (/FD/BD/4WD)']?.split(':')[0] || '',
      trim: r['Комплектация'],
      vin: r['VIN'],
      description: r['Описание'],
      video: r['Видео'],
      mileage: r['Пробег'],
      color: r['Цвет'],
      price: r['Стоимость']
    });
    carsCount++;
  }

  // Добавляем товары
  let productsCount = 0;
  for (const r of productsRecords) {
    const photos = r['Фото'] ? r['Фото'].split(',').map(p => p.trim()).filter(Boolean) : [];
    const imageUrl = photos[0] || '';
    // товары без фото включаем в каталог

    const price = parseFloat(r['Цена']) || 0;
    const conditionRaw = r['Новый/БУ (new/used/contract)'] || '';
    const title = r['Наименование'] || '';
    
    const crossNumbers = r['Кросс-номера']
      ? r['Кросс-номера'].split(',').map(n => n.trim()).filter(Boolean)
      : [];

    insertProductStmt.run({
      sku: r['Артикул'] || '',
      title: title,
      titleSearch: title.toLowerCase(),
      donorId: r['Донор'] || '',
      brand: r['Марка'] || '',
      model: r['Модель'] || '',
      year: r['Год'] || '',
      body: r['Кузов'] || '',
      engine: r['Двигатель'] || '',
      positionRaw_fb: r['Перед/Зад (F/B)'] || '',
      positionRaw_lr: r['Лев/Прав (L/R)'] || '',
      positionRaw_ud: r['Верх/Низ (U/D)'] || '',
      position: formatPosition(r['Перед/Зад (F/B)'], r['Лев/Прав (L/R)'], r['Верх/Низ (U/D)']),
      color: r['Цвет'] || '',
      oem: r['Маркировка'] || '',
      crossNumbers: JSON.stringify(crossNumbers),
      manufacturer: r['Производитель'] || '',
      description: r['Комментарий'] || '',
      photos: JSON.stringify(photos),
      imageUrl: imageUrl,
      conditionRaw: conditionRaw,
      condition: formatCondition(conditionRaw),
      isNew: conditionRaw === 'new' ? 1 : 0,
      price: price,
      priceFormatted: price > 0 ? `${price.toLocaleString('ru-RU')} ₽` : 'Цена по запросу',
      warehouse: r['Склад'] || '',
      outOfStock: (!r['Склад'] || r['Склад'].trim() === '' || price <= 0) ? 1 : 0,
      categoryId: detectCategory(title),
      subCategory: detectSubCategory(title, detectCategory(title)),
    });
    productsCount++;
  }

  return { carsCount, productsCount };
});

// Применяет ручные правки из таблицы overrides к таблице products
function applyOverrides() {
  const overrides = db.prepare('SELECT sku, categoryId, subCategory FROM overrides').all();
  if (!overrides.length) return;
  const stmt = db.prepare('UPDATE products SET categoryId = ?, subCategory = ? WHERE sku = ?');
  const tx = db.transaction(() => {
    for (const ov of overrides) stmt.run(ov.categoryId, ov.subCategory ?? '', ov.sku);
  });
  tx();
  console.log(`✓ Применено ручных правок: ${overrides.length}`);
}

// --- Main sync function ---
async function syncFromBazon() {
  console.log(`[${new Date().toLocaleTimeString()}] Синхронизация с Bazon...`);
  try {
    const [productsRes, carsRes] = await Promise.all([
      fetch(BAZON_PRODUCTS_URL),
      fetch(BAZON_CARS_URL),
    ]);

    if (!productsRes.ok || !carsRes.ok) throw new Error('Ошибка загрузки с Bazon');

    const [productsBuf, carsBuf] = await Promise.all([
      productsRes.arrayBuffer(),
      carsRes.arrayBuffer(),
    ]);

    // Используем csv-parse для точного парсинга (учитывает переносы внутри кавычек)
    const carsRecords = parse(decode1251(new Uint8Array(carsBuf)), { delimiter: ';', columns: true, skip_empty_lines: true, relax_quotes: true });
    const productsRecords = parse(decode1251(new Uint8Array(productsBuf)), { delimiter: ';', columns: true, skip_empty_lines: true, relax_quotes: true });

    // Сохраняем в SQLite
    const { carsCount, productsCount } = updateDatabaseTx(carsRecords, productsRecords);

    // Применяем ручные правки категорий поверх keyword-matching
    applyOverrides();

    lastSync = new Date();
    syncError = null;

    console.log(`✓ SQLite обновлена: ${productsCount} запчастей, ${carsCount} доноров`);
  } catch (err) {
    syncError = err.message;
    console.error('✗ Ошибка синхронизации:', err.message);
  }
}


// --- API routes ---
app.use(express.json());

// --- Аудит категорий ---
app.get('/admin', (req, res) => {
  const { cat = '', q = '', prob = '', page = '1' } = req.query;
  const PAGE_SIZE = 100;

  const CATS = [
    { id: 'mechanical-parts',         label: 'Механика',    color: '#1565c0' },
    { id: 'car-electronics',          label: 'Электроника', color: '#2e7d32' },
    { id: 'interior',                 label: 'Интерьер',    color: '#880e4f' },
    { id: 'lights',                   label: 'Освещение',   color: '#e65100' },
    { id: 'audio-systems',            label: 'Аудио',       color: '#6a1b9a' },
    { id: 'body-parts',               label: 'Кузов',       color: '#00695c' },
    { id: 'navigation-entertainment', label: 'Мультимедиа', color: '#283593' },
    { id: 'suspension',               label: 'Подвеска',    color: '#bf360c' },
    { id: 'brake-system',             label: 'Тормоза',     color: '#b71c1c' },
    { id: 'wheels-rims-tires',        label: 'Диски/шины',  color: '#424242' },
  ];
  const KW_MAP = [
    { id: 'mechanical-parts',         kws: ['двигател','генератор','стартер','турбо','компрессор','коробка','кпп','радиатор','патрубок','охладитель','катализатор','фильтр','webasto','помпа','маслян'] },
    { id: 'car-electronics',          kws: ['блок управления','аккумулятор','датчик','модуль','проводка','лямбда','антенна','реле','kafas','mulf','combox','видеомодул','камер','переключател'] },
    { id: 'interior',                 kws: ['подушка безопасности','приборн','руль','консоль','зеркало внутренн','сиден','дверн карт','потолок','подлокотник','ковёр','коврик','декоративн','беспроводн','климат','usb','aux','проекц'] },
    { id: 'lights',                   kws: ['фара','фонарь','противотуманн','освещен','поворотник','стоп-сигнал'] },
    { id: 'audio-systems',            kws: ['динамик','усилитель','аудио','радио','колонк','сабвуф','чейнджер'] },
    { id: 'body-parts',               kws: ['крыло','дверь','капот','бампер','крышка багажник','зеркало','решетка','порог','багажник','рейлинг','фаркоп','выхлоп','эмблема','ручка'] },
    { id: 'navigation-entertainment', kws: ['дисплей','навигац','мультимедиа','джойстик','головное','монитор'] },
    { id: 'suspension',               kws: ['амортизатор','рычаг','стабилизатор','подрамник','ступиц','привод','редуктор','рулевая рейка','вал'] },
    { id: 'brake-system',             kws: ['тормоз','суппорт','колодк','диск тормоз','abs','трубк'] },
    { id: 'wheels-rims-tires',        kws: ['диск','шина','колесо','резина'] },
  ];
  const PROBS = [
    { pattern: /усилитель/i,                                                                         wrongCat: 'audio-systems', why: 'Усилитель тормозов/бампера — не аудио' },
    { pattern: /рулев.{0,5}колонк|колонк.{0,10}рул/i,                                               wrongCat: 'audio-systems', why: 'Рулевая колонка — не аудио' },
    { pattern: /амортизатор.{0,15}(капот|багажник)|((капот|багажник).{0,15}амортизатор)/i,          wrongCat: 'suspension',    why: 'Амортизатор капота/багажника — не подвеска' },
    { pattern: /привод.{0,10}(зеркал|двер|замк)|((зеркал|двер).{0,10}привод)/i,                    wrongCat: 'suspension',    why: 'Привод зеркала/двери — не подвеска' },
    { pattern: /трубк.{0,10}(кондиц|топлив|масл|охлад)|((кондиц|топлив|масл|охлад).{0,10}трубк)/i,wrongCat: 'brake-system',  why: 'Трубка кондиционера/масла — не тормоза' },
    { pattern: /развальн/i,                                                                          wrongCat: 'suspension',    why: 'Рычаг развальный — проверь' },
  ];

  function findTrigger(title) {
    const lower = title.toLowerCase();
    for (const c of KW_MAP) for (const kw of c.kws) if (lower.includes(kw)) return kw;
    return '';
  }
  function findProblem(title, catId) {
    for (const p of PROBS) if (p.wrongCat === catId && p.pattern.test(title)) return p.why;
    return '';
  }
  function e(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  const all = db.prepare('SELECT title, sku, categoryId, subCategory, price FROM products ORDER BY categoryId, title').all()
    .map(r => ({ ...r, trigger: findTrigger(r.title), problem: findProblem(r.title, r.categoryId) }));

  // Статистика
  const stats = {};
  CATS.forEach(c => { stats[c.id] = { total: 0, problems: 0 }; });
  all.forEach(r => {
    if (!stats[r.categoryId]) stats[r.categoryId] = { total: 0, problems: 0 };
    stats[r.categoryId].total++;
    const isProblematic = r.problem || !r.trigger || !r.subCategory;
    if (isProblematic) stats[r.categoryId].problems++;
  });
  const totalProblems = all.filter(r => r.problem || !r.trigger || !r.subCategory).length;

  // Частота ключевых слов
  const kwFreq = {};
  KW_MAP.forEach(c => c.kws.forEach(kw => { kwFreq[kw] = 0; }));
  all.forEach(r => { if (r.trigger) kwFreq[r.trigger] = (kwFreq[r.trigger]||0) + 1; });

  // Фильтрация
  let filtered = all;
  if (cat)          filtered = filtered.filter(r => r.categoryId === cat);
  if (q)            filtered = filtered.filter(r => r.title.toLowerCase().includes(q.toLowerCase()) || r.sku.toLowerCase().includes(q.toLowerCase()));
  if (prob === '1') filtered = filtered.filter(r => r.problem || !r.trigger || !r.subCategory);

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const curPage = Math.min(Math.max(1, parseInt(page)), pages);
  const pageRows = filtered.slice((curPage-1)*PAGE_SIZE, curPage*PAGE_SIZE);

  const catColor = Object.fromEntries(CATS.map(c => [c.id, c.color]));
  const catLabel = Object.fromEntries(CATS.map(c => [c.id, c.label]));

  const statsCards = CATS.map(c => {
    const s = stats[c.id];
    const active = c.id === cat ? ' active' : '';
    return '<a class="sc' + active + '" href="?cat=' + c.id + '&q=' + encodeURIComponent(q) + '&prob=' + prob + '" style="border-left:4px solid ' + c.color + '">'
      + '<div class="sc-label">' + c.label + '</div>'
      + '<div class="sc-num" style="color:' + c.color + '">' + s.total + '</div>'
      + (s.problems ? '<div class="sc-prob">⚠ ' + s.problems + '</div>' : '<div class="sc-ok">✓ ок</div>')
      + '</a>';
  }).join('');

  const kwRows = KW_MAP.map(c => {
    const kws = c.kws.map(kw => {
      const cnt = kwFreq[kw]||0;
      return '<span class="' + (cnt===0?'kz':'ko') + '" title="' + cnt + ' товаров">' + e(kw) + ' <b>' + cnt + '</b></span>';
    }).join('');
    return '<tr><td class="kc" style="color:' + catColor[c.id] + '">' + catLabel[c.id] + '</td><td>' + kws + '</td></tr>';
  }).join('');

  const tableRows = pageRows.map((r, i) => {
    const color = catColor[r.categoryId] || '#999';
    const label = catLabel[r.categoryId] || r.categoryId;
    const isFallback = !r.trigger;
    const noSub = !r.subCategory;
    const issues = [];
    if (r.problem)  issues.push(r.problem);
    if (isFallback) issues.push('Нет категории — попал в Механику по умолчанию');
    if (noSub)      issues.push('Нет подкатегории');
    const isRed = issues.length > 0;
    const rowCls = isRed ? ' class="pr"' : '';
    const kw = r.trigger ? '<span class="kt">' + e(r.trigger) + '</span>' : '<span class="kf">фоллбэк</span>';
    const subCell = noSub ? '<span class="no-sub">не задана</span>' : e(r.subCategory);
    return '<tr' + rowCls + '>'
      + '<td class="tn">' + ((curPage-1)*PAGE_SIZE+i+1) + '</td>'
      + '<td class="tt"><span class="tit">' + e(r.title) + '</span><br><span class="sku">' + e(r.sku) + '</span></td>'
      + '<td><span class="cb" style="background:' + color + '20;color:' + color + ';border:1px solid ' + color + '40">' + label + '</span></td>'
      + '<td class="ts">' + subCell + '</td>'
      + '<td>' + kw + '</td>'
      + '<td class="tp">' + issues.map(e).join('<br>') + '</td>'
      + '<td class="tpr">' + (r.price>0?r.price.toLocaleString('ru-RU')+' ₽':'—') + '</td>'
      + '</tr>';
  }).join('');

  function pgLink(p, label, disabled) {
    if (disabled) return '<span class="pg-dis">' + label + '</span>';
    return '<a class="pg-btn" href="?cat=' + encodeURIComponent(cat) + '&q=' + encodeURIComponent(q) + '&prob=' + prob + '&page=' + p + '">' + label + '</a>';
  }
  const pager = pages <= 1 ? '' : '<div class="pager">'
    + pgLink(1, '«', curPage===1)
    + pgLink(curPage-1, '‹ Пред.', curPage===1)
    + '<span class="pg-info">Стр. ' + curPage + ' из ' + pages + ' · ' + total + ' строк</span>'
    + pgLink(curPage+1, 'След. ›', curPage===pages)
    + pgLink(pages, '»', curPage===pages)
    + '</div>';

  const css = `*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f5f7;color:#1e293b;font-size:13px}
a{text-decoration:none;color:inherit}
.hdr{background:#0f172a;color:#fff;padding:14px 24px;display:flex;align-items:center;gap:12px}
.hdr h1{font-size:16px;font-weight:700}.hdr-sub{color:#94a3b8;font-size:12px;margin-top:2px}
.badge{background:#ef4444;color:#fff;border-radius:20px;padding:3px 11px;font-size:12px;font-weight:700;margin-left:auto}
.stats{display:flex;gap:7px;flex-wrap:wrap;padding:10px 24px;background:#fff;border-bottom:1px solid #e2e8f0}
.sc-all{padding:8px 12px;border-radius:8px;background:#f8fafc;border:2px solid transparent;min-width:70px}
.sc-all.active,.sc-all:hover{border-color:#0066cc;background:#eff6ff}
.sc{display:block;padding:8px 12px;border-radius:8px;background:#f8fafc;border:2px solid transparent;min-width:90px}
.sc.active,.sc:hover{border-color:#0066cc;background:#eff6ff}
.sc-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#64748b}
.sc-num{font-size:20px;font-weight:800;line-height:1.2;margin-top:2px}
.sc-prob{font-size:11px;color:#ef4444;font-weight:600;margin-top:2px}
.sc-ok{font-size:11px;color:#22c55e;margin-top:2px}
.kw{background:#fff;border-bottom:1px solid #e2e8f0;padding:10px 24px}
.kw h2{font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}
.kwt{width:100%;border-collapse:collapse}
.kwt td{padding:3px 8px;vertical-align:top;border-bottom:1px solid #f1f5f9}
.kc{font-weight:700;font-size:12px;white-space:nowrap;width:110px}
.ko{display:inline-block;margin:2px;padding:2px 7px;border-radius:10px;font-size:11px;font-family:monospace;background:#dbeafe;color:#1e40af}
.kz{display:inline-block;margin:2px;padding:2px 7px;border-radius:10px;font-size:11px;font-family:monospace;background:#fee2e2;color:#991b1b;text-decoration:line-through;opacity:.6}
.ko b,.kz b{font-weight:700;margin-left:2px}
.toolbar{display:flex;gap:8px;align-items:center;padding:9px 24px;background:#fff;border-bottom:1px solid #e2e8f0;flex-wrap:wrap;position:sticky;top:0;z-index:10;box-shadow:0 2px 4px rgba(0,0,0,.05)}
.toolbar input{flex:1;min-width:180px;padding:7px 11px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;outline:none}
.toolbar input:focus{border-color:#0066cc}
.tbtn{padding:6px 12px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;cursor:pointer;font-size:12px;font-weight:600;color:#475569;white-space:nowrap}
.tbtn:hover{background:#f1f5f9}.tbtn.on{background:#ef4444;color:#fff;border-color:#ef4444}
.cnt{background:#e2e8f0;border-radius:10px;padding:2px 10px;font-size:12px;color:#64748b;white-space:nowrap}
.tw{overflow-x:auto;padding:14px 24px}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.07)}
th{background:#0f172a;color:#94a3b8;padding:8px 12px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;white-space:nowrap}
td{padding:7px 12px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
tr:last-child td{border-bottom:none}
tr:hover td{background:#f8fafc}
tr.pr td{background:#fff5f5}
tr.pr:hover td{background:#fee2e2}
.tn{color:#94a3b8;font-size:11px;text-align:right;width:36px}
.tt{max-width:280px}.tit{font-weight:500;line-height:1.4}.sku{color:#94a3b8;font-size:11px}
.cb{display:inline-block;padding:2px 9px;border-radius:18px;font-size:11px;font-weight:700}
.ts{color:#64748b;font-size:12px;max-width:150px}
.kt{display:inline-block;padding:2px 7px;border-radius:10px;font-size:11px;background:#dbeafe;color:#1e40af;font-family:monospace}
.kf{display:inline-block;padding:2px 7px;border-radius:10px;font-size:11px;background:#fef3c7;color:#92400e;font-family:monospace}
.tp{color:#dc2626;font-size:11px;font-weight:600;max-width:200px}
.no-sub{color:#94a3b8;font-style:italic;font-size:11px}
.tpr{white-space:nowrap;text-align:right;color:#16a34a;font-weight:600}
.pager{display:flex;gap:8px;align-items:center;justify-content:center;padding:16px 24px}
.pg-btn{padding:6px 14px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;font-size:12px;font-weight:600;color:#475569}
.pg-btn:hover{background:#f1f5f9}
.pg-dis{padding:6px 14px;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc;font-size:12px;color:#94a3b8}
.pg-info{font-size:13px;color:#64748b;padding:0 8px}`;

  res.send('<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>Аудит — FG SEVER</title><style>' + css + '</style></head><body>'
    + '<div class="hdr"><div><h1>Аудит категорий — FG SEVER</h1><div class="hdr-sub">' + all.length + ' товаров</div></div><div class="badge">⚠ ' + totalProblems + ' проблемных</div></div>'
    + '<div class="stats"><a class="sc-all' + (!cat?' active':'') + '" href="?q=' + encodeURIComponent(q) + '&prob=' + prob + '" style="border-left:4px solid #0f172a"><div class="sc-label">Все</div><div class="sc-num" style="color:#0f172a">' + all.length + '</div>' + (totalProblems?'<div class="sc-prob">⚠ '+totalProblems+'</div>':'') + '</a>' + statsCards + '</div>'
    + '<div class="kw"><h2>Ключевые слова</h2><table class="kwt"><tbody>' + kwRows + '</tbody></table></div>'
    + '<div class="toolbar"><form method="get"><input type="hidden" name="cat" value="' + e(cat) + '"><input type="text" name="q" value="' + e(q) + '" placeholder="Поиск по названию или артикулу..."><button type="submit" class="tbtn">Найти</button><button type="submit" name="prob" value="' + (prob==='1'?'':'1') + '" class="tbtn' + (prob==='1'?' on':'') + '">⚠ Проблемные</button><a class="tbtn" href="/admin">Сбросить</a><span class="cnt">' + total + ' строк</span></form></div>'
    + '<div class="tw"><table><thead><tr><th>#</th><th>Наименование / Артикул</th><th>Категория</th><th>Подкатегория</th><th>Ключ. слово</th><th>Проблема</th><th>Цена</th></tr></thead><tbody>' + tableRows + '</tbody></table></div>'
    + pager
    + '</body></html>');
});

// --- Список товаров с пагинацией и фильтрами ---
app.get('/api/products', (req, res) => {
  const { category, sort = 'new', limit = '48', offset = '0', q, subCategory, model, body } = req.query;
  try {
    const lim = Math.min(parseInt(limit) || 48, 200);
    const off = parseInt(offset) || 0;

    const conditions = ["p.imageUrl != ''"];
    const params = [];

    if (category) { conditions.push('p.categoryId = ?'); params.push(category); }
    if (subCategory) { conditions.push('p.subCategory = ?'); params.push(subCategory); }
    // модели и кузова — через запятую (X4,X5 / F26,G05)
    if (model) {
      const models = model.split(',').map(m => m.trim()).filter(Boolean);
      conditions.push(`p.model IN (${models.map(() => '?').join(',')})`);
      params.push(...models);
    }
    if (body) {
      const bodies = body.split(',').map(b => b.trim()).filter(Boolean);
      conditions.push(`(COALESCE(NULLIF(p.body,''), c.body) IN (${bodies.map(() => '?').join(',')}))`);
      params.push(...bodies);
    }
    if (q) {
      conditions.push('(p.titleSearch LIKE ? OR p.oem LIKE ? OR p.sku LIKE ? OR p.crossNumbers LIKE ?)');
      const like = `%${q.toLowerCase()}%`;
      params.push(like, like, like, like);
    }

    const where = 'WHERE ' + conditions.join(' AND ');
    const orderMap = { price_asc: 'p.price ASC', price_desc: 'p.price DESC', new: 'p.id DESC' };
    const order = orderMap[sort] || 'p.id DESC';

    const total = db.prepare(`SELECT COUNT(*) as cnt FROM products p LEFT JOIN cars c ON p.donorId = c.id ${where}`).get(...params).cnt;
    const rows  = db.prepare(`SELECT p.*, c.name as donorName, c.brand as donorBrand, c.model as donorModel, c.year as donorYear, c.body as donorBody, c.engine as donorEngine, c.mileage as donorMileage, c.color as donorColor, c.transmission as donorTransmission, c.drive as donorDrive, c.vin as donorVin, c.video as donorVideo, c.steeringWheel as donorSteeringWheel, c.trim as donorTrim
      FROM products p LEFT JOIN cars c ON p.donorId = c.id
      ${where} ORDER BY ${order} LIMIT ? OFFSET ?`
    ).all(...params, lim, off);

    const items = rows.map(r => ({
      id: r.id, sku: r.sku, title: r.title, donorId: r.donorId,
      brand: r.brand, model: r.model, year: r.year,
      // кузов: сначала из товара, если пусто — из донора
      body: r.body || r.donorBody || '', engine: r.engine,
      position: r.position, color: r.color, oem: r.oem,
      crossNumbers: JSON.parse(r.crossNumbers || '[]'),
      manufacturer: r.manufacturer, description: r.description,
      photos: JSON.parse(r.photos || '[]'),
      imageUrl: r.imageUrl, conditionRaw: r.conditionRaw, condition: r.condition,
      isNew: !!r.isNew, price: r.price, priceFormatted: r.priceFormatted,
      warehouse: r.warehouse, outOfStock: !!r.outOfStock,
      categoryId: r.categoryId, subCategory: r.subCategory,
      donor: r.donorName ? {
        name: r.donorName, brand: r.donorBrand, model: r.donorModel, year: r.donorYear,
        body: r.donorBody, engine: r.donorEngine, mileage: r.donorMileage,
        color: r.donorColor, transmission: r.donorTransmission, drive: r.donorDrive,
        vin: r.donorVin, video: r.donorVideo, steeringWheel: r.donorSteeringWheel,
        trim: r.donorTrim,
      } : null,
    }));

    res.json({ items, total });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Один товар по id ---
app.get('/api/products/:id', (req, res) => {
  try {
    const r = db.prepare(`SELECT p.*, c.name as donorName, c.brand as donorBrand, c.model as donorModel, c.year as donorYear, c.body as donorBody, c.engine as donorEngine, c.mileage as donorMileage, c.color as donorColor, c.transmission as donorTransmission, c.drive as donorDrive, c.vin as donorVin, c.video as donorVideo, c.steeringWheel as donorSteeringWheel, c.trim as donorTrim
      FROM products p LEFT JOIN cars c ON p.donorId = c.id
      WHERE p.id = ?`).get(req.params.id);
    if (!r) return res.status(404).json({ error: 'Не найдено' });
    res.json({
      id: r.id, sku: r.sku, title: r.title, donorId: r.donorId,
      brand: r.brand, model: r.model, year: r.year, body: r.body, engine: r.engine,
      position: r.position, color: r.color, oem: r.oem,
      crossNumbers: JSON.parse(r.crossNumbers || '[]'),
      manufacturer: r.manufacturer, description: r.description,
      photos: JSON.parse(r.photos || '[]'),
      imageUrl: r.imageUrl, conditionRaw: r.conditionRaw, condition: r.condition,
      isNew: !!r.isNew, price: r.price, priceFormatted: r.priceFormatted,
      warehouse: r.warehouse, outOfStock: !!r.outOfStock,
      categoryId: r.categoryId, subCategory: r.subCategory,
      donor: r.donorName ? {
        name: r.donorName, brand: r.donorBrand, model: r.donorModel, year: r.donorYear,
        body: r.donorBody, engine: r.donorEngine, mileage: r.donorMileage,
        color: r.donorColor, transmission: r.donorTransmission, drive: r.donorDrive,
        vin: r.donorVin, video: r.donorVideo, steeringWheel: r.donorSteeringWheel,
        trim: r.donorTrim,
      } : null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Подкатегории для раздела ---
app.get('/api/groups', (req, res) => {
  const { category } = req.query;
  try {
    const conditions = ["imageUrl != ''", "subCategory != ''"];
    const params = [];
    if (category) { conditions.push('categoryId = ?'); params.push(category); }
    const rows = db.prepare(
      `SELECT subCategory, COUNT(*) as count FROM products WHERE ${conditions.join(' AND ')} GROUP BY subCategory ORDER BY count DESC`
    ).all(...params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Группировка результатов поиска по категориям ---
app.get('/api/search-groups', (req, res) => {
  const { q = '' } = req.query;
  try {
    const like = `%${q.toLowerCase()}%`;
    const rows = db.prepare(
      `SELECT categoryId, COUNT(*) as count FROM products
       WHERE imageUrl != '' AND (titleSearch LIKE ? OR oem LIKE ? OR sku LIKE ? OR crossNumbers LIKE ?)
       GROUP BY categoryId ORDER BY count DESC`
    ).all(like, like, like, like);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Доноры ---
app.get('/api/cars', (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM cars ORDER BY brand, model').all());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Статус синхронизации ---
app.get('/api/status', (req, res) => {
  const count = db.prepare("SELECT COUNT(*) as cnt FROM products WHERE imageUrl != ''").get().cnt;
  res.json({ lastSync, syncError, count });
});

// --- Уникальные модели и кузова для фильтра ---
// body берётся из товара, а если пусто — из донора (Базон не всегда заполняет Кузов у товаров)
app.get('/api/models', (req, res) => {
  const { category } = req.query;
  try {
    const conditions = ["p.model != ''", "p.imageUrl != ''", "COALESCE(NULLIF(p.body,''), c.body) != ''"];
    const params = [];
    if (category) { conditions.push('p.categoryId = ?'); params.push(category); }
    const rows = db.prepare(
      `SELECT p.model as model, COALESCE(NULLIF(p.body,''), c.body) as body, COUNT(*) as count
       FROM products p LEFT JOIN cars c ON p.donorId = c.id
       WHERE ${conditions.join(' AND ')}
       GROUP BY p.model, COALESCE(NULLIF(p.body,''), c.body)
       ORDER BY p.model, COALESCE(NULLIF(p.body,''), c.body)`
    ).all(...params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Serve built React app ---
app.use(express.static(join(__dirname, 'dist')));
app.get('*', (_, res) => res.sendFile(join(__dirname, 'dist/index.html')));

// --- Start ---
syncFromBazon();
setInterval(syncFromBazon, SYNC_INTERVAL_MS);

app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
  console.log(`Следующая синхронизация через 20 минут`);
});
