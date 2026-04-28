# FG SEVER — Запчасти BMW и MINI

## Проект

Интернет-магазин оригинальных запчастей BMW и MINI. Продавец — FG SEVER.
Сайт работает на Node.js + React, данные синхронизируются с поставщиком Базон каждые 20 минут.

**Стек:**
- Frontend: React 19 + TypeScript + Vite + Tailwind CSS
- Backend: Node.js + Express (`server.js`)
- Данные: Базон CSV (6082 товаров, 25 доноров)
- Роутинг: state-based SPA (`currentPage` в `App.tsx`), без React Router
- БД: отсутствует — in-memory каталог в `server.js`

**Точки входа:**
- `npm run dev` — Vite dev server (порт 3000) + backend proxy на 4000
- `npm run server` — только backend
- `npm run convert` — скачать CSV с Bazon и конвертировать → `src/generated/catalog.json`
- `npm run build` — production build

---

## Интеграция с Базон

### ⚠️ ЕДИНСТВЕННЫЙ ЖИВОЙ ИСТОЧНИК ДАННЫХ

Все данные берутся **только** по этим двум URL — они обновляются со стороны Bazon:

```
Товары:  https://baz-on.ru/export/c3677/07d7c/partssever-site-products.csv
Доноры:  https://baz-on.ru/export/c3677/7c88b/partssever-site-carsrc.csv
```

**НЕ МЕНЯТЬ эти URL без команды со стороны Базон.**  
URL обновляются автоматически на стороне Базон — наш сервер всегда тянет свежие данные.

### Статические файлы в корне проекта

`partssever-site-products.csv` и `partssever-site-carsrc.csv` в корне — это **кэш для разработки**.  
Они создаются командой `npm run convert` и используются только локально.  
**Это не источник правды.** В production данные всегда из URL выше.

### Кодировка и формат

Два CSV-источника (Windows-1251, разделитель `;`):
- **Товары:** `partssever-site-products.csv` — 21 поле
- **Доноры:** `partssever-site-carsrc.csv` — поля автомобилей-доноров

**Важно:** В CSV Базона НЕТ полей `Категория` и `Группа`.
Категории определяются keyword-matching по полю `Наименование` в функции `detectCategory()` в `server.js`.

### Порядок синхронизации

1. `syncFromBazon()` при старте + каждые 20 минут
2. Парсинг CSV → `carsMap` (доноры) + `newCatalog` (товары)
3. Товары без фото (`imageUrl === ''`) исключаются из каталога (78.3% товаров Базон не имеют фото)
4. Результат → in-memory `catalog[]`
5. Реальная статистика фото: у товаров с фото — от 2 до 25 штук (среднее ~4–6)

---

## Структура категорий (9 разделов)

Основаны на анализе реальных наименований товаров из Базон (6082 товаров).
**Не менять без перепроверки keyword map в `server.js`.**

| ID | Название | Ключевые слова (часть) |
|----|----------|------------------------|
| `mechanical-parts` | Механические запчасти | двигател, генератор, стартер, турбо, коробка, кпп, радиатор |
| `car-electronics` | Автоэлектроника | блок управления, датчик, модуль, проводка, kafas, mulf |
| `interior` | Интерьер | подушка безопасности, руль, консоль, сиден, дверн карт, коврик |
| `lights` | Освещение | фара, фонарь, противотуманн, поворотник, стоп-сигнал |
| `audio-systems` | Аудиосистемы | динамик, усилитель, аудио, радио, сабвуф, чейнджер |
| `body-parts` | Кузовные запчасти | крыло, дверь, капот, бампер, зеркало, решетка, порог, выхлоп |
| `navigation-entertainment` | Мультимедиа | дисплей, навигац, мультимедиа, джойстик, головное |
| `suspension` | Подвеска | амортизатор, рычаг, стабилизатор, ступиц, привод, редуктор |
| `brake-system` | Тормозная система | тормоз, суппорт, колодк, диск, abs, трубк |

**Подкатегории** — также keyword-matching, хранятся в поле `subCategory` продукта.
Эндпоинт `GET /api/groups?category=...` возвращает список уникальных подкатегорий.

---

## Приоритеты разработки (Этап 1)

### Блок A — Подкатегории (данные)
- `server.js`: добавить `subCategory` в объект продукта (keyword-matching по названию)
- `server.js`: новый эндпоинт `GET /api/groups?category=...`
- `src/data.ts`: добавить `subCategory?: string` в тип `CatalogProduct`

### Блок B — Поиск (ВЫСШИЙ ПРИОРИТЕТ)
- `src/App.tsx`: добавить `searchQuery` state, подключить `onChange` и `onKeyDown` к input
- `src/components/SearchDropdown.tsx`: live dropdown, макс 5 результатов, дебаунс 300мс
- `src/pages/SearchPage.tsx`: страница результатов с фильтрами (категория, модель, состояние, цена)
- Поиск работает **одновременно** по: OEM-номеру, артикулу, кросс-номерам, названию

### Блок C — Динамические подкатегории (UI)
- `src/hooks/useGroups.ts`: хук для загрузки подкатегорий через `/api/groups`
- `src/CategoryPage.tsx`: боковой фильтр по подкатегории

### Блок D — Кнопка «Заказать» (Phase 2)
- Корзина, OrderModal, POST /api/order — следующий этап
- Кнопки корзины и аккаунта **убраны** из шапки до Phase 2

---

## Правила кода

- Язык комментариев в коде: **русский**
- TypeScript строгий, никаких `any`
- Компоненты: только функциональные, никаких классов
- Стили: Tailwind utility-first, никакого CSS-in-JS
- Состояние: React hooks — Redux/Zustand не добавлять
- Роутинг: **только state-based** через `currentPage` и `onNavigate` в `App.tsx` — React Router не добавлять
- Новые страницы → `src/pages/`, переиспользуемые компоненты → `src/components/`
- **Нет корзины** (Phase 2), **нет панели администратора** (Phase 2)

---

## Архитектура файлов

```
new car/
├── server.js                    # Бекенд: Express, синхронизация с Базон, API
├── CLAUDE.md                    # Этот файл
├── .env.example                 # Шаблон переменных окружения
├── .claude/rules/               # Правила для AI-ассистента
│   ├── backend.md               # Правила server.js
│   ├── routing.md               # Роутинг state-based
│   ├── data-flow.md             # Поток данных Bazon → UI
│   ├── code-style.md            # TypeScript, именование
│   └── frontend/react.md        # Правила React
├── scripts/
│   ├── convert-csv.mjs          # Скачать CSV с Bazon → JSON
│   └── analyze-photos.mjs       # Анализ статистики фото
└── src/
    ├── App.tsx                  # Корневой компонент: роутинг, глобальный стейт
    ├── data.ts                  # Типы CatalogProduct + статические данные категорий
    ├── vite-env.d.ts            # Типы для PNG/JPG импортов
    ├── pages/
    │   ├── CategoryPage.tsx     # Каталог по категории с фильтрами
    │   ├── ProductPage.tsx      # Карточка товара + донор + галерея
    │   └── SearchPage.tsx       # ← создать: страница результатов поиска
    ├── components/
    │   ├── SearchDropdown.tsx   # ← создать: live dropdown поиска
    │   └── ProductCard.tsx      # ← создать: вынести из CategoryPage
    ├── hooks/
    │   ├── useProducts.ts       # Загрузка товаров через /api/products
    │   └── useGroups.ts         # ← создать: подкатегории через /api/groups
    └── generated/               # Авто-генерируемые файлы (npm run convert)
        ├── catalog.json         # Каталог для фронтенда
        ├── products.json        # Полные данные товаров
        └── cars.json            # Доноры
```

---

## API эндпоинты

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/products` | Список товаров. Параметры: `category`, `sort`, `limit`, `offset`, `q` |
| GET | `/api/products/:id` | Один товар |
| GET | `/api/groups?category=` | Подкатегории для раздела ← создать |
| GET | `/api/cars` | Список доноров |
| GET | `/api/status` | Статус синхронизации с Базон |
| POST | `/api/order` | Заявка на товар ← создать |

---

## Этап 2 (после запуска)

- Корзина + оформление заказа
- Панель администратора
- SEO: server-side rendering или pre-rendering
- Личный кабинет покупателя
