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
    if (!imageUrl) continue; // Пропускаем товары без фото

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
      subCategory: detectSubCategory(title, detectCategory(title))
    });
    productsCount++;
  }

  return { carsCount, productsCount };
});

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

app.get('/api/status', (_, res) => {
  const { count: productsCount } = db.prepare('SELECT count(*) as count FROM products').get();
  const { count: carsCount } = db.prepare('SELECT count(*) as count FROM cars').get();
  res.json({ lastSync, error: syncError, products: productsCount, cars: carsCount });
});

// Helper to attach donor info and parse JSON
function mapProductRecord(row) {
  let donor = null;
  if (row.donorId) {
    donor = db.prepare('SELECT * FROM cars WHERE id = ?').get(row.donorId);
  }
  return {
    ...row,
    isNew: Boolean(row.isNew),
    outOfStock: Boolean(row.outOfStock),
    crossNumbers: JSON.parse(row.crossNumbers || '[]'),
    photos: JSON.parse(row.photos || '[]'),
    donor: donor ? {
      name: donor.name, brand: donor.brand, model: donor.model, year: donor.year,
      body: donor.body, engine: donor.engine, mileage: donor.mileage, color: donor.color,
      transmission: donor.transmission, drive: donor.drive, vin: donor.vin,
      video: donor.video, steeringWheel: donor.steeringWheel, trim: donor.trim,
    } : null,
  };
}

app.get('/api/products', (req, res) => {
  const { category, subCategory, sort, limit, offset = 0, q } = req.query;

  let query = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (category) {
    query += ' AND categoryId = ?';
    params.push(category);
  }

  if (subCategory) {
    query += ' AND subCategory = ?';
    params.push(subCategory);
  }

  if (q) {
    const term = `%${q.toLowerCase()}%`;
    // titleSearch хранит title.toLowerCase() — SQLite LOWER() не понижает кириллицу
    // Поиск только по названию, артикулу, OEM и кросс-номерам (без модели/года — для этого есть фильтры)
    query += ' AND (titleSearch LIKE ? OR LOWER(sku) LIKE ? OR LOWER(oem) LIKE ? OR LOWER(crossNumbers) LIKE ?)';
    params.push(term, term, term, term);
  }

  if (sort === 'price_asc')  query += ' ORDER BY price ASC';
  else if (sort === 'price_desc') query += ' ORDER BY price DESC';
  else if (sort === 'stock') query += ' ORDER BY outOfStock ASC, id ASC';
  else query += ' ORDER BY id ASC';

  // Считаем общее количество
  const totalStmt = db.prepare(query.replace('SELECT *', 'SELECT count(*) as count').split('ORDER BY')[0]);
  const { count } = totalStmt.get(params);

  // Пагинация
  if (limit) {
    query += ' LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));
  }

  const rows = db.prepare(query).all(params);
  const items = rows.map(mapProductRecord);

  res.json({ total: count, items });
});

app.get('/api/products/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Не найдено' });
  res.json(mapProductRecord(row));
});

app.get('/api/cars', (_, res) => {
  const cars = db.prepare('SELECT * FROM cars').all();
  res.json(cars);
});

app.get('/api/groups', (req, res) => {
  const { category } = req.query;
  if (!category) return res.status(400).json({ error: 'category обязателен' });

  const rows = db.prepare(
    `SELECT subCategory, count(*) as count FROM products
     WHERE categoryId = ? AND subCategory != ''
     GROUP BY subCategory ORDER BY count DESC`
  ).all(category);

  res.json(rows);
});

// Группировка результатов поиска по категориям
app.get('/api/search-groups', (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);

  const term = `%${q.toLowerCase()}%`;
  const rows = db.prepare(
    `SELECT categoryId, count(*) as count FROM products
     WHERE (titleSearch LIKE ? OR LOWER(sku) LIKE ? OR LOWER(oem) LIKE ? OR LOWER(crossNumbers) LIKE ?)
     GROUP BY categoryId
     ORDER BY count DESC`
  ).all(term, term, term, term);

  res.json(rows);
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
