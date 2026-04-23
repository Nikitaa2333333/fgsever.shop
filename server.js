import express from 'express';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

const BAZON_PRODUCTS_URL = 'https://baz-on.ru/export/c3677/07d7c/partssever-site-products.csv';
const BAZON_CARS_URL    = 'https://baz-on.ru/export/c3677/7c88b/partssever-site-carsrc.csv';
const SYNC_INTERVAL_MS  = 20 * 60 * 1000; // 20 минут

// --- In-memory store ---
let catalog = [];
let cars    = [];
let lastSync = null;
let syncError = null;

// --- CSV parser ---
function decode1251(buffer) {
  return new TextDecoder('windows-1251').decode(buffer);
}

function parseCSVLine(line) {
  const result = [];
  let current = '', inQuotes = false;
  for (const ch of line) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === ';' && !inQuotes) { result.push(current); current = ''; }
    else current += ch;
  }
  result.push(current);
  return result;
}

function parseCSV(content) {
  const lines = content.split('\n').filter(l => l.trim());
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (values[i] || '').trim(); });
    return obj;
  });
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

    // Parse cars into a map by ID
    const carsRaw = parseCSV(decode1251(new Uint8Array(carsBuf)));
    const carsMap = {};
    carsRaw.forEach(r => {
      carsMap[r['Номер']] = {
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
        price: r['Стоимость'],
      };
    });

    // Parse products
    const productsRaw = parseCSV(decode1251(new Uint8Array(productsBuf)));
    const newCatalog = [];

    productsRaw.forEach((r, idx) => {
      const photos = r['Фото'] ? r['Фото'].split(',').map(p => p.trim()).filter(Boolean) : [];
      const imageUrl = photos[0] || '';
      if (!imageUrl) return; // skip products without photo

      const price = parseFloat(r['Цена']) || 0;
      const conditionRaw = r['Новый/БУ (new/used/contract)'] || '';
      const title = r['Наименование'] || '';
      const donorId = r['Донор'];
      const donor = carsMap[donorId] || null;

      const crossNumbers = r['Кросс-номера']
        ? r['Кросс-номера'].split(',').map(n => n.trim()).filter(Boolean)
        : [];

      newCatalog.push({
        id: idx + 1,
        sku: r['Артикул'],
        title,
        donorId,
        brand: r['Марка'],
        model: r['Модель'],
        year: r['Год'],
        body: r['Кузов'],
        engine: r['Двигатель'],
        position: formatPosition(r['Перед/Зад (F/B)'], r['Лев/Прав (L/R)'], r['Верх/Низ (U/D)']),
        color: r['Цвет'],
        oem: r['Маркировка'],
        crossNumbers,
        manufacturer: r['Производитель'],
        description: r['Комментарий'],
        photos,
        imageUrl,
        conditionRaw,
        condition: formatCondition(conditionRaw),
        isNew: conditionRaw === 'new',
        price,
        priceFormatted: price > 0 ? `${price.toLocaleString('ru-RU')} ₽` : 'Цена по запросу',
        warehouse: r['Склад'],
        outOfStock: !r['Склад'] || r['Склад'].trim() === '' || price <= 0,
        categoryId: detectCategory(title),
        donor: donor ? {
          name: donor.name, brand: donor.brand, model: donor.model, year: donor.year,
          body: donor.body, engine: donor.engine, mileage: donor.mileage, color: donor.color,
          transmission: donor.transmission, drive: donor.drive, vin: donor.vin,
          video: donor.video, steeringWheel: donor.steeringWheel, trim: donor.trim,
        } : null,
      });
    });

    catalog = newCatalog;
    cars    = Object.values(carsMap);
    lastSync = new Date();
    syncError = null;

    console.log(`✓ Загружено: ${catalog.length} запчастей, ${cars.length} доноров`);
  } catch (err) {
    syncError = err.message;
    console.error('✗ Ошибка синхронизации:', err.message);
  }
}

// --- API routes ---
app.use(express.json());

app.get('/api/status', (_, res) => {
  res.json({ lastSync, error: syncError, products: catalog.length, cars: cars.length });
});

app.get('/api/products', (req, res) => {
  const { category, sort, limit, offset = 0, q } = req.query;
  let result = [...catalog];

  if (category) result = result.filter(p => p.categoryId === category);

  if (q) {
    const lower = q.toLowerCase();
    result = result.filter(p =>
      p.title.toLowerCase().includes(lower) ||
      (p.sku && p.sku.toLowerCase().includes(lower)) ||
      (p.oem && p.oem.toLowerCase().includes(lower)) ||
      p.crossNumbers.some(n => n.toLowerCase().includes(lower))
    );
  }

  if (sort === 'price_asc')  result.sort((a, b) => a.price - b.price);
  else if (sort === 'price_desc') result.sort((a, b) => b.price - a.price);
  else if (sort === 'stock') result.sort((a, b) => (a.outOfStock ? 1 : 0) - (b.outOfStock ? 1 : 0));

  const total = result.length;
  if (limit) result = result.slice(Number(offset), Number(offset) + Number(limit));

  res.json({ total, items: result });
});

app.get('/api/products/:id', (req, res) => {
  const product = catalog.find(p => p.id === Number(req.params.id));
  if (!product) return res.status(404).json({ error: 'Не найдено' });
  res.json(product);
});

app.get('/api/cars', (_, res) => {
  res.json(cars);
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
