# Правила бэкенда — FG SEVER

## Общее

- Весь бэкенд — один файл: `server.js` (ESM, Node.js 18+)
- Не разбивать на модули без явной необходимости
- Язык комментариев: **русский**

## Синхронизация с Базон

### ⚠️ ЕДИНСТВЕННЫЙ ЖИВОЙ ИСТОЧНИК ДАННЫХ

```
Товары:  https://baz-on.ru/export/c3677/07d7c/partssever-site-products.csv
Доноры:  https://baz-on.ru/export/c3677/7c88b/partssever-site-carsrc.csv
```

**НЕ МЕНЯТЬ эти URL без команды со стороны Базон.**  
URL обновляются автоматически на стороне Базон — наш сервер всегда тянет актуальные данные.

- Функция `syncFromBazon()` — при старте + каждые 20 минут (`SYNC_INTERVAL_MS`)
- При ошибке синхронизации — сервер продолжает работать на старых данных
- Товары без фото (`imageUrl === ''`) — исключаются из `catalog[]`

## In-memory хранилище

```js
let catalog = [];  // активные товары (с фото)
let cars    = [];  // доноры
let lastSync = null;
let syncError = null;
```

Нет базы данных. Всё в памяти. Перезапуск сервера = пересинхронизация.

## Структура объекта товара (catalog[])

```
id, sku, title, donorId, brand, model, year, body, engine,
position, color, oem, crossNumbers, manufacturer, description,
photos[], imageUrl, conditionRaw, condition, isNew,
price, priceFormatted, warehouse, outOfStock, categoryId,
donor: { name, brand, model, year, body, engine, mileage,
         color, transmission, drive, vin, video, steeringWheel, trim }
```

## API эндпоинты (существующие)

| Метод | URL | Параметры | Описание |
|-------|-----|-----------|----------|
| GET | `/api/products` | `category`, `sort`, `limit`, `offset`, `q` | Список товаров с пагинацией |
| GET | `/api/products/:id` | — | Один товар по id |
| GET | `/api/cars` | — | Все доноры |
| GET | `/api/status` | — | Статус синхронизации |

## API эндпоинты (запланированы)

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/groups?category=` | Уникальные подкатегории для раздела |
| POST | `/api/order` | Принять заявку: `{ name, phone, comment, productId }` |

## Правила новых эндпоинтов

- Всегда возвращать JSON
- При ошибке: `res.status(4xx/5xx).json({ error: 'Описание' })`
- Добавлять новые роуты **перед** `app.use(express.static(...))` внизу файла
- `POST /api/order` — логировать в `orders.log`, опционально слать в Telegram

## Категории — НЕ менять без проверки

Функция `detectCategory(name)` — keyword-matching по названию товара.
Порядок в `CATEGORY_MAP` важен: первый совпавший — победитель.
При изменении — перезапустить сервер и проверить распределение товаров по категориям.

## CSV-парсинг

- Кодировка: Windows-1251 → `new TextDecoder('windows-1251')`
- Разделитель: `;`
- Поле фото: `r['Фото']` — строка с URL через запятую (до 25 штук)
- Поле донора: `r['Донор']` — ID, связывается с `carsMap`
