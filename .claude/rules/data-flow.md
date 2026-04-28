# Данные и поток информации — FG SEVER

## Откуда берутся данные

```
Bazon (CSV) → server.js (парсинг) → in-memory catalog[]
     ↓ каждые 20 мин                         ↓
  /api/products                         /api/cars
  /api/products/:id                     /api/status
  /api/groups                           /api/order (POST)
         ↓
   useProducts.ts hook
   useGroups.ts hook
         ↓
   CategoryPage / ProductPage / SearchPage
```

## Двойной источник данных (fallback)

`useProducts` сначала пробует `/api/products`.
При ошибке (сервер недоступен) — фоллбэк на `src/generated/catalog.json`.

```ts
fetch('/api/products?...')
  .then(...)
  .catch(() => import('../data').then(m => /* статик */))
```

**Важно:** `catalog.json` генерируется командой `npm run convert`.
Это файл для dev-режима — в production данные всегда из API.

## Поля товара — что есть в catalog.json vs API

`catalog.json` (из `convert-csv.mjs`) — **НЕ содержит** поле `photos[]`.
API `server.js` — **содержит** `photos[]`.

Из-за этого в dev-режиме (фоллбэк) галерея покажет только `imageUrl`.
В production (через сервер) — все фото из Базон.

> TODO: добавить `photos[]` в `catalog.json` при следующем запуске `npm run convert`

## Структура generated/

```
src/generated/
├── catalog.json    ← для фронтенда (без photos[])
├── products.json   ← полный объект с positionRaw
└── cars.json       ← доноры
```

Все три генерируются `npm run convert`. В `.gitignore` — только `catalog.json`.

## Типы — только в data.ts

```ts
// src/data.ts
export interface CatalogProduct { ... }
export interface DonorInfo { ... }
```

Не создавать дублирующие типы в других файлах. Импортировать из `../data`.

## Статус наличия

```ts
outOfStock: !r['Склад'] || r['Склад'].trim() === '' || price <= 0
```

Товар «нет в наличии» если: нет склада ИЛИ цена 0.

## Статус товара (condition)

| Значение CSV | conditionRaw | condition (отображение) |
|---|---|---|
| `new` | `'new'` | `'Новый'` |
| `used` | `'used'` | `'Б/У'` |
| `contract` | `'contract'` | `'Контракт'` |

## Фотографии

- Поле CSV: `r['Фото']` — URL через запятую
- Сервер: `photos[]` — массив всех URL, `imageUrl` — первый
- Реальная статистика: 78.3% товаров без фото, у остальных 2–25 фото
- Товары без фото исключаются из каталога полностью
