import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const EXPORTS = [
  { url: 'https://baz-on.ru/export/c3677/07d7c/partssever-site-products.csv', file: 'partssever-site-products.csv' },
  { url: 'https://baz-on.ru/export/c3677/7c88b/partssever-site-carsrc.csv',   file: 'partssever-site-carsrc.csv' },
];

console.log('⬇ Скачиваю свежие CSV с Bazon...');
for (const { url, file } of EXPORTS) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Ошибка загрузки ${file}: ${res.status}`);
  writeFileSync(join(root, file), Buffer.from(await res.arrayBuffer()));
  console.log(`  ✓ ${file}`);
}

function decode1251(buffer) {
  return new TextDecoder('windows-1251').decode(buffer);
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ';' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
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

// --- Cars (donors) ---
const carsRaw = parseCSV(decode1251(readFileSync(join(root, 'partssever-site-carsrc.csv'))));

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

const cars = Object.values(carsMap);

// --- Category mapping ---
const CATEGORY_MAP = [
  { id: 'mechanical-parts',        keywords: ['двигател', 'генератор', 'стартер', 'турбо', 'компрессор', 'коробка', 'кпп', 'радиатор', 'патрубок', 'охладитель', 'катализатор', 'фильтр', 'webasto', 'помпа', 'маслян'] },
  { id: 'car-electronics',         keywords: ['блок управления', 'аккумулятор', 'датчик', 'модуль', 'проводка', 'лямбда', 'антенна', 'реле', 'kafas', 'mulf', 'combox', 'видеомодул', 'камер', 'переключател'] },
  { id: 'interior',                keywords: ['подушка безопасности', 'приборн', 'руль', 'консоль', 'зеркало внутренн', 'сиден', 'дверн карт', 'потолок', 'подлокотник', 'ковёр', 'коврик', 'декоративн', 'беспроводн', 'климат', 'usb', 'aux', 'проекц'] },
  { id: 'lights',                  keywords: ['фара', 'фонарь', 'противотуманн', 'освещен', 'поворотник', 'стоп-сигнал'] },
  { id: 'audio-systems',           keywords: ['динамик', 'усилитель', 'аудио', 'радио', 'колонк', 'сабвуф', 'чейнджер'] },
  { id: 'body-parts',              keywords: ['крыло', 'дверь', 'капот', 'бампер', 'крышка багажник', 'зеркало', 'решетка', 'порог', 'багажник', 'рейлинг', 'фаркоп', 'выхлоп', 'эмблема', 'ручка'] },
  { id: 'navigation-entertainment',keywords: ['дисплей', 'навигац', 'мультимедиа', 'джойстик', 'головное', 'монитор'] },
  { id: 'suspension',              keywords: ['амортизатор', 'рычаг', 'стабилизатор', 'подрамник', 'ступиц', 'привод', 'редуктор', 'рулевая рейка', 'вал'] },
  { id: 'brake-system',            keywords: ['тормоз', 'суппорт', 'колодк', 'диск тормоз', 'abs', 'трубк'] },
  { id: 'wheels-rims-tires',       keywords: ['диск', 'шина', 'колесо', 'резина'] },
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
  const parts = [];
  if (fb === 'F') parts.push('Передн.');
  else if (fb === 'B') parts.push('Задн.');
  if (lr === 'L') parts.push('Лев.');
  else if (lr === 'R') parts.push('Прав.');
  if (ud === 'U') parts.push('Верх.');
  else if (ud === 'D') parts.push('Низ.');
  return parts.join(' ');
}

// --- Products ---
const productsRaw = parseCSV(decode1251(readFileSync(join(root, 'partssever-site-products.csv'))));

const products = productsRaw.map((r, idx) => {
  const photos = r['Фото'] ? r['Фото'].split(',').map(p => p.trim()).filter(Boolean) : [];
  const price = parseFloat(r['Цена']) || 0;
  const conditionRaw = r['Новый/БУ (new/used/contract)'] || '';
  const title = r['Наименование'] || '';
  const donorId = r['Донор'];
  const donor = carsMap[donorId] || null;

  const crossNumbers = r['Кросс-номера']
    ? r['Кросс-номера'].split(',').map(n => n.trim()).filter(Boolean)
    : [];

  return {
    id: idx + 1,
    sku: r['Артикул'],
    title,
    donorId,
    brand: r['Марка'],
    model: r['Модель'],
    year: r['Год'],
    body: r['Кузов'],
    engine: r['Двигатель'],
    positionRaw: {
      fb: r['Перед/Зад (F/B)'],
      lr: r['Лев/Прав (L/R)'],
      ud: r['Верх/Низ (U/D)'],
    },
    position: formatPosition(r['Перед/Зад (F/B)'], r['Лев/Прав (L/R)'], r['Верх/Низ (U/D)']),
    color: r['Цвет'],
    oem: r['Маркировка'],
    crossNumbers,
    manufacturer: r['Производитель'],
    description: r['Комментарий'],
    photos,
    imageUrl: photos[0] || '',
    conditionRaw,
    condition: formatCondition(conditionRaw),
    isNew: conditionRaw === 'new',
    price,
    priceFormatted: price > 0 ? `${price.toLocaleString('ru-RU')} ₽` : 'Цена по запросу',
    warehouse: r['Склад'],
    outOfStock: !r['Склад'] || r['Склад'].trim() === '',
    categoryId: detectCategory(title),

    // Donor car info
    donor: donor ? {
      name: donor.name,
      brand: donor.brand,
      model: donor.model,
      year: donor.year,
      body: donor.body,
      engine: donor.engine,
      mileage: donor.mileage,
      color: donor.color,
      transmission: donor.transmission,
      drive: donor.drive,
      vin: donor.vin,
      video: donor.video,
      steeringWheel: donor.steeringWheel,
      trim: donor.trim,
    } : null,
  };
});

// Catalog — listing view (with photo)
const catalog = products
  .filter(p => p.imageUrl)
  .map(({ id, sku, title, brand, model, year, body, engine, imageUrl, photos, color,
          conditionRaw, condition, isNew, price, priceFormatted, outOfStock,
          categoryId, donorId, oem, position, donor, description }) =>
    ({ id, sku, title, brand, model, year, body, engine, imageUrl, photos, color,
       conditionRaw, condition, isNew, price, priceFormatted, outOfStock,
       categoryId, donorId, oem, position, donor, description })
  );

mkdirSync(join(root, 'src/generated'), { recursive: true });
writeFileSync(join(root, 'src/generated/cars.json'), JSON.stringify(cars));
writeFileSync(join(root, 'src/generated/products.json'), JSON.stringify(products));
writeFileSync(join(root, 'src/generated/catalog.json'), JSON.stringify(catalog));

const { statSync } = await import('fs');
const catalogSize = (statSync(join(root, 'src/generated/catalog.json')).size / 1024).toFixed(0);
const fullSize = (statSync(join(root, 'src/generated/products.json')).size / 1024).toFixed(0);
console.log(`✓ Машин-доноров: ${cars.length}`);
console.log(`✓ Каталог (с фото): ${catalog.length} запчастей — ${catalogSize} KB`);
console.log(`✓ Полный JSON: ${products.length} запчастей — ${fullSize} KB`);
