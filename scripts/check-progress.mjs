/**
 * Автоматическая проверка прогресса разработки.
 * Запускается хуком Stop после каждого ответа Claude.
 * Читает реальное состояние кода и обновляет чеклист в CLAUDE.md.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function fileExists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function fileContains(relPath, pattern) {
  if (!fileExists(relPath)) return false;
  const content = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  return typeof pattern === 'string' ? content.includes(pattern) : pattern.test(content);
}

// --- Проверки по каждому пункту чеклиста ---
const checks = {
  // Блок A — SQLite
  'Установка `better-sqlite3`':
    fileExists('db.js') && fileContains('package.json', 'better-sqlite3'),

  'Сохранение CSV в `.sqlite` при синхронизации с Базон':
    fileExists('fgsever.sqlite') && fileContains('server.js', 'fgsever.sqlite'),

  'Перевод `/api/products` на SQL-запросы':
    fileContains('server.js', "app.get('/api/products'") &&
    fileContains('server.js', 'db.') &&
    !fileContains('server.js', 'catalog.filter'),

  'Перевод `/api/groups` на SQL-запросы':
    fileContains('server.js', "app.get('/api/groups'") &&
    fileContains('server.js', 'subCategory'),

  '`server.js`: поле `subCategory` (keyword-matching по названию)':
    fileContains('server.js', 'subCategory') &&
    !fileContains('server.js', "subCategory: '' // TODO"),

  '`server.js`: эндпоинт `GET /api/groups?category=...`':
    fileContains('server.js', "'/api/groups'"),

  '`src/data.ts`: добавить `subCategory?: string` в `CatalogProduct`':
    fileContains('src/data.ts', 'subCategory'),

  // Блок B — Поиск
  '`src/components/SearchDropdown.tsx` — live dropdown создан':
    fileExists('src/components/SearchDropdown.tsx'),

  '`src/pages/SearchPage.tsx` — страница результатов создана':
    fileExists('src/pages/SearchPage.tsx'),

  '`src/App.tsx`: `onChange`, `onKeyDown`, `SearchDropdown` подключены в шапке':
    fileContains('src/App.tsx', 'SearchDropdown') &&
    fileContains('src/App.tsx', 'onChange') &&
    fileContains('src/App.tsx', 'onKeyDown'),

  'Поиск по OEM, артикулу, кросс-номерам, названию одновременно (зависит от бэкенда)':
    fileContains('server.js', 'oem') &&
    fileContains('server.js', 'crossNumbers') &&
    fileContains('server.js', 'titleSearch'),

  // Блок C — Подкатегории
  '`src/hooks/useGroups.ts` — хук загрузки подкатегорий':
    fileExists('src/hooks/useGroups.ts'),

  '`src/CategoryPage.tsx` — боковой фильтр по подкатегории':
    fileContains('src/CategoryPage.tsx', 'subCategory') &&
    fileContains('src/CategoryPage.tsx', 'useGroups'),

  // Блок D — Карточка товара
  'Галерея фотографий (до 25 штук)':
    fileContains('src/ProductPage.tsx', 'photos') &&
    fileContains('src/ProductPage.tsx', 'activeImage'),

  'Артикул, OEM-номер, состояние, цвет':
    fileContains('src/ProductPage.tsx', 'product.sku') &&
    fileContains('src/ProductPage.tsx', 'product.oem') &&
    fileContains('src/ProductPage.tsx', 'product.condition'),

  'Применяемость (марка · модель · год · кузов · двигатель)':
    fileContains('src/ProductPage.tsx', 'applicability'),

  'Расположение на автомобиле':
    fileContains('src/ProductPage.tsx', 'product.position'),

  'Кросс-номера / маркировки':
    fileContains('src/ProductPage.tsx', 'crossNumbers'),

  'Блок донора: марка, модель, год, пробег, двигатель, коробка, привод':
    fileContains('src/ProductPage.tsx', 'donor.engine') &&
    fileContains('src/ProductPage.tsx', 'donor.transmission') &&
    fileContains('src/ProductPage.tsx', 'donor.drive'),

  'Видео донора (если есть)':
    fileContains('src/ProductPage.tsx', 'donor.video'),

  'Похожие товары':
    fileContains('src/ProductPage.tsx', 'related'),

  'Кнопка «Заказать» (Phase 2)':
    fileContains('src/ProductPage.tsx', 'OrderModal') ||
    fileContains('src/App.tsx', 'OrderModal'),

  // Блок E — Заказать
  '`OrderModal` — модальное окно заявки':
    fileExists('src/components/OrderModal.tsx'),

  '`POST /api/order` — приём заявки, лог в `orders.log`':
    fileContains('server.js', "'/api/order'") &&
    fileContains('server.js', 'orders.log'),

  'Опционально: отправка в Telegram':
    fileContains('server.js', 'telegram') || fileContains('server.js', 'Telegram'),
};

// --- Обновление CLAUDE.md ---
const claudeMdPath = path.join(ROOT, 'CLAUDE.md');
let md = fs.readFileSync(claudeMdPath, 'utf8');
let changed = false;
let updatedCount = 0;

for (const [label, done] of Object.entries(checks)) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const unchecked = new RegExp(`- \\[ \\] ${escapedLabel}`);
  const checked   = new RegExp(`- \\[x\\] ${escapedLabel}`);

  if (done && unchecked.test(md)) {
    md = md.replace(`- [ ] ${label}`, `- [x] ${label}`);
    changed = true;
    updatedCount++;
    console.log(`✅ Отмечено: ${label}`);
  } else if (!done && checked.test(md)) {
    // Не откатываем обратно — только вперёд
  }
}

// Обновляем дату в заголовке чеклиста
if (changed) {
  const today = new Date().toISOString().slice(0, 10);
  md = md.replace(
    /> Обновляется после каждой завершённой задачи\. Последнее обновление: \d{4}-\d{2}-\d{2}\./,
    `> Обновляется после каждой завершённой задачи. Последнее обновление: ${today}.`
  );
  fs.writeFileSync(claudeMdPath, md, 'utf8');
  console.log(`\n📋 CLAUDE.md обновлён (${updatedCount} новых отметок)`);
} else {
  console.log('📋 Изменений нет — чеклист актуален');
}
