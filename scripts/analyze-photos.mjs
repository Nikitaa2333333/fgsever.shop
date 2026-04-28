// Анализ количества фотографий в CSV Bazon
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

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

const raw = parseCSV(decode1251(readFileSync(join(root, 'partssever-site-products.csv'))));

// --- Статистика фотографий ---
let totalPhotos = 0;
const distribution = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, '6-9': 0, '10+': 0 };
let maxPhotos = 0;
let maxItem = null;
let withZeroPhotos = 0;
let withOnePhoto = 0;
let withMultiple = 0;

for (const r of raw) {
  const photos = r['Фото'] ? r['Фото'].split(',').map(p => p.trim()).filter(Boolean) : [];
  const count = photos.length;
  totalPhotos += count;
  if (count === 0) withZeroPhotos++;
  else if (count === 1) withOnePhoto++;
  else withMultiple++;

  if (count > maxPhotos) {
    maxPhotos = count;
    maxItem = { title: r['Наименование'], sku: r['Артикул'], count, photos };
  }

  if (count === 0) distribution[0]++;
  else if (count === 1) distribution[1]++;
  else if (count === 2) distribution[2]++;
  else if (count === 3) distribution[3]++;
  else if (count === 4) distribution[4]++;
  else if (count === 5) distribution[5]++;
  else if (count <= 9) distribution['6-9']++;
  else distribution['10+']++;
}

const total = raw.length;
const avgPhotos = (totalPhotos / total).toFixed(2);

console.log('\n📸 АНАЛИЗ ФОТОГРАФИЙ В БАЗОН CSV');
console.log('='.repeat(50));
console.log(`Всего товаров в CSV:        ${total}`);
console.log(`Всего фотографий:           ${totalPhotos}`);
console.log(`Среднее фото на товар:      ${avgPhotos}`);
console.log(`Максимум у одного товара:   ${maxPhotos}`);
console.log('');
console.log('РАСПРЕДЕЛЕНИЕ ПО КОЛ-ВУ ФОТО:');
console.log(`  0 фото:   ${distribution[0]} тов. (${((distribution[0]/total)*100).toFixed(1)}%) — исключаются из каталога`);
console.log(`  1 фото:   ${distribution[1]} тов. (${((distribution[1]/total)*100).toFixed(1)}%)`);
console.log(`  2 фото:   ${distribution[2]} тов. (${((distribution[2]/total)*100).toFixed(1)}%)`);
console.log(`  3 фото:   ${distribution[3]} тов. (${((distribution[3]/total)*100).toFixed(1)}%)`);
console.log(`  4 фото:   ${distribution[4]} тов. (${((distribution[4]/total)*100).toFixed(1)}%)`);
console.log(`  5 фото:   ${distribution[5]} тов. (${((distribution[5]/total)*100).toFixed(1)}%)`);
console.log(`  6-9 фото: ${distribution['6-9']} тов. (${((distribution['6-9']/total)*100).toFixed(1)}%)`);
console.log(`  10+ фото: ${distribution['10+']} тов. (${((distribution['10+']/total)*100).toFixed(1)}%)`);
console.log('');
console.log('ИТОГ:');
console.log(`  Без фото (не попадут в каталог): ${withZeroPhotos} (${((withZeroPhotos/total)*100).toFixed(1)}%)`);
console.log(`  С 1 фото:                        ${withOnePhoto} (${((withOnePhoto/total)*100).toFixed(1)}%)`);
console.log(`  С 2+ фото (выиграем от галереи): ${withMultiple} (${((withMultiple/total)*100).toFixed(1)}%)`);

if (maxItem) {
  console.log('');
  console.log(`МАКСИМУМ ФОТО: "${maxItem.title}" (${maxItem.sku}) — ${maxItem.count} фото`);
  console.log('  Первые 3:', maxItem.photos.slice(0, 3).join('\n           '));
}

// --- Проверка поля Фото в CSV ---
console.log('\n📋 ЗАГОЛОВКИ ФОТО-ПОЛЕЙ В CSV:');
const headers = parseCSVLine(decode1251(readFileSync(join(root, 'partssever-site-products.csv'))).split('\n')[0]);
headers.forEach((h, i) => {
  if (h.toLowerCase().includes('фото') || h.toLowerCase().includes('photo') || h.toLowerCase().includes('image')) {
    console.log(`  [${i}] "${h}"`);
  }
});
